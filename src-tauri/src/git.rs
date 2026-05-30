use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;

use crate::workspace;

#[derive(Debug, Serialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitProbeResult {
    pub available: bool,
    pub version: Option<String>,
}

fn git_command() -> Command {
    Command::new("git")
}

pub fn probe_git() -> GitProbeResult {
    match git_command().arg("--version").output() {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout)
                .trim()
                .to_string();
            GitProbeResult {
                available: true,
                version: if version.is_empty() {
                    None
                } else {
                    Some(version)
                },
            }
        }
        _ => GitProbeResult {
            available: false,
            version: None,
        },
    }
}

fn git_repo_root(cwd: &Path) -> Result<PathBuf, String> {
    let output = git_command()
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if detail.is_empty() {
            "Not a git repository".to_string()
        } else {
            detail
        });
    }
    let root = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if root.is_empty() {
        return Err("Not a git repository".to_string());
    }
    Ok(PathBuf::from(root))
}

fn run_git_in_repo(args: &[&str], cwd: &Path) -> Result<String, String> {
    let allowed = matches!(
        args.first().copied(),
        Some("status") | Some("diff") | Some("rev-parse")
    );
    if !allowed {
        return Err("Unsupported git command".to_string());
    }

    let output = git_command()
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;

    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).into_owned());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Err(if stderr.is_empty() {
        format!("git {} failed", args.first().copied().unwrap_or(""))
    } else {
        stderr
    })
}

pub fn sanitize_git_relative_path(relative: &str) -> Result<String, String> {
    workspace::sanitize_relative_path(relative).map(|p| p.to_string_lossy().into_owned())
}

fn workspace_cwd() -> Result<PathBuf, String> {
    workspace::ensure_workspace_root()
}

pub fn parse_porcelain_status(raw: &str) -> Vec<GitFileStatus> {
    raw.lines()
        .filter_map(|line| {
            let line = line.trim_end();
            if line.len() < 4 {
                return None;
            }
            let status = line[..2].trim().to_string();
            let path = line[3..].trim().to_string();
            if path.is_empty() {
                return None;
            }
            Some(GitFileStatus { path, status })
        })
        .collect()
}

#[tauri::command]
pub fn git_probe() -> GitProbeResult {
    probe_git()
}

#[tauri::command]
pub fn git_is_repo() -> Result<bool, String> {
    if !probe_git().available {
        return Ok(false);
    }
    let cwd = workspace_cwd()?;
    Ok(git_repo_root(&cwd).is_ok())
}

#[tauri::command]
pub fn git_status() -> Result<Vec<GitFileStatus>, String> {
    if !probe_git().available {
        return Err("Git is not installed or not on PATH".to_string());
    }
    let cwd = workspace_cwd()?;
    git_repo_root(&cwd)?;
    let raw = run_git_in_repo(&["status", "--porcelain=v1"], &cwd)?;
    Ok(parse_porcelain_status(&raw))
}

#[tauri::command]
pub fn git_diff(relative_path: String) -> Result<String, String> {
    if !probe_git().available {
        return Err("Git is not installed or not on PATH".to_string());
    }
    let rel = sanitize_git_relative_path(&relative_path)?;
    let cwd = workspace_cwd()?;
    git_repo_root(&cwd)?;
    run_git_in_repo(&["diff", "--", &rel], &cwd)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_path_traversal() {
        assert!(sanitize_git_relative_path("../secret").is_err());
        assert!(sanitize_git_relative_path("foo/../../etc/passwd").is_err());
    }

    #[test]
    fn parses_porcelain_lines() {
        let raw = " M src/main.ts\n?? new-file.txt\nA  added.rs";
        let rows = parse_porcelain_status(raw);
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0].path, "src/main.ts");
        assert_eq!(rows[0].status, "M");
        assert_eq!(rows[1].status, "??");
    }
}
