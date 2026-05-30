mod cloud_chat;
mod construct_chat;
mod gemini_image;
mod git;
mod lsp;
mod ollama;
mod python_runtime;
mod resource_monitor;
mod secrets_store;
mod terminal;
mod window_chrome;
mod workspace;

use tauri::Manager;

#[tauri::command]
fn secrets_get(key: String) -> Result<Option<String>, String> {
    secrets_store::get_secret(key)
}

#[tauri::command]
fn secrets_set(key: String, value: String) -> Result<(), String> {
    secrets_store::set_secret(key, value)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(lsp::LspManager::new())
        .manage(terminal::TerminalManager::new())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(windows)]
                {
                    let _ = window.set_shadow(false);
                    let _ = window_chrome::sync_window_rounded_corners(&window, true);
                }
                #[cfg(debug_assertions)]
                {
                    let _ = window.open_devtools();
                }
            }
            std::thread::spawn(python_runtime::auto_update_python_runtime_if_due);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            secrets_get,
            secrets_set,
            window_chrome::set_window_caption_color,
            window_chrome::set_window_rounded_corners,
            window_chrome::lavash_reclaim_window_input,
            workspace::workspace_get_root,
            workspace::workspace_get_project_root,
            workspace::workspace_set_project_root,
            workspace::workspace_clear_project_root,
            workspace::workspace_list_tree,
            workspace::workspace_write_file,
            workspace::workspace_read_file,
            workspace::workspace_init,
            workspace::workspace_file_uri,
            workspace::workspace_resolve_file,
            workspace::workspace_file_metadata,
            workspace::workspace_create_dir,
            workspace::workspace_rename_entry,
            workspace::workspace_delete_entry,
            workspace::fs_read_text,
            workspace::fs_write_text,
            workspace::fs_metadata,
            lsp::lsp_start,
            lsp::lsp_send,
            lsp::lsp_stop,
            ollama::ollama_list_local_models,
            ollama::ollama_translate,
            ollama::ollama_pull_model,
            ollama::ollama_rm_model,
            ollama::lavash_construct_chat_stream_ollama,
            cloud_chat::lavash_construct_chat_stream_gemini,
            cloud_chat::lavash_construct_chat_stream_openai_compat,
            gemini_image::lavash_construct_generate_gemini_image,
            resource_monitor::lavash_resource_snapshot,
            resource_monitor::lavash_resource_disk_folder,
            resource_monitor::lavash_resource_network_diagnose,
            git::git_probe,
            git::git_is_repo,
            git::git_status,
            git::git_diff,
            terminal::terminal_probe,
            terminal::terminal_spawn,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::terminal_kill,
            python_runtime::python_probe,
            python_runtime::python_ensure,
            python_runtime::python_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LAVASH");
}
