use crate::error::AppResult;
use crate::models::FileNode;
use crate::services::FileService;
use tauri::State;

#[tauri::command]
pub async fn file_exists(path: String, service: State<'_, FileService>) -> AppResult<bool> {
    service.exists(path).await
}

#[tauri::command]
pub async fn file_read(path: String, service: State<'_, FileService>) -> AppResult<String> {
    service.read_file(path).await
}

#[tauri::command]
pub async fn file_write(
    path: String,
    content: String,
    service: State<'_, FileService>,
) -> AppResult<()> {
    service.write_file(path, content).await
}

#[tauri::command]
pub async fn file_mkdir(
    path: String,
    recursive: bool,
    service: State<'_, FileService>,
) -> AppResult<()> {
    service.mkdir(path, recursive).await
}

#[tauri::command]
pub async fn file_delete(path: String, service: State<'_, FileService>) -> AppResult<()> {
    service.delete(path).await
}

#[tauri::command]
pub async fn file_rename(
    old_path: String,
    new_path: String,
    service: State<'_, FileService>,
) -> AppResult<()> {
    service.rename(old_path, new_path).await
}

#[tauri::command]
pub async fn file_get_tree(
    include_hidden: bool,
    service: State<'_, FileService>,
) -> AppResult<Vec<FileNode>> {
    service.get_file_tree(include_hidden).await
}
