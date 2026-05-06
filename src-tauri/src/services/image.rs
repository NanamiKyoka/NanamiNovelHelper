use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_id};
use base64::Engine;
use std::fs;
use std::path::PathBuf;

pub struct ImageService;

impl ImageService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    fn get_images_dir(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join("images")
    }

    pub fn upload_from_base64(
        &self,
        base64_data: String,
        original_name: String,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let images_dir = Self::get_images_dir(&project_path);
        ensure_dir(&images_dir)?;

        let image_data = base64::engine::general_purpose::STANDARD
            .decode(&base64_data)
            .map_err(|e| AppError::OperationFailed(format!("Base64 解码失败: {}", e)))?;

        let id = generate_id();
        let ext = PathBuf::from(&original_name)
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_else(|| "png".to_string());

        let filename = format!("{}.{}", id, ext);
        let file_path = images_dir.join(&filename);

        fs::write(&file_path, &image_data).map_err(|e| {
            AppError::OperationFailed(format!("保存图片失败: {}", e))
        })?;

        let relative_path = format!(".novelhelper/data/images/{}", filename);

        Ok(serde_json::json!({
            "path": relative_path,
            "originalName": original_name,
            "size": image_data.len(),
            "format": ext
        }))
    }

    pub fn upload_from_file(
        &self,
        file_path: String,
        original_name: String,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let images_dir = Self::get_images_dir(&project_path);
        ensure_dir(&images_dir)?;

        let data = fs::read(&file_path).map_err(|e| {
            AppError::OperationFailed(format!("读取文件失败: {}", e))
        })?;

        let id = generate_id();
        let ext = PathBuf::from(&original_name)
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_else(|| "png".to_string());

        let filename = format!("{}.{}", id, ext);
        let dest_path = images_dir.join(&filename);

        fs::write(&dest_path, &data).map_err(|e| {
            AppError::OperationFailed(format!("保存图片失败: {}", e))
        })?;

        let relative_path = format!(".novelhelper/data/images/{}", filename);

        Ok(serde_json::json!({
            "path": relative_path,
            "originalName": original_name,
            "size": data.len(),
            "format": ext
        }))
    }

    pub fn delete_image(&self, image_path: String) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let full_path = PathBuf::from(&project_path).join(&image_path);
        if full_path.exists() {
            fs::remove_file(&full_path).map_err(|e| {
                AppError::OperationFailed(format!("删除图片失败: {}", e))
            })?;
        }
        Ok(())
    }

    pub fn read_as_base64(&self, image_path: String) -> AppResult<String> {
        let project_path = Self::get_project_path()?;
        let full_path = PathBuf::from(&project_path).join(&image_path);
        if !full_path.exists() {
            return Err(AppError::FileNotFound(image_path));
        }
        let data = fs::read(&full_path).map_err(|e| {
            AppError::OperationFailed(format!("读取图片失败: {}", e))
        })?;
        Ok(base64::engine::general_purpose::STANDARD.encode(&data))
    }

    pub fn image_exists(&self, image_path: String) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let full_path = PathBuf::from(&project_path).join(&image_path);
        Ok(full_path.exists())
    }

    pub fn get_full_path(&self, image_path: String) -> AppResult<String> {
        let project_path = Self::get_project_path()?;
        let full_path = PathBuf::from(&project_path).join(&image_path);
        Ok(full_path.to_string_lossy().to_string())
    }
}

impl Default for ImageService {
    fn default() -> Self {
        Self::new()
    }
}
