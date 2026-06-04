mod commands;
mod error;
mod models;
mod services;
mod utils;

use commands::*;
use services::{
    AiApiService, AiAssistantService, BackupService, FileService,
    FileWatcherService, GitService, GraphService, ImageService, LogService, ProjectService,
    SearchService, SecureStorageService, SettingsService, TerminalService, VocabularyService,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .register_uri_scheme_protocol("local", |_app, request| {
            let uri = request.uri().to_string();
            let path_part = uri.strip_prefix("local://file/").unwrap_or("");
            let file_path = percent_encoding::percent_decode_str(path_part)
                .decode_utf8_lossy()
                .to_string();
            let file_path = file_path.replace('/', "\\");

            let project_path = services::project_state::get_project_path();
            if let Some(ref proj) = project_path {
                let proj_normalized = proj.replace('/', "\\");
                if !file_path.starts_with(&*proj_normalized) {
                    return tauri::http::Response::builder()
                        .status(403)
                        .body("Forbidden".as_bytes().to_vec())
                        .expect("failed to build 403 response");
                }
            }

            match std::fs::read(&file_path) {
                Ok(data) => {
                    let ext = std::path::Path::new(&file_path)
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("png")
                        .to_lowercase();
                    let mime = match ext.as_str() {
                        "jpg" | "jpeg" => "image/jpeg",
                        "gif" => "image/gif",
                        "webp" => "image/webp",
                        "svg" => "image/svg+xml",
                        _ => "image/png",
                    };
                    tauri::http::Response::builder()
                        .status(200)
                        .header("Content-Type", mime)
                        .body(data)
                        .expect("failed to build 200 response")
                }
                Err(_) => tauri::http::Response::builder()
                    .status(404)
                    .body("Not Found".as_bytes().to_vec())
                    .expect("failed to build 404 response"),
            }
        })
        .manage(ProjectService::new())
        .manage(VocabularyService::new())
        .manage(SettingsService::new())
        .manage(FileService::new())
        .manage(GraphService::new())
        .manage(SearchService::new())
        .manage(ImageService::new())
        .manage(BackupService::new())
        .manage(GitService::new())
        .manage(TerminalService::new())
        .manage(AiApiService::new())
        .manage(AiAssistantService::new())
        .manage(FileWatcherService::new())
        .manage(SecureStorageService::new())
        .manage(LogService::new())
        .setup(|app| {
            let file_watcher = app.state::<FileWatcherService>();
            file_watcher.set_app(app.handle().clone());
            let log_level = if cfg!(debug_assertions) {
                log::LevelFilter::Debug
            } else {
                log::LevelFilter::Warn
            };
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log_level)
                    .build(),
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            open_project,
            close_project,
            get_current_project,
            get_init_data,
            update_project_info,
            get_recent_projects,
            remove_recent_project,
            clear_recent_projects,
            get_project_stats,
            vocabulary_load_types,
            vocabulary_save_types,
            vocabulary_add_type,
            vocabulary_update_type,
            vocabulary_delete_type,
            vocabulary_load_entries,
            vocabulary_save_entries,
            vocabulary_add_entry,
            vocabulary_update_entry,
            vocabulary_delete_entry,
            sensitive_load_words,
            sensitive_save_words,
            sensitive_add_word,
            sensitive_update_word,
            sensitive_delete_word,
            sensitive_import_words,
            vocabulary_create_linked_file,
            settings_get_global,
            settings_update_global,
            settings_get_project,
            settings_update_project,
            highlight_get_config,
            highlight_save_config,
            file_exists,
            file_read,
            file_write,
            file_mkdir,
            file_delete,
            file_rename,
            file_copy,
            file_list,
            file_get_info,
            file_export_txt,
            file_get_tree,
            graph_get_list,
            graph_get,
            graph_create,
            graph_update,
            graph_delete,
            graph_save_thumbnail,
            graph_get_thumbnail_path,
            graph_export,
            graph_import,
            graph_reorder,
            graph_batch_delete_nodes,
            graph_move_node,
            graph_batch_move_nodes,
            timeline_create_branch,
            timeline_merge_branch,
            timeline_get_branches,
            timeline_get_branch_source_node,
            sequence_chart_update_event_time,
            graph_export_markdown,
            search_content,
            search_replace,
            upload_image_from_base64,
            upload_image_from_file,
            delete_image,
            read_image_as_base64,
            image_exists,
            get_image_full_path,
            create_backup,
            list_backups,
            restore_backup,
            delete_backup,
            export_backup,
            import_backup,
            import_backup_from_file,
            git_is_available,
            git_is_repo,
            git_init,
            git_get_status,
            git_get_log,
            git_add,
            git_unstage,
            git_commit,
            git_reset,
            git_restore,
            git_get_diff,
            git_get_commit_file_diff,
            git_get_commit_files,
            git_get_branches,
            git_create_branch,
            git_delete_branch,
            git_rename_branch,
            git_checkout,
            git_merge,
            git_get_config,
            git_check_author_identity,
            git_set_config,
            git_set_mode,
            git_get_mode,
            terminal_get_shells,
            terminal_create,
            terminal_list,
            terminal_kill,
            terminal_resize,
            terminal_write,
            terminal_rename,
            terminal_window_create,
            terminal_window_is_open,
            terminal_window_close,
            terminal_window_show,
            terminal_window_minimize,
            terminal_window_maximize,
            terminal_window_is_maximized,
            ai_list_templates,
            ai_get_template,
            ai_create_template,
            ai_update_template,
            ai_delete_template,
            ai_list_workflows,
            ai_get_workflow,
            ai_create_workflow,
            ai_update_workflow,
            ai_delete_workflow,
            ai_save_execution,
            ai_list_executions,
            ai_delete_execution,
            ai_call_api,
            ai_call_api_stream,
            ai_test_connection,
            ai_get_available_models,
            ai_get_provider_list,
            secure_is_encryption_available,
            secure_get_api_key,
            secure_set_api_key,
            secure_delete_api_key,
            secure_get_api_key_names,
            window_minimize,
            window_maximize,
            window_close,
            window_is_maximized,
            window_set_fullscreen,
            window_is_fullscreen,
            shell_open_external,
            path_resolve,
            path_basename,
            path_dirname,
            path_join,
            path_relative,
            file_watcher_start,
            file_watcher_stop,
            file_watcher_is_watching,
            file_watcher_get_watched_path,
            log_get_recent,
            log_clear,
            log_get_path,
            updater_check,
            updater_install
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
