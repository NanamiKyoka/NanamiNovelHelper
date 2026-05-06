use crate::error::AppResult;
use crate::models::*;
use crate::services::ProjectService;
use tauri::State;

#[tauri::command]
pub fn create_project(
    name: String,
    path: String,
    project_service: State<ProjectService>,
) -> AppResult<Project> {
    project_service.create_project(name, path)
}

#[tauri::command]
pub fn open_project(
    path: String,
    project_service: State<ProjectService>,
) -> AppResult<Project> {
    project_service.open_project(path)
}

#[tauri::command]
pub fn close_project(
    project_service: State<ProjectService>,
) {
    project_service.close_project()
}

#[tauri::command]
pub fn get_current_project(project_service: State<ProjectService>) -> Option<Project> {
    project_service.get_current_project()
}

#[tauri::command]
pub fn get_init_data(project_service: State<ProjectService>) -> AppResult<ProjectInitData> {
    project_service.get_init_data()
}
