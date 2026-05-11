use crate::error::AppResult;
use crate::models::*;
use crate::services::{FileWatcherService, ProjectService};
use tauri::State;

#[tauri::command]
pub fn create_project(
    name: String,
    path: String,
    project_service: State<ProjectService>,
    file_watcher_service: State<'_, FileWatcherService>,
) -> AppResult<Project> {
    let project = project_service.create_project(name, path.clone())?;
    file_watcher_service.start(&path);
    Ok(project)
}

#[tauri::command]
pub fn open_project(
    path: String,
    project_service: State<ProjectService>,
    file_watcher_service: State<'_, FileWatcherService>,
) -> AppResult<Project> {
    let project = project_service.open_project(path.clone())?;
    file_watcher_service.start(&path);
    Ok(project)
}

#[tauri::command]
pub fn close_project(
    project_service: State<ProjectService>,
    file_watcher_service: State<'_, FileWatcherService>,
) {
    file_watcher_service.stop();
    project_service.close_project()
}

#[tauri::command]
pub fn get_current_project(project_service: State<ProjectService>) -> Option<Project> {
    project_service.get_current_project()
}

#[tauri::command]
pub async fn get_init_data(project_service: State<'_, ProjectService>) -> AppResult<ProjectInitData> {
    project_service.get_init_data().await
}

#[tauri::command]
pub fn update_project_info(
    info: serde_json::Value,
    project_service: State<ProjectService>,
) -> AppResult<Project> {
    project_service.update_project_info(info)
}

#[tauri::command]
pub fn get_recent_projects(
    project_service: State<ProjectService>,
) -> Vec<RecentProject> {
    project_service.get_recent_projects()
}

#[tauri::command]
pub fn remove_recent_project(
    path: String,
    project_service: State<ProjectService>,
) -> AppResult<()> {
    project_service.remove_recent_project(&path)
}

#[tauri::command]
pub fn clear_recent_projects(
    project_service: State<ProjectService>,
) -> AppResult<()> {
    project_service.clear_recent_projects()
}

#[tauri::command]
pub fn get_project_stats(
    path: String,
    project_service: State<ProjectService>,
) -> AppResult<serde_json::Value> {
    project_service.get_project_stats(&path)
}
