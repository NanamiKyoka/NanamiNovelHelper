use crate::error::AppResult;
use crate::services::SettingsService;
use tauri::State;

#[tauri::command]
pub fn settings_get_global(service: State<SettingsService>) -> AppResult<serde_json::Value> {
    service.get_global_settings()
}

#[tauri::command]
pub fn settings_update_global(
    settings: serde_json::Value,
    service: State<SettingsService>,
) -> AppResult<serde_json::Value> {
    service.update_global_settings(settings)
}

#[tauri::command]
pub fn settings_get_project(service: State<SettingsService>) -> AppResult<serde_json::Value> {
    service.get_project_settings()
}

#[tauri::command]
pub fn settings_update_project(
    settings: serde_json::Value,
    service: State<SettingsService>,
) -> AppResult<serde_json::Value> {
    service.update_project_settings(settings)
}

#[tauri::command]
pub fn highlight_get_config(service: State<SettingsService>) -> AppResult<serde_json::Value> {
    service.get_highlight_config()
}

#[tauri::command]
pub fn highlight_save_config(
    config: serde_json::Value,
    service: State<SettingsService>,
) -> AppResult<()> {
    service.save_highlight_config(config)
}
