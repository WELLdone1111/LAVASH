use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use serde::Serialize;

static PROJECT_ROOT: Mutex<Option<PathBuf>> = Mutex::new(None);

const SKIP_DIR_NAMES: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".turbo",
    ".cache",
    "src-tauri",
];

#[derive(Serialize, Clone)]
pub struct WorkspaceFileMetadata {
    pub modified_ms: u64,
    pub size: u64,
}

fn file_metadata(path: &Path) -> Result<WorkspaceFileMetadata, String> {
    let meta = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let modified_ms = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    Ok(WorkspaceFileMetadata {
        modified_ms,
        size: meta.len(),
    })
}

#[derive(Serialize, Clone)]
pub struct WorkspaceTreeNode {
    pub path: String,
    pub name: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<WorkspaceTreeNode>>,
}

fn project_root_config_path() -> Option<PathBuf> {
    lavash_app_data_root().map(|root| root.join("project-root.txt"))
}

fn load_persisted_project_root() -> Option<PathBuf> {
    let path = project_root_config_path()?;
    let text = std::fs::read_to_string(&path).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }
    let candidate = PathBuf::from(trimmed);
    if candidate.is_dir() {
        Some(candidate)
    } else {
        None
    }
}

fn save_persisted_project_root(root: Option<&Path>) {
    let Some(config_path) = project_root_config_path() else {
        return;
    };
    if let Some(parent) = config_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    match root {
        Some(path) => {
            let _ = std::fs::write(&config_path, path.to_string_lossy().as_bytes());
        }
        None => {
            let _ = std::fs::remove_file(config_path);
        }
    }
}

fn project_root_locked() -> Option<PathBuf> {
    let guard = PROJECT_ROOT.lock().ok()?;
    if let Some(root) = guard.as_ref() {
        return Some(root.clone());
    }
    drop(guard);
    let persisted = load_persisted_project_root()?;
    if let Ok(mut guard) = PROJECT_ROOT.lock() {
        *guard = Some(persisted.clone());
    }
    Some(persisted)
}

fn is_using_project_root() -> bool {
    project_root_locked().is_some()
}

fn active_workspace_root() -> Result<PathBuf, String> {
    if let Some(project) = project_root_locked() {
        return Ok(project);
    }
    workspace_root()
        .ok_or_else(|| "Could not resolve app data directory".to_string())
        .and_then(|root| {
            std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
            Ok(root)
        })
}

fn should_skip_dir(name: &str) -> bool {
    if name.is_empty() {
        return true;
    }
    if name == "." || name == ".." {
        return true;
    }
    if SKIP_DIR_NAMES.iter().any(|s| *s == name) {
        return true;
    }
    false
}

fn rel_path_posix(path: &Path, root: &Path) -> Option<String> {
    let rel = path.strip_prefix(root).ok()?;
    let parts: Vec<String> = rel
        .components()
        .map(|c| c.as_os_str().to_string_lossy().into_owned())
        .collect();
    if parts.is_empty() {
        return Some(String::new());
    }
    Some(parts.join("/"))
}

fn build_tree(
    dir: &Path,
    root: &Path,
    depth: usize,
    budget: &mut usize,
) -> Result<Vec<WorkspaceTreeNode>, String> {
    if depth > 8 || *budget == 0 {
        return Ok(Vec::new());
    }
    let mut entries: Vec<_> = std::fs::read_dir(dir).map_err(|e| e.to_string())?.flatten().collect();
    entries.sort_by_key(|e| {
        let is_dir = e.path().is_dir();
        let name = e.file_name().to_string_lossy().to_lowercase();
        (!is_dir, name)
    });

    let mut nodes = Vec::new();
    for entry in entries {
        if *budget == 0 {
            break;
        }
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if should_skip_dir(&name) {
            continue;
        }
        let rel = rel_path_posix(&path, root).unwrap_or_else(|| name.clone());
        if path.is_dir() {
            let children = build_tree(&path, root, depth + 1, budget)?;
            *budget = budget.saturating_sub(1);
            nodes.push(WorkspaceTreeNode {
                path: rel,
                name,
                kind: "dir".to_string(),
                children: if children.is_empty() {
                    None
                } else {
                    Some(children)
                },
            });
        } else if path.is_file() {
            *budget = budget.saturating_sub(1);
            nodes.push(WorkspaceTreeNode {
                path: rel,
                name,
                kind: "file".to_string(),
                children: None,
            });
        }
    }
    Ok(nodes)
}

pub fn lavash_app_data_root() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        let base = std::env::var_os("LOCALAPPDATA")?;
        return Some(PathBuf::from(base).join("lavash"));
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var_os("HOME")?;
        return Some(
            PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("lavash"),
        );
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let home = std::env::var_os("HOME")?;
        let data_home = std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(home).join(".local").join("share"));
        Some(data_home.join("lavash"))
    }
}

pub fn workspace_root() -> Option<PathBuf> {
    lavash_app_data_root().map(|root| root.join("workspace"))
}

pub fn ensure_workspace_root() -> Result<PathBuf, String> {
    active_workspace_root()
}

pub fn sanitize_relative_path(relative: &str) -> Result<PathBuf, String> {
    let trimmed = relative.trim().replace('\\', "/");
    if trimmed.is_empty() {
        return Err("Empty path".to_string());
    }
    if trimmed.starts_with('/') || trimmed.contains("..") {
        return Err("Invalid workspace path".to_string());
    }
    Ok(PathBuf::from(trimmed))
}

pub fn resolve_workspace_file(relative: &str) -> Result<PathBuf, String> {
    let root = ensure_workspace_root()?;
    let rel = sanitize_relative_path(relative)?;
    Ok(root.join(rel))
}

pub fn write_workspace_file(relative: &str, contents: &str) -> Result<(), String> {
    let path = resolve_workspace_file(relative)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

pub fn read_workspace_file(relative: &str) -> Result<String, String> {
    let path = resolve_workspace_file(relative)?;
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

pub fn init_tsconfig() -> Result<(), String> {
    let root = ensure_workspace_root()?;
    let path = root.join("tsconfig.json");
    if path.exists() {
        return Ok(());
    }
    let contents = r#"{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "allowJs": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  },
  "include": ["./**/*"]
}
"#;
    std::fs::write(path, contents).map_err(|e| e.to_string())
}

pub fn init_package_json() -> Result<(), String> {
    let root = ensure_workspace_root()?;
    let path = root.join("package.json");
    if path.exists() {
        return Ok(());
    }
    let contents = r#"{
  "name": "lavash-workspace",
  "private": true,
  "type": "module"
}
"#;
    std::fs::write(path, contents).map_err(|e| e.to_string())
}

pub fn path_to_file_uri(path: &Path) -> String {
    let normalized = path.to_string_lossy().replace('\\', "/");
    if normalized.starts_with("//") {
        return format!("file:{normalized}");
    }
    if normalized.len() >= 2 && normalized.as_bytes()[1] == b':' {
        return format!("file:///{}", normalized);
    }
    format!("file://{normalized}")
}

pub fn find_project_root() -> PathBuf {
    if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
        let src_tauri = PathBuf::from(manifest);
        if src_tauri.file_name().and_then(|n| n.to_str()) == Some("src-tauri") {
            if let Some(parent) = src_tauri.parent() {
                return parent.to_path_buf();
            }
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

pub fn read_lsp_message<R: Read>(reader: &mut R) -> io::Result<String> {
    let mut content_length: Option<usize> = None;
    let mut header_buf = String::new();
    let mut byte = [0u8; 1];

    loop {
        header_buf.clear();
        loop {
            reader.read_exact(&mut byte)?;
            let ch = byte[0] as char;
            header_buf.push(ch);
            if header_buf.ends_with("\n") {
                break;
            }
            if header_buf.len() > 8192 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "LSP header too large",
                ));
            }
        }

        let line = header_buf.trim_end_matches(['\r', '\n']);
        if line.is_empty() {
            break;
        }
        if let Some(rest) = line.strip_prefix("Content-Length:") {
            content_length = rest.trim().parse().ok();
        }
    }

    let len = content_length.ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidData, "Missing Content-Length header")
    })?;

    let mut body = vec![0u8; len];
    reader.read_exact(&mut body)?;
    String::from_utf8(body).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

pub fn write_lsp_message<W: Write>(writer: &mut W, json: &str) -> io::Result<()> {
    let header = format!("Content-Length: {}\r\n\r\n", json.len());
    writer.write_all(header.as_bytes())?;
    writer.write_all(json.as_bytes())?;
    writer.flush()?;
    Ok(())
}

#[tauri::command]
pub fn workspace_get_root() -> Result<String, String> {
    let root = ensure_workspace_root()?;
    Ok(root.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn workspace_write_file(relative_path: String, contents: String) -> Result<(), String> {
    write_workspace_file(&relative_path, &contents)
}

#[tauri::command]
pub fn workspace_read_file(relative_path: String) -> Result<String, String> {
    read_workspace_file(&relative_path)
}

#[tauri::command]
pub fn workspace_init() -> Result<String, String> {
    let root = ensure_workspace_root()?;
    if !is_using_project_root() {
        init_tsconfig()?;
        init_package_json()?;
    }
    Ok(root.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn workspace_get_project_root() -> Result<Option<String>, String> {
    Ok(project_root_locked().map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn workspace_set_project_root(path: String) -> Result<String, String> {
    let candidate = PathBuf::from(path.trim());
    if !candidate.is_dir() {
        return Err("Not a directory".to_string());
    }
    let canonical = candidate
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if let Ok(mut guard) = PROJECT_ROOT.lock() {
        *guard = Some(canonical.clone());
    }
    save_persisted_project_root(Some(&canonical));
    Ok(canonical.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn workspace_clear_project_root() -> Result<(), String> {
    if let Ok(mut guard) = PROJECT_ROOT.lock() {
        *guard = None;
    }
    save_persisted_project_root(None);
    Ok(())
}

#[tauri::command]
pub fn workspace_list_tree() -> Result<Vec<WorkspaceTreeNode>, String> {
    let root = project_root_locked().ok_or_else(|| "No project folder open".to_string())?;
    let mut budget = 2500usize;
    build_tree(&root, &root, 0, &mut budget)
}

#[tauri::command]
pub fn workspace_file_uri(relative_path: String) -> Result<String, String> {
    let path = resolve_workspace_file(&relative_path)?;
    Ok(path_to_file_uri(&path))
}

#[tauri::command]
pub fn workspace_resolve_file(relative_path: String) -> Result<String, String> {
    let path = resolve_workspace_file(&relative_path)?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn workspace_file_metadata(relative_path: String) -> Result<WorkspaceFileMetadata, String> {
    let path = resolve_workspace_file(&relative_path)?;
    file_metadata(&path)
}

#[tauri::command]
pub fn workspace_create_dir(relative_path: String) -> Result<(), String> {
    let path = resolve_workspace_file(&relative_path)?;
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workspace_rename_entry(relative_path: String, new_name: String) -> Result<(), String> {
    let trimmed_name = new_name.trim();
    if trimmed_name.is_empty() || trimmed_name.contains('/') || trimmed_name.contains('\\') || trimmed_name.contains("..") {
        return Err("Invalid entry name".to_string());
    }
    let old_path = resolve_workspace_file(&relative_path)?;
    let parent = old_path
        .parent()
        .ok_or_else(|| "Cannot rename workspace root".to_string())?;
    let new_path = parent.join(trimmed_name);
    std::fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workspace_delete_entry(relative_path: String, is_dir: bool) -> Result<(), String> {
    let path = resolve_workspace_file(&relative_path)?;
    if is_dir {
        std::fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn fs_read_text(absolute_path: String) -> Result<String, String> {
    let path = PathBuf::from(absolute_path.trim());
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    if !canonical.is_file() {
        return Err("Not a file".to_string());
    }
    std::fs::read_to_string(&canonical).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_write_text(absolute_path: String, contents: String) -> Result<(), String> {
    let path = PathBuf::from(absolute_path.trim());
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_metadata(absolute_path: String) -> Result<WorkspaceFileMetadata, String> {
    let path = PathBuf::from(absolute_path.trim());
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    file_metadata(&canonical)
}
