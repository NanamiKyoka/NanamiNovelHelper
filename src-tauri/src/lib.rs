mod commands;
mod error;
mod models;
mod services;
mod utils;

use commands::*;
use services::{
    AiAssistantService, BackupService, DynamicSkillService, FileService, GitService,
    GraphService, ImageService, ProjectService, SearchService, SettingsService, TerminalService,
    VocabularyService,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
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
        .manage(AiAssistantService::new())
        .manage(DynamicSkillService::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            open_project,
            close_project,
            get_current_project,
            get_init_data,
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
            search_content,
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
            git_checkout,
            git_merge,
            git_get_config,
            git_set_config,
            terminal_get_shells,
            terminal_create,
            terminal_list,
            terminal_kill,
            terminal_resize,
            terminal_write,
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
            skill_list,
            skill_get,
            skill_create,
            skill_update,
            skill_delete,
            skill_get_instructions,
            skill_update_instructions,
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
            path_relative
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
