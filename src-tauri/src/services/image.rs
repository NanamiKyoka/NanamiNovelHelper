use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_id};
use base64::Engine;
use std::io::Cursor;
use std::path::PathBuf;
use std::{fs, io::Write};

const MAX_WIDTH: u32 = 1920;
const MAX_HEIGHT: u32 = 1080;
const JPEG_QUALITY: u8 = 85;

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

    fn process_and_save(
        image_data: &[u8],
        format_str: &str,
        images_dir: &std::path::Path,
    ) -> AppResult<serde_json::Value> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| AppError::OperationFailed(format!("解析图片失败: {}", e)))?;

        let original_width = img.width();
        let original_height = img.height();

        let needs_resize = original_width > MAX_WIDTH || original_height > MAX_HEIGHT;
        let img = if needs_resize {
            img.resize(MAX_WIDTH, MAX_HEIGHT, image::imageops::FilterType::Lanczos3)
        } else {
            img
        };

        let format_lower = format_str.to_lowercase();
        let output_format = match format_lower.as_str() {
            "jpg" | "jpeg" => "jpeg",
            "gif" => "png",
            other => other,
        };

        let output_ext = match output_format {
            "jpeg" => "jpg",
            other => other,
        };

        let id = generate_id();
        let filename = format!("{}.{}", id, output_ext);
        let file_path = images_dir.join(&filename);

        let mut encoded_buf = Cursor::new(Vec::new());
        match output_format {
            "jpeg" => {
                let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                    &mut encoded_buf,
                    JPEG_QUALITY,
                );
                img.write_with_encoder(encoder)
                    .map_err(|e| AppError::OperationFailed(format!("编码 JPEG 失败: {}", e)))?;
            }
            "webp" => {
                let encoder = image::codecs::webp::WebPEncoder::new_lossless(&mut encoded_buf);
                img.write_with_encoder(encoder)
                    .map_err(|e| AppError::OperationFailed(format!("编码 WebP 失败: {}", e)))?;
            }
            _ => {
                let encoder = image::codecs::png::PngEncoder::new_with_quality(
                    &mut encoded_buf,
                    image::codecs::png::CompressionType::Default,
                    image::codecs::png::FilterType::Adaptive,
                );
                img.write_with_encoder(encoder)
                    .map_err(|e| AppError::OperationFailed(format!("编码 PNG 失败: {}", e)))?;
            }
        }

        let encoded_data = encoded_buf.into_inner();
        let mut file = fs::File::create(&file_path)
            .map_err(|e| AppError::OperationFailed(format!("创建文件失败: {}", e)))?;
        file.write_all(&encoded_data)
            .map_err(|e| AppError::OperationFailed(format!("写入文件失败: {}", e)))?;

        let relative_path = format!(".novelhelper/data/images/{}", filename);

        Ok(serde_json::json!({
            "path": relative_path,
            "originalName": filename,
            "size": encoded_data.len(),
            "width": img.width(),
            "height": img.height(),
            "format": output_ext
        }))
    }

    fn detect_format_from_data(data: &[u8]) -> String {
        if data.len() < 4 {
            return "png".to_string();
        }
        let header = &data[0..4.min(data.len())];
        if header.starts_with(b"\x89PNG") {
            "png".to_string()
        } else if header.starts_with(b"\xFF\xD8\xFF") {
            "jpeg".to_string()
        } else if header.starts_with(b"GIF8") {
            "gif".to_string()
        } else if header.starts_with(b"RIFF") && data.len() > 11 && &data[8..12] == b"WEBP" {
            "webp".to_string()
        } else {
            "png".to_string()
        }
    }

    pub fn upload_from_base64(
        &self,
        base64_data: String,
        original_name: String,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let images_dir = Self::get_images_dir(&project_path);
        ensure_dir(&images_dir)?;

        let (image_data, format) = if base64_data.starts_with("data:image/") {
            let parts: Vec<&str> = base64_data.splitn(2, ";base64,").collect();
            if parts.len() != 2 {
                return Err(AppError::InvalidParam("无效的 data URL 格式".to_string()));
            }
            let mime_format = parts[0].trim_start_matches("data:image/");
            let decoded = base64::engine::general_purpose::STANDARD
                .decode(parts[1])
                .map_err(|e| AppError::OperationFailed(format!("Base64 解码失败: {}", e)))?;
            (decoded, mime_format.to_string())
        } else {
            let decoded = base64::engine::general_purpose::STANDARD
                .decode(&base64_data)
                .map_err(|e| AppError::OperationFailed(format!("Base64 解码失败: {}", e)))?;
            let ext = PathBuf::from(&original_name)
                .extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_else(|| "png".to_string());
            (decoded, ext)
        };

        Self::process_and_save(&image_data, &format, &images_dir)
    }

    pub fn upload_from_file(
        &self,
        file_path: String,
        original_name: String,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let images_dir = Self::get_images_dir(&project_path);
        ensure_dir(&images_dir)?;

        let data = fs::read(&file_path)
            .map_err(|e| AppError::OperationFailed(format!("读取文件失败: {}", e)))?;

        let path = PathBuf::from(&original_name);
        let ext = path
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_else(|| Self::detect_format_from_data(&data));

        Self::process_and_save(&data, &ext, &images_dir)
    }

    pub fn delete_image(&self, image_path: String) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let full_path = PathBuf::from(&project_path).join(&image_path);
        if full_path.exists() {
            fs::remove_file(&full_path)
                .map_err(|e| AppError::OperationFailed(format!("删除图片失败: {}", e)))?;
        }
        Ok(())
    }

    pub fn read_as_base64(&self, image_path: String) -> AppResult<String> {
        let project_path = Self::get_project_path()?;
        let full_path = PathBuf::from(&project_path).join(&image_path);
        if !full_path.exists() {
            return Err(AppError::FileNotFound(image_path));
        }
        let data = fs::read(&full_path)
            .map_err(|e| AppError::OperationFailed(format!("读取图片失败: {}", e)))?;
        let encoded = base64::engine::general_purpose::STANDARD.encode(&data);

        let ext = PathBuf::from(&image_path)
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_else(|| "png".to_string());

        let mime = match ext.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "svg" => "image/svg+xml",
            "bmp" => "image/bmp",
            _ => "image/png",
        };

        Ok(format!("data:{};base64,{}", mime, encoded))
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
