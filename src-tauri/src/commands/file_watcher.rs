use crate::error::AppResult;
use crate::services::FileWatcherService;
use tauri::State;

#[tauri::command]
pub fn file_watcher_start(
    project_path: String,
    file_watcher_service: State<'_, FileWatcherService>,
) -> AppResult<bool> {
    Ok(file_watcher_service.start(&project_path))
}

#[tauri::command]
pub fn file_watcher_stop(
    file_watcher_service: State<'_, FileWatcherService>,
) {
    file_watcher_service.stop()
}

#[tauri::command]
pub fn file_watcher_is_watching(
    file_watcher_service: State<'_, FileWatcherService>,
) -> bool {
    file_watcher_service.is_watching()
}

#[tauri::command]
pub fn file_watcher_get_watched_path(
    file_watcher_service: State<'_, FileWatcherService>,
) -> Option<String> {
    file_watcher_service.get_watched_path()
}
