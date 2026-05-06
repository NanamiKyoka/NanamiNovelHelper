use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_id, generate_timestamp, read_json5_file, write_json5_file};
use base64::Engine;
use std::fs;
use std::path::PathBuf;

pub struct GraphService;

impl GraphService {
    pub fn new() -> Self {
        Self
    }

    fn get_data_dir(project_path: &str, sub_dir: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join(sub_dir)
    }

    fn get_item_path(project_path: &str, sub_dir: &str, id: &str) -> PathBuf {
        Self::get_data_dir(project_path, sub_dir).join(format!("{}.json5", id))
    }

    fn get_thumbnails_dir(project_path: &str, sub_dir: &str) -> PathBuf {
        Self::get_data_dir(project_path, sub_dir).join("thumbnails")
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    pub fn get_list(&self, sub_dir: &str) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let data_dir = Self::get_data_dir(&project_path, sub_dir);
        if !data_dir.exists() {
            return Ok(vec![]);
        }
        let mut items = Vec::new();
        let entries = fs::read_dir(&data_dir).map_err(|e| {
            AppError::OperationFailed(format!("读取目录失败: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                AppError::OperationFailed(format!("读取目录条目失败: {}", e))
            })?;
            let path = entry.path();
            if path.extension().map(|e| e == "json5").unwrap_or(false) {
                if let Ok(item) = read_json5_file::<serde_json::Value>(&path) {
                    items.push(item);
                }
            }
        }

        items.sort_by(|a, b| {
            let order_a = a.get("order").and_then(|v| v.as_i64()).unwrap_or(0);
            let order_b = b.get("order").and_then(|v| v.as_i64()).unwrap_or(0);
            order_a.cmp(&order_b)
        });

        Ok(items)
    }

    pub fn get(&self, sub_dir: &str, id: &str) -> AppResult<Option<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(None);
        }
        match read_json5_file::<serde_json::Value>(&path) {
            Ok(item) => Ok(Some(item)),
            Err(_) => Ok(None),
        }
    }

    pub fn create(&self, sub_dir: &str, data: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let id = generate_id();
        let now = generate_timestamp();

        let list = self.get_list(sub_dir)?;
        let order = list.len() as i32;

        let mut item = data;
        if let Some(obj) = item.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
            obj.insert("createdAt".to_string(), serde_json::Value::String(now.clone()));
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));
            obj.insert("order".to_string(), serde_json::Value::Number(order.into()));
        }

        let path = Self::get_item_path(&project_path, sub_dir, &id);
        write_json5_file(&path, &item)?;
        Ok(item)
    }

    pub fn update(&self, sub_dir: &str, id: &str, updates: serde_json::Value) -> AppResult<Option<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(None);
        }

        let mut item: serde_json::Value = read_json5_file(&path).map_err(|_| {
            AppError::OperationFailed(format!("解析文件失败: {}", id))
        })?;

        let now = generate_timestamp();
        merge_json_value(&mut item, updates);
        if let Some(obj) = item.as_object_mut() {
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));
        }

        write_json5_file(&path, &item)?;
        Ok(Some(item))
    }

    pub fn delete(&self, sub_dir: &str, id: &str) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(false);
        }
        fs::remove_file(&path).map_err(|e| {
            AppError::OperationFailed(format!("删除失败: {}", e))
        })?;

        let thumb_dir = Self::get_thumbnails_dir(&project_path, sub_dir);
        let thumb_path = thumb_dir.join(format!("{}.png", id));
        let _ = fs::remove_file(thumb_path);

        Ok(true)
    }

    pub fn save_thumbnail(&self, sub_dir: &str, id: &str, data_url: String) -> AppResult<Option<String>> {
        let project_path = Self::get_project_path()?;
        let thumb_dir = Self::get_thumbnails_dir(&project_path, sub_dir);
        ensure_dir(&thumb_dir)?;

        let base64_data = if data_url.starts_with("data:image/png;base64,") {
            &data_url["data:image/png;base64,".len()..]
        } else if data_url.starts_with("data:image/") {
            if let Some(idx) = data_url.find(";base64,") {
                &data_url[idx + ";base64,".len()..]
            } else {
                return Err(AppError::InvalidParam("无效的 data URL 格式".to_string()));
            }
        } else {
            return Err(AppError::InvalidParam("无效的 data URL 格式".to_string()));
        };

        let image_data = base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .map_err(|e| AppError::OperationFailed(format!("Base64 解码失败: {}", e)))?;

        let thumb_path = thumb_dir.join(format!("{}.png", id));
        fs::write(&thumb_path, image_data).map_err(|e| {
            AppError::OperationFailed(format!("保存缩略图失败: {}", e))
        })?;

        let item_path = Self::get_item_path(&project_path, sub_dir, id);
        if item_path.exists() {
            if let Ok(mut item) = read_json5_file::<serde_json::Value>(&item_path) {
                if let Some(obj) = item.as_object_mut() {
                    obj.insert("thumbnail".to_string(), serde_json::Value::String(format!("{}.png", id)));
                }
                let _ = write_json5_file(&item_path, &item);
            }
        }

        Ok(Some(thumb_path.to_string_lossy().to_string()))
    }

    pub fn get_thumbnail_path(&self, sub_dir: &str, id: &str) -> AppResult<Option<String>> {
        let project_path = Self::get_project_path()?;
        let thumb_path = Self::get_thumbnails_dir(&project_path, sub_dir).join(format!("{}.png", id));
        if thumb_path.exists() {
            Ok(Some(thumb_path.to_string_lossy().to_string()))
        } else {
            Ok(None)
        }
    }

    pub fn export_item(&self, sub_dir: &str, id: &str) -> AppResult<Option<String>> {
        let item = self.get(sub_dir, id)?;
        match item {
            Some(val) => {
                let json5_str = json5::to_string(&val).unwrap_or_else(|_| serde_json::to_string_pretty(&val).unwrap_or_default());
                Ok(Some(json5_str))
            }
            None => Ok(None),
        }
    }

    pub fn import_item(&self, sub_dir: &str, json_content: String) -> AppResult<Option<serde_json::Value>> {
        let parsed: serde_json::Value = json5::from_str(&json_content).map_err(|e| {
            AppError::InvalidParam(format!("JSON5 解析失败: {}", e))
        })?;

        let new_id = generate_id();
        let now = generate_timestamp();

        let mut item = parsed;
        if let Some(obj) = item.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(new_id.clone()));
            obj.insert("createdAt".to_string(), serde_json::Value::String(now.clone()));
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));
            obj.remove("thumbnail");
        }

        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, &new_id);
        write_json5_file(&path, &item)?;
        Ok(Some(item))
    }

    pub fn reorder(&self, sub_dir: &str, ids: Vec<String>) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        for (index, id) in ids.iter().enumerate() {
            let path = Self::get_item_path(&project_path, sub_dir, id);
            if path.exists() {
                if let Ok(mut item) = read_json5_file::<serde_json::Value>(&path) {
                    if let Some(obj) = item.as_object_mut() {
                        obj.insert("order".to_string(), serde_json::Value::Number((index as i32).into()));
                    }
                    let _ = write_json5_file(&path, &item);
                }
            }
        }
        Ok(true)
    }
}

impl Default for GraphService {
    fn default() -> Self {
        Self::new()
    }
}

fn merge_json_value(base: &mut serde_json::Value, overlay: serde_json::Value) {
    match (base, overlay) {
        (serde_json::Value::Object(base_map), serde_json::Value::Object(overlay_map)) => {
            for (key, value) in overlay_map {
                if let Some(base_value) = base_map.get_mut(&key) {
                    merge_json_value(base_value, value);
                } else {
                    base_map.insert(key, value);
                }
            }
        }
        (base, overlay) => {
            *base = overlay;
        }
    }
}
