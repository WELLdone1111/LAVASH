use crate::workspace::{find_project_root, path_to_file_uri, read_lsp_message, workspace_root, write_lsp_message};
use std::collections::HashMap;
use std::io::{BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

static SESSION_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Clone)]
struct ServerSpec {
    program: PathBuf,
    args: Vec<String>,
    cwd: PathBuf,
}

struct LspSession {
    language: String,
    child: Child,
    stdin: Arc<Mutex<Box<dyn Write + Send>>>,
}

pub struct LspManager {
    sessions: Mutex<HashMap<String, LspSession>>,
}

impl LspManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn list_session_processes(&self) -> Vec<(String, u32)> {
        let Ok(sessions) = self.sessions.lock() else {
            return Vec::new();
        };
        sessions
            .iter()
            .map(|(_, session)| (session.language.clone(), session.child.id()))
            .collect()
    }
}

fn resolve_node_executable() -> PathBuf {
    if cfg!(windows) {
        PathBuf::from("node.exe")
    } else {
        PathBuf::from("node")
    }
}

fn npm_script_spec(project_root: &Path, script_rel: &str, extra_args: &[&str]) -> Option<ServerSpec> {
    let script = project_root.join(script_rel);
    if !script.is_file() {
        return None;
    }
    let mut args = vec![script.to_string_lossy().into_owned()];
    args.extend(extra_args.iter().map(|s| (*s).to_string()));
    Some(ServerSpec {
        program: resolve_node_executable(),
        args,
        cwd: project_root.to_path_buf(),
    })
}

fn path_command_spec(program: &str, args: &[&str], cwd: PathBuf) -> ServerSpec {
    ServerSpec {
        program: PathBuf::from(program),
        args: args.iter().map(|s| (*s).to_string()).collect(),
        cwd,
    }
}

fn resolve_server_spec(language: &str) -> Result<ServerSpec, String> {
    let project_root = find_project_root();
    let workspace = workspace_root().ok_or_else(|| "Could not resolve workspace".to_string())?;
    std::fs::create_dir_all(&workspace).map_err(|e| e.to_string())?;

    let key = language.to_ascii_lowercase();
    match key.as_str() {
        "typescript" | "javascript" | "tsx" | "jsx" => npm_script_spec(
            &project_root,
            "node_modules/typescript-language-server/lib/cli.js",
            &["--stdio"],
        )
        .or_else(|| {
            npm_script_spec(
                &project_root,
                "node_modules/typescript-language-server/lib/cli.mjs",
                &["--stdio"],
            )
        })
        .map(|mut spec| {
            spec.cwd = workspace.clone();
            spec
        })
        .ok_or_else(|| {
            "typescript-language-server not found. Run npm install in project root.".to_string()
        }),

        "html" => npm_script_spec(
            &project_root,
            "node_modules/vscode-langservers-extracted/bin/vscode-html-language-server",
            &["--stdio"],
        )
        .or_else(|| {
            npm_script_spec(
                &project_root,
                "node_modules/vscode-langservers-extracted/bin/vscode-html-language-server.js",
                &["--stdio"],
            )
        })
        .map(|mut spec| {
            spec.cwd = workspace.clone();
            spec
        })
        .ok_or_else(|| "vscode-html-language-server not found.".to_string()),

        "css" | "scss" | "less" => npm_script_spec(
            &project_root,
            "node_modules/vscode-langservers-extracted/bin/vscode-css-language-server",
            &["--stdio"],
        )
        .or_else(|| {
            npm_script_spec(
                &project_root,
                "node_modules/vscode-langservers-extracted/bin/vscode-css-language-server.js",
                &["--stdio"],
            )
        })
        .map(|mut spec| {
            spec.cwd = workspace.clone();
            spec
        })
        .ok_or_else(|| "vscode-css-language-server not found.".to_string()),

        "json" | "jsonc" => npm_script_spec(
            &project_root,
            "node_modules/vscode-langservers-extracted/bin/vscode-json-language-server",
            &["--stdio"],
        )
        .or_else(|| {
            npm_script_spec(
                &project_root,
                "node_modules/vscode-langservers-extracted/bin/vscode-json-language-server.js",
                &["--stdio"],
            )
        })
        .map(|mut spec| {
            spec.cwd = workspace.clone();
            spec
        })
        .ok_or_else(|| "vscode-json-language-server not found.".to_string()),

        "python" => {
            if let Some(pyright) = crate::python_runtime::resolve_pyright_langserver() {
                Ok(path_command_spec(
                    &pyright.to_string_lossy(),
                    &["--stdio"],
                    workspace,
                ))
            } else {
                Ok(path_command_spec("pyright-langserver", &["--stdio"], workspace))
            }
        }

        "rust" => Ok(path_command_spec("rust-analyzer", &[], workspace)),

        "go" => Ok(path_command_spec("gopls", &[], workspace)),

        "csharp" | "cs" => Ok(path_command_spec("OmniSharp", &["-lsp"], workspace)),

        "cpp" | "c" => Ok(path_command_spec("clangd", &[], workspace)),

        "java" => Ok(path_command_spec("jdtls", &[], workspace)),

        "php" => Ok(path_command_spec("intelephense", &["--stdio"], workspace)),

        "ruby" => Ok(path_command_spec("solargraph", &["stdio"], workspace)),

        _ => Err(format!("No LSP server configured for language: {language}")),
    }
}

fn spawn_session(
    app: AppHandle,
    session_id: String,
    language: String,
    spec: ServerSpec,
) -> Result<LspSession, String> {
    let mut child = Command::new(&spec.program)
        .args(&spec.args)
        .current_dir(&spec.cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| {
            format!(
                "Failed to spawn LSP {} ({}): {e}",
                language,
                spec.program.display()
            )
        })?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "LSP stdout unavailable".to_string())?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "LSP stdin unavailable".to_string())?;

    let stdin_writer: Arc<Mutex<Box<dyn Write + Send>>> = Arc::new(Mutex::new(Box::new(stdin)));

    let app_reader = app.clone();
    let session_for_reader = session_id.clone();
    thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        loop {
            match read_lsp_message(&mut reader) {
                Ok(message) => {
                    let event = format!("lsp://message/{session_for_reader}");
                    let _ = app_reader.emit(&event, message);
                }
                Err(_) => break,
            }
        }
        let _ = app_reader.emit(
            &format!("lsp://close/{session_for_reader}"),
            serde_json::json!({ "reason": "stdout_closed" }),
        );
    });

    Ok(LspSession {
        language,
        child,
        stdin: stdin_writer,
    })
}

#[tauri::command]
pub fn lsp_start(
    app: AppHandle,
    manager: State<'_, LspManager>,
    language: String,
) -> Result<serde_json::Value, String> {
    let key = language.to_ascii_lowercase();
    {
        let sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
        for (id, session) in sessions.iter() {
            if session.language == key {
                let workspace = workspace_root().ok_or_else(|| "No workspace".to_string())?;
                return Ok(serde_json::json!({
                    "sessionId": id,
                    "workspaceRoot": workspace.to_string_lossy(),
                    "workspaceUri": path_to_file_uri(&workspace),
                    "reused": true,
                }));
            }
        }
    }

    let spec = resolve_server_spec(&key)?;
    let session_id = format!("lsp-{}", SESSION_COUNTER.fetch_add(1, Ordering::Relaxed));
    let session = spawn_session(app, session_id.clone(), key.clone(), spec)?;

    manager
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .insert(session_id.clone(), session);

    let workspace = workspace_root().ok_or_else(|| "No workspace".to_string())?;
    Ok(serde_json::json!({
        "sessionId": session_id,
        "workspaceRoot": workspace.to_string_lossy(),
        "workspaceUri": path_to_file_uri(&workspace),
        "reused": false,
    }))
}

#[tauri::command]
pub fn lsp_send(
    manager: State<'_, LspManager>,
    session_id: String,
    message: String,
) -> Result<(), String> {
    let sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get(&session_id)
        .ok_or_else(|| format!("Unknown LSP session: {session_id}"))?;
    let mut stdin = session.stdin.lock().map_err(|e| e.to_string())?;
    write_lsp_message(&mut *stdin, &message).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn lsp_stop(manager: State<'_, LspManager>, session_id: String) -> Result<(), String> {
    let mut sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(mut session) = sessions.remove(&session_id) {
        let _ = session.child.kill();
    }
    Ok(())
}
