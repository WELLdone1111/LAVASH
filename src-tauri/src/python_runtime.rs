use std::fs::{self, File};
use std::io::copy;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use zip::ZipArchive;

use crate::workspace::{find_project_root, lavash_app_data_root};

/// Managed Python minor series installed by LAVASH (see `.python-version`).
pub const PYTHON_CHANNEL: &str = "3.13";

/// Fallback uv release when GitHub API is unavailable.
const UV_FALLBACK_VERSION: &str = "0.7.13";

const MANIFEST_FILE: &str = "runtime-manifest.json";
const AUTO_UPDATE_INTERVAL: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PythonRuntimeManifest {
    #[serde(default)]
    pub uv_version: Option<String>,
    #[serde(default)]
    pub python_version: Option<String>,
    #[serde(default)]
    pub last_update_check_ms: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PythonProbeResult {
    pub available: bool,
    pub python_version: Option<String>,
    pub python_path: Option<String>,
    pub uv_version: Option<String>,
    pub update_available: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PythonEnsureResult {
    pub python_path: String,
    pub python_version: String,
    pub uv_version: String,
    pub pyright_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
}

pub fn python_tools_root() -> Option<PathBuf> {
    lavash_app_data_root().map(|root| root.join("tools"))
}

pub fn uv_install_dir() -> Option<PathBuf> {
    python_tools_root().map(|root| root.join("uv"))
}

pub fn uv_executable() -> Option<PathBuf> {
    let dir = uv_install_dir()?;
    #[cfg(windows)]
    {
        Some(dir.join("uv.exe"))
    }
    #[cfg(not(windows))]
    {
        Some(dir.join("uv"))
    }
}

pub fn python_home() -> Option<PathBuf> {
    lavash_app_data_root().map(|root| root.join("python"))
}

pub fn python_venv_dir() -> Option<PathBuf> {
    python_home().map(|root| root.join("venv"))
}

fn manifest_path() -> Option<PathBuf> {
    python_home().map(|root| root.join(MANIFEST_FILE))
}

fn read_manifest() -> PythonRuntimeManifest {
    let Some(path) = manifest_path() else {
        return PythonRuntimeManifest::default();
    };
    fs::read_to_string(&path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn write_manifest(manifest: &PythonRuntimeManifest) -> Result<(), String> {
    let Some(root) = python_home() else {
        return Err("Python home unavailable".to_string());
    };
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let path = root.join(MANIFEST_FILE);
    let json = serde_json::to_string_pretty(manifest).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn trim_version(tag: &str) -> String {
    tag.trim_start_matches('v').trim().to_string()
}

fn uv_asset_name() -> Result<&'static str, String> {
    #[cfg(all(windows, target_arch = "x86_64"))]
    {
        return Ok("uv-x86_64-pc-windows-msvc.zip");
    }
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        return Ok("uv-aarch64-apple-darwin.tar.gz");
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        return Ok("uv-x86_64-apple-darwin.tar.gz");
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        return Ok("uv-x86_64-unknown-linux-gnu.tar.gz");
    }
    #[cfg(not(any(
        all(windows, target_arch = "x86_64"),
        all(target_os = "macos", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "x86_64"),
    )))]
    {
        Err("Unsupported platform for managed uv".to_string())
    }
}

fn fetch_latest_uv_version() -> String {
    let client = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
    {
        Ok(client) => client,
        Err(_) => return UV_FALLBACK_VERSION.to_string(),
    };
    client
        .get("https://api.github.com/repos/astral-sh/uv/releases/latest")
        .header("User-Agent", "LAVASH-IDE")
        .send()
        .ok()
        .and_then(|response| response.json::<GitHubRelease>().ok())
        .map(|release| trim_version(&release.tag_name))
        .filter(|version| !version.is_empty())
        .unwrap_or_else(|| UV_FALLBACK_VERSION.to_string())
}

fn uv_download_url(version: &str) -> Result<String, String> {
    let asset = uv_asset_name()?;
    Ok(format!(
        "https://github.com/astral-sh/uv/releases/download/{version}/{asset}",
        version = if version.starts_with('v') {
            version.to_string()
        } else {
            format!("v{version}")
        }
    ))
}

fn extract_zip(archive_path: &Path, dest_dir: &Path) -> Result<(), String> {
    let file = File::open(archive_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let Some(name) = entry.enclosed_name().map(|path| path.to_owned()) else {
            continue;
        };
        let out_path = dest_dir.join(&name);
        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out = File::create(&out_path).map_err(|e| e.to_string())?;
            copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if name.ends_with("uv") {
                    let mut perms = fs::metadata(&out_path)
                        .map_err(|e| e.to_string())?
                        .permissions();
                    perms.set_mode(0o755);
                    fs::set_permissions(&out_path, perms).map_err(|e| e.to_string())?;
                }
            }
        }
    }
    Ok(())
}

fn extract_tar_gz(archive_path: &Path, dest_dir: &Path) -> Result<(), String> {
    let file = File::open(archive_path).map_err(|e| e.to_string())?;
    let decoder = GzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;
    archive.unpack(dest_dir).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        if let Some(uv_path) = uv_executable() {
            if uv_path.is_file() {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = fs::metadata(&uv_path).map_err(|e| e.to_string())?.permissions();
                perms.set_mode(0o755);
                fs::set_permissions(&uv_path, perms).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

fn download_uv(version: &str) -> Result<(), String> {
    let url = uv_download_url(version)?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let bytes = client
        .get(&url)
        .header("User-Agent", "LAVASH-IDE")
        .send()
        .map_err(|e| format!("Failed to download uv: {e}"))?
        .bytes()
        .map_err(|e| format!("Failed to read uv download: {e}"))?;

    let install_dir = uv_install_dir().ok_or_else(|| "uv install dir unavailable".to_string())?;
    fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;
    let archive_path = install_dir.join("uv-download.archive");
    fs::write(&archive_path, bytes).map_err(|e| e.to_string())?;

    if url.ends_with(".zip") {
        extract_zip(&archive_path, &install_dir)?;
    } else {
        extract_tar_gz(&archive_path, &install_dir)?;
    }
    let _ = fs::remove_file(&archive_path);
    Ok(())
}

fn uv_command_env() -> Vec<(String, String)> {
    let mut env = Vec::new();
    if let Some(root) = python_home() {
        env.push(("UV_PYTHON_INSTALL_DIR".to_string(), root.display().to_string()));
    }
    if let Some(venv) = python_venv_dir() {
        env.push(("UV_PROJECT_ENVIRONMENT".to_string(), venv.display().to_string()));
    }
    if let Some(tools) = python_tools_root() {
        env.push((
            "UV_TOOL_DIR".to_string(),
            tools.join("uv-tools").display().to_string(),
        ));
    }
    env
}

fn run_uv_in(project_root: Option<&Path>, args: &[&str]) -> Result<Output, String> {
    let uv = uv_executable().ok_or_else(|| "uv is not installed".to_string())?;
    if !uv.is_file() {
        return Err("uv executable missing".to_string());
    }
    let mut command = Command::new(&uv);
    command.args(args).stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(root) = project_root {
        command.current_dir(root);
    }
    for (key, value) in uv_command_env() {
        command.env(key, value);
    }
    command.output().map_err(|e| format!("Failed to run uv: {e}"))
}

fn run_uv(args: &[&str]) -> Result<Output, String> {
    run_uv_in(None, args)
}

fn output_ok(output: &Output) -> bool {
    output.status.success()
}

fn output_text(output: &Output) -> String {
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    format!("{stdout}{stderr}").trim().to_string()
}

fn ensure_uv(force_download: bool) -> Result<String, String> {
    let uv = uv_executable().ok_or_else(|| "uv path unavailable".to_string())?;
    if !force_download && uv.is_file() {
        if let Ok(output) = run_uv(&["--version"]) {
            if output_ok(&output) {
                let version = output_text(&output)
                    .split_whitespace()
                    .nth(1)
                    .unwrap_or("unknown")
                    .to_string();
                return Ok(version);
            }
        }
    }

    let version = fetch_latest_uv_version();
    download_uv(&version)?;
    let output = run_uv(&["--version"]).map_err(|e| e.to_string())?;
    if !output_ok(&output) {
        return Err(format!("uv failed after install: {}", output_text(&output)));
    }
    Ok(output_text(&output)
        .split_whitespace()
        .nth(1)
        .unwrap_or(version.as_str())
        .to_string())
}

fn ensure_python_interpreter() -> Result<PathBuf, String> {
    let install = run_uv(&["python", "install", PYTHON_CHANNEL])?;
    if !output_ok(&install) {
        return Err(format!(
            "Failed to install Python {PYTHON_CHANNEL}: {}",
            output_text(&install)
        ));
    }
    let find = run_uv(&["python", "find", PYTHON_CHANNEL])?;
    if !output_ok(&find) {
        return Err(format!(
            "Failed to locate Python {PYTHON_CHANNEL}: {}",
            output_text(&find)
        ));
    }
    let path = output_text(&find);
    if path.is_empty() {
        return Err(format!("Python {PYTHON_CHANNEL} path is empty"));
    }
    Ok(PathBuf::from(path))
}

fn sync_project_python_deps() -> Result<(), String> {
    let project_root = find_project_root();
    if !project_root.join("pyproject.toml").is_file() {
        return Ok(());
    }
    let sync = run_uv_in(
        Some(&project_root),
        &["sync", "--group", "dev", "--python", PYTHON_CHANNEL],
    )?;
    if !output_ok(&sync) {
        return Err(format!("uv sync failed: {}", output_text(&sync)));
    }
    Ok(())
}

fn python_version_from_path(python: &Path) -> Option<String> {
    let output = Command::new(python)
        .arg("--version")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    Some(output_text(&output))
}

pub fn resolve_pyright_langserver() -> Option<PathBuf> {
    if let Some(venv) = python_venv_dir() {
        #[cfg(windows)]
        {
            let candidate = venv.join("Scripts").join("pyright-langserver.exe");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
        #[cfg(not(windows))]
        {
            let candidate = venv.join("bin").join("pyright-langserver");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    which_in_path("pyright-langserver")
}

fn which_in_path(program: &str) -> Option<PathBuf> {
    let output = Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg(program)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = output_text(&output);
    let line = text.lines().next()?.trim();
    if line.is_empty() {
        return None;
    }
    Some(PathBuf::from(line))
}

pub fn probe_python_runtime() -> PythonProbeResult {
    let uv_version = uv_executable()
        .filter(|path| path.is_file())
        .and_then(|_| run_uv(&["--version"]).ok())
        .filter(|output| output_ok(output))
        .map(|output| output_text(&output));

    let python_path = run_uv(&["python", "find", PYTHON_CHANNEL])
        .ok()
        .filter(|output| output_ok(output))
        .map(|output| output_text(&output))
        .filter(|path| !path.is_empty());

    let python_version = python_path
        .as_ref()
        .and_then(|path| python_version_from_path(Path::new(path)));

    let latest_uv = fetch_latest_uv_version();
    let update_available = uv_version.as_ref().is_some_and(|installed| {
        let installed_version = installed
            .split_whitespace()
            .nth(1)
            .unwrap_or(installed.as_str());
        installed_version != latest_uv
    });

    PythonProbeResult {
        available: python_path.is_some(),
        python_version,
        python_path,
        uv_version,
        update_available,
    }
}

pub fn ensure_python_runtime() -> Result<PythonEnsureResult, String> {
    if let Some(root) = python_home() {
        fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    }
    if let Some(venv) = python_venv_dir() {
        fs::create_dir_all(&venv).map_err(|e| e.to_string())?;
    }

    let uv_version = ensure_uv(false)?;
    let python_path = ensure_python_interpreter()?;
    sync_project_python_deps()?;
    let python_version =
        python_version_from_path(&python_path).unwrap_or_else(|| PYTHON_CHANNEL.to_string());
    let pyright_path = resolve_pyright_langserver().map(|path| path.display().to_string());

    let mut manifest = read_manifest();
    manifest.uv_version = Some(uv_version.clone());
    manifest.python_version = Some(python_version.clone());
    manifest.last_update_check_ms = now_ms();
    write_manifest(&manifest)?;

    Ok(PythonEnsureResult {
        python_path: python_path.display().to_string(),
        python_version,
        uv_version,
        pyright_path,
    })
}

pub fn update_python_runtime() -> Result<PythonEnsureResult, String> {
    ensure_uv(false)?;
    let self_update = run_uv(&["self", "update"])?;
    if !output_ok(&self_update) {
        let latest = fetch_latest_uv_version();
        download_uv(&latest)?;
    }
    let upgrade = run_uv(&["python", "upgrade", PYTHON_CHANNEL])?;
    if !output_ok(&upgrade) {
        let _ = ensure_python_interpreter();
    }
    let project_root = find_project_root();
    if project_root.join("pyproject.toml").is_file() {
        let sync = run_uv_in(
            Some(&project_root),
            &["sync", "--group", "dev", "--upgrade", "--python", PYTHON_CHANNEL],
        )?;
        if !output_ok(&sync) {
            return Err(format!("uv sync --upgrade failed: {}", output_text(&sync)));
        }
    }
    ensure_python_runtime()
}

pub fn auto_update_python_runtime_if_due() {
    let manifest = read_manifest();
    let due = manifest.last_update_check_ms == 0
        || now_ms().saturating_sub(manifest.last_update_check_ms) >= AUTO_UPDATE_INTERVAL.as_millis() as u64;
    if !due {
        return;
    }
    let result = if uv_executable().is_some_and(|path| path.is_file()) {
        update_python_runtime()
    } else {
        ensure_python_runtime()
    };
    if let Err(error) = result {
        eprintln!("[python-runtime] auto-update skipped: {error}");
    }
}

#[tauri::command]
pub fn python_probe() -> PythonProbeResult {
    probe_python_runtime()
}

#[tauri::command]
pub fn python_ensure() -> Result<PythonEnsureResult, String> {
    ensure_python_runtime()
}

#[tauri::command]
pub fn python_update() -> Result<PythonEnsureResult, String> {
    update_python_runtime()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trim_version_strips_v_prefix() {
        assert_eq!(trim_version("v0.7.13"), "0.7.13");
        assert_eq!(trim_version("0.7.13"), "0.7.13");
    }

    #[test]
    fn uv_download_url_uses_tag_prefix() {
        let url = uv_download_url("0.7.13").expect("asset");
        assert!(url.contains("/download/v0.7.13/"));
    }

    #[test]
    fn manifest_roundtrip_defaults() {
        let manifest = PythonRuntimeManifest::default();
        let json = serde_json::to_string(&manifest).expect("json");
        let parsed: PythonRuntimeManifest = serde_json::from_str(&json).expect("parse");
        assert_eq!(parsed.last_update_check_ms, 0);
    }
}
