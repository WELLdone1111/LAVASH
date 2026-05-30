use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::workspace;

#[derive(Debug, Serialize, Clone)]
pub struct TerminalProbeResult {
    pub available: bool,
    pub shell: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputPayload {
    pub session_id: String,
    pub data: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExitPayload {
    pub session_id: String,
}

struct TerminalSession {
    writer: Box<dyn Write + Send>,
    stop: Arc<AtomicBool>,
    /// PTY master + child must stay alive or Windows closes the pipe (os error 232).
    _master: Box<dyn MasterPty + Send>,
    _child: Box<dyn Child + Send + Sync>,
}

pub struct TerminalManager {
    sessions: Mutex<HashMap<String, TerminalSession>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

#[cfg(windows)]
fn shell_name() -> &'static str {
    "PowerShell"
}

#[cfg(not(windows))]
fn shell_name() -> &'static str {
    "sh"
}

#[cfg(windows)]
fn probe_shell() -> bool {
    std::process::Command::new("powershell.exe")
        .args(["-NoLogo", "-Command", "exit 0"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(not(windows))]
fn probe_shell() -> bool {
    std::process::Command::new("sh")
        .arg("-c")
        .arg("exit 0")
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn build_shell_command(cwd: &Path) -> CommandBuilder {
    let mut cmd = CommandBuilder::new("powershell.exe");
    cmd.args(["-NoLogo", "-NoExit"]);
    cmd.cwd(cwd);
    cmd
}

#[cfg(not(windows))]
fn build_shell_command(cwd: &Path) -> CommandBuilder {
    let mut cmd = CommandBuilder::new("sh");
    cmd.args(["-i"]);
    cmd.cwd(cwd);
    cmd
}

fn resolve_terminal_cwd(cwd: Option<String>) -> Result<PathBuf, String> {
    if let Some(raw) = cwd {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return workspace::ensure_workspace_root();
        }
        let path = PathBuf::from(trimmed);
        if !path.is_dir() {
            return Err("Working directory does not exist".to_string());
        }
        return path.canonicalize().map_err(|e| e.to_string());
    }
    workspace::ensure_workspace_root()
}

fn is_broken_pipe(err: &std::io::Error) -> bool {
    matches!(
        err.kind(),
        std::io::ErrorKind::BrokenPipe | std::io::ErrorKind::UnexpectedEof
    ) || err.raw_os_error() == Some(232)
}

fn spawn_reader(app: AppHandle, session_id: String, mut reader: Box<dyn Read + Send>, stop: Arc<AtomicBool>) {
    thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            if stop.load(Ordering::Relaxed) {
                break;
            }
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app.emit(
                        "terminal-output",
                        TerminalOutputPayload {
                            session_id: session_id.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = app.emit(
            "terminal-exit",
            TerminalExitPayload {
                session_id: session_id.clone(),
            },
        );
    });
}

#[tauri::command]
pub fn terminal_probe() -> TerminalProbeResult {
    TerminalProbeResult {
        available: probe_shell(),
        shell: shell_name().to_string(),
    }
}

#[tauri::command]
pub fn terminal_spawn(
    app: AppHandle,
    manager: State<'_, TerminalManager>,
    cwd: Option<String>,
) -> Result<String, String> {
    if !probe_shell() {
        return Err(format!("{} is not installed or not on PATH", shell_name()));
    }

    let cwd = resolve_terminal_cwd(cwd)?;
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 30,
            cols: 100,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {e}"))?;

    let cmd = build_shell_command(&cwd);
    let master = pair.master;
    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to start {}: {e}", shell_name()))?;

    let reader = master
        .try_clone_reader()
        .map_err(|e| format!("Failed to read terminal: {e}"))?;
    let writer = master
        .take_writer()
        .map_err(|e| format!("Failed to write terminal: {e}"))?;

    let session_id = Uuid::new_v4().to_string();
    let stop = Arc::new(AtomicBool::new(false));
    spawn_reader(app, session_id.clone(), reader, stop.clone());

    let session = TerminalSession {
        writer,
        stop,
        _master: master,
        _child: child,
    };
    manager
        .sessions
        .lock()
        .map_err(|_| "Terminal session lock poisoned".to_string())?
        .insert(session_id.clone(), session);

    Ok(session_id)
}

#[tauri::command]
pub fn terminal_write(
    manager: State<'_, TerminalManager>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let mut guard = manager
        .sessions
        .lock()
        .map_err(|_| "Terminal session lock poisoned".to_string())?;
    let session = guard
        .get_mut(&session_id)
        .ok_or_else(|| "Terminal session not found".to_string())?;
    if let Err(e) = session.writer.write_all(data.as_bytes()) {
        if is_broken_pipe(&e) {
            session.stop.store(true, Ordering::Relaxed);
            guard.remove(&session_id);
            return Err("Terminal session closed".to_string());
        }
        return Err(format!("Failed to write to terminal: {e}"));
    }
    if let Err(e) = session.writer.flush() {
        if is_broken_pipe(&e) {
            session.stop.store(true, Ordering::Relaxed);
            guard.remove(&session_id);
            return Err("Terminal session closed".to_string());
        }
        return Err(format!("Failed to flush terminal: {e}"));
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_resize(
    manager: State<'_, TerminalManager>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let guard = manager
        .sessions
        .lock()
        .map_err(|_| "Terminal session lock poisoned".to_string())?;
    let session = guard
        .get(&session_id)
        .ok_or_else(|| "Terminal session not found".to_string())?;
    session
        ._master
        .resize(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize terminal: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn terminal_kill(manager: State<'_, TerminalManager>, session_id: String) -> Result<(), String> {
    let mut guard = manager
        .sessions
        .lock()
        .map_err(|_| "Terminal session lock poisoned".to_string())?;
    if let Some(session) = guard.remove(&session_id) {
        session.stop.store(true, Ordering::Relaxed);
    }
    Ok(())
}
