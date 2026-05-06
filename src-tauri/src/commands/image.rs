use crate::error::AppResult;
use crate::services::image::ImageService;
use tauri::State;

#[tauri::command]
pub fn upload_image_from_base64(
    base64_data: String,
    original_name: String,
    image_service: State<'_, ImageService>,
) -> AppResult<serde_json::Value> {
    image_service.upload_from_base64(base64_data, original_name)
}

#[tauri::command]
pub fn upload_image_from_file(
    file_path: String,
    original_name: String,
    image_service: State<'_, ImageService>,
) -> AppResult<serde_json::Value> {
    image_service.upload_from_file(file_path, original_name)
}

#[tauri::command]
pub fn delete_image(
    image_path: String,
    image_service: State<'_, ImageService>,
) -> AppResult<()> {
    image_service.delete_image(image_path)
}

#[tauri::command]
pub fn read_image_as_base64(
    image_path: String,
    image_service: State<'_, ImageService>,
) -> AppResult<String> {
    image_service.read_as_base64(image_path)
}

#[tauri::command]
pub fn image_exists(
    image_path: String,
    image_service: State<'_, ImageService>,
) -> AppResult<bool> {
    image_service.image_exists(image_path)
}

#[tauri::command]
pub fn get_image_full_path(
    image_path: String,
    image_service: State<'_, ImageService>,
) -> AppResult<String> {
    image_service.get_full_path(image_path)
}
