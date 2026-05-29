use crate::lsp::LspManager;
use crate::workspace::lavash_app_data_root;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{Disks, Pid, System};
use tauri::State;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ResourceOverview {
    pub cpu_percent: f32,
    pub memory_percent: f32,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub disk_percent: f32,
    pub disk_available_gb: f64,
    pub disk_total_gb: f64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LavashUsageSlice {
    pub id: String,
    pub label: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LavashProcessRow {
    pub name: String,
    pub category: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    pub pid: u32,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiskEntry {
    pub name: String,
    pub path: String,
    pub bytes: u64,
    pub is_dir: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ResourceSnapshot {
    pub overview: ResourceOverview,
    pub cpu_brand: String,
    pub lavash_slices: Vec<LavashUsageSlice>,
    pub processes: Vec<LavashProcessRow>,
    pub lavash_disk: Vec<DiskEntry>,
    pub status_ok: bool,
    pub status_message: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkDiagnoseResult {
    pub ok: bool,
    pub checked_at: String,
    pub sections: Vec<NetworkSection>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSection {
    pub id: String,
    pub title: String,
    pub ok: bool,
    pub lines: Vec<String>,
}

fn dir_size(path: &Path) -> u64 {
    let meta = match std::fs::metadata(path) {
        Ok(m) => m,
        Err(_) => return 0,
    };
    if meta.is_file() {
        return meta.len();
    }
    if !meta.is_dir() {
        return 0;
    }
    let mut total = 0u64;
    let Ok(read) = std::fs::read_dir(path) else {
        return 0;
    };
    for entry in read.flatten() {
        total += dir_size(&entry.path());
    }
    total
}

fn lavash_disk_breakdown(root: &Path) -> Vec<DiskEntry> {
    let mut entries = Vec::new();
    let Ok(read) = std::fs::read_dir(root) else {
        return entries;
    };
    for entry in read.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        let rel = path
            .strip_prefix(root)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| name.clone());
        let is_dir = path.is_dir();
        entries.push(DiskEntry {
            name,
            path: rel,
            bytes: dir_size(&path),
            is_dir,
        });
    }
    entries.sort_by(|a, b| b.bytes.cmp(&a.bytes));
    entries
}

fn format_hms_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let total = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let h = (total / 3600) % 24;
    let m = (total / 60) % 60;
    let s = total % 60;
    format!("{h:02}:{m:02}:{s:02}")
}

#[tauri::command]
pub fn lavash_resource_snapshot(manager: State<'_, LspManager>) -> Result<ResourceSnapshot, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    thread::sleep(Duration::from_millis(180));
    sys.refresh_cpu_all();

    let cpu_percent = sys.global_cpu_usage();
    let memory_total = sys.total_memory();
    let memory_used = sys.used_memory();
    let memory_percent = if memory_total > 0 {
        (memory_used as f32 / memory_total as f32) * 100.0
    } else {
        0.0
    };

    let disks = Disks::new_with_refreshed_list();
    let (disk_total_gb, disk_available_gb, disk_percent) = disks
        .iter()
        .next()
        .map(|d| {
            let total = d.total_space() as f64 / (1024.0 * 1024.0 * 1024.0);
            let avail = d.available_space() as f64 / (1024.0 * 1024.0 * 1024.0);
            let used_pct = if d.total_space() > 0 {
                ((d.total_space() - d.available_space()) as f32 / d.total_space() as f32) * 100.0
            } else {
                0.0
            };
            (total, avail, used_pct)
        })
        .unwrap_or((0.0, 0.0, 0.0));

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "CPU".to_string());

    let self_pid = sysinfo::get_current_pid().map_err(|e| e.to_string())?;
    let lsp_sessions = manager.list_session_processes();
    let lsp_pids: Vec<u32> = lsp_sessions.iter().map(|(_, pid)| *pid).collect();

    let mut core_cpu = 0.0f32;
    let mut core_mem = 0u64;
    let mut lsp_cpu = 0.0f32;
    let mut lsp_mem = 0u64;
    let mut other_cpu = 0.0f32;
    let mut other_mem = 0u64;
    let mut processes = Vec::new();

    if let Some(proc) = sys.process(self_pid) {
        core_cpu = proc.cpu_usage();
        core_mem = proc.memory();
        processes.push(LavashProcessRow {
            name: "LAVASH Main".to_string(),
            category: "core".to_string(),
            cpu_percent: core_cpu,
            memory_bytes: core_mem,
            pid: self_pid.as_u32(),
        });
    }

    for (language, pid) in lsp_sessions {
        let pid = Pid::from_u32(pid);
        if let Some(proc) = sys.process(pid) {
            lsp_cpu += proc.cpu_usage();
            lsp_mem += proc.memory();
            processes.push(LavashProcessRow {
                name: format!("LSP · {language}"),
                category: "lsp".to_string(),
                cpu_percent: proc.cpu_usage(),
                memory_bytes: proc.memory(),
                pid: pid.as_u32(),
            });
        }
    }

    for (pid, proc) in sys.processes() {
        let pid_u32 = pid.as_u32();
        if pid_u32 == self_pid.as_u32() || lsp_pids.contains(&pid_u32) {
            continue;
        }
        let name = proc.name().to_string_lossy().to_string();
        let lower = name.to_lowercase();
        if !lower.contains("lavash") && !lower.contains("node") && !lower.contains("ollama") {
            continue;
        }
        other_cpu += proc.cpu_usage();
        other_mem += proc.memory();
        processes.push(LavashProcessRow {
            name,
            category: "other".to_string(),
            cpu_percent: proc.cpu_usage(),
            memory_bytes: proc.memory(),
            pid: pid_u32,
        });
    }

    processes.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));

    let lavash_slices = vec![
        LavashUsageSlice {
            id: "core".to_string(),
            label: "LAVASH Core".to_string(),
            cpu_percent: core_cpu,
            memory_bytes: core_mem,
        },
        LavashUsageSlice {
            id: "lsp".to_string(),
            label: "Language servers".to_string(),
            cpu_percent: lsp_cpu,
            memory_bytes: lsp_mem,
        },
        LavashUsageSlice {
            id: "other".to_string(),
            label: "Others".to_string(),
            cpu_percent: other_cpu,
            memory_bytes: other_mem,
        },
    ];

    let lavash_disk = lavash_app_data_root()
        .as_ref()
        .map(|root| lavash_disk_breakdown(root))
        .unwrap_or_default();

    let status_ok = cpu_percent < 90.0 && memory_percent < 92.0;

    Ok(ResourceSnapshot {
        overview: ResourceOverview {
            cpu_percent,
            memory_percent,
            memory_used_mb: memory_used / (1024 * 1024),
            memory_total_mb: memory_total / (1024 * 1024),
            disk_percent,
            disk_available_gb,
            disk_total_gb,
        },
        cpu_brand,
        lavash_slices,
        processes,
        lavash_disk,
        status_ok,
        status_message: if status_ok {
            "The system has not detected any high resource usage.".to_string()
        } else {
            "High resource usage detected.".to_string()
        },
    })
}

#[tauri::command]
pub fn lavash_resource_disk_folder(relative_path: String) -> Result<Vec<DiskEntry>, String> {
    let root = lavash_app_data_root().ok_or_else(|| "LAVASH data root unavailable".to_string())?;
    let rel = relative_path.trim().replace('\\', "/");
    if rel.contains("..") {
        return Err("Invalid path".to_string());
    }
    let target: PathBuf = if rel.is_empty() {
        root.clone()
    } else {
        root.join(&rel)
    };
    if !target.starts_with(&root) {
        return Err("Invalid path".to_string());
    }
    if !target.is_dir() {
        return Err("Not a folder".to_string());
    }
    Ok(lavash_disk_breakdown(&target))
}

#[tauri::command]
pub fn lavash_resource_network_diagnose() -> Result<NetworkDiagnoseResult, String> {
    let checked_at = format_hms_now();
    let mut sections = Vec::new();

    let ping_start = Instant::now();
    let google = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?
        .get("https://www.google.com/generate_204")
        .send();
    let ping_ms = ping_start.elapsed().as_millis();
    sections.push(NetworkSection {
        id: "connectivity".to_string(),
        title: "Internet connectivity".to_string(),
        ok: google.is_ok(),
        lines: vec![
            format!(
                "HTTPS probe: {}",
                if google.is_ok() { "success" } else { "failed" }
            ),
            format!("Round-trip: {ping_ms} ms"),
        ],
    });

    sections.push(NetworkSection {
        id: "local".to_string(),
        title: "LAVASH shell".to_string(),
        ok: true,
        lines: vec![
            "Desktop shell: active".to_string(),
            "WebView2: embedded".to_string(),
        ],
    });

    let ok = sections.iter().all(|s| s.ok);
    Ok(NetworkDiagnoseResult {
        ok,
        checked_at,
        sections,
    })
}
