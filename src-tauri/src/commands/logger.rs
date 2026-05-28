use crate::services::LogService;
use tauri::State;

#[tauri::command]
pub async fn log_get_recent(count: usize, logger: State<'_, LogService>) -> Result<Vec<crate::services::logger::LogEntry>, String> {
    Ok(logger.get_recent_logs(count))
}

#[tauri::command]
pub async fn log_clear(logger: State<'_, LogService>) -> Result<bool, String> {
    Ok(logger.clear_logs())
}

#[tauri::command]
pub async fn log_get_path(logger: State<'_, LogService>) -> Result<Option<String>, String> {
    Ok(logger.get_log_path())
}