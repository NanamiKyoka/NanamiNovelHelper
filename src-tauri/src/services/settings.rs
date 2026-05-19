use crate::error::AppResult;
use crate::services::project_state;
use crate::utils::{ensure_dir, read_json5_file, write_json5_file};
use std::path::PathBuf;

pub struct SettingsService;

impl SettingsService {
    pub fn new() -> Self {
        Self
    }

    fn get_settings_path(project_path: &str) -> PathBuf {
        PathBuf::from(project_path).join(".novelhelper").join("settings.json5")
    }

    fn get_global_settings_dir() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("NanamiNovelHelper")
    }

    fn get_global_settings_path() -> PathBuf {
        Self::get_global_settings_dir().join("global-settings.json")
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(crate::error::AppError::ProjectNotOpen)
    }

    pub fn get_global_settings(&self) -> AppResult<serde_json::Value> {
        let path = Self::get_global_settings_path();
        Ok(crate::utils::read_json_file(&path).unwrap_or(serde_json::json!({})))
    }

    pub fn update_global_settings(&self, settings: serde_json::Value) -> AppResult<serde_json::Value> {
        let path = Self::get_global_settings_path();
        let dir = Self::get_global_settings_dir();
        ensure_dir(&dir)?;
        let current = self.get_global_settings().unwrap_or(serde_json::json!({}));
        let merged = merge_json(current, settings);
        crate::utils::write_json_file(&path, &merged)?;
        Ok(merged)
    }

    pub fn get_project_settings(&self) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_settings_path(&project_path);
        Ok(read_json5_file(&path).unwrap_or(serde_json::json!({})))
    }

    pub fn update_project_settings(&self, settings: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_settings_path(&project_path);
        let current = self.get_project_settings().unwrap_or(serde_json::json!({}));
        let merged = merge_json(current, settings);
        write_json5_file(&path, &merged)?;
        Ok(merged)
    }

    pub fn get_highlight_config(&self) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let path = project_state::get_data_dir(&project_path).join("highlight-config.json5");
        Ok(read_json5_file(&path).unwrap_or(serde_json::json!({})))
    }

    pub fn save_highlight_config(&self, config: serde_json::Value) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let path = project_state::get_data_dir(&project_path).join("highlight-config.json5");
        write_json5_file(&path, &config)
    }
}

impl Default for SettingsService {
    fn default() -> Self {
        Self::new()
    }
}

fn merge_json(base: serde_json::Value, overlay: serde_json::Value) -> serde_json::Value {
    match (base, overlay) {
        (serde_json::Value::Object(mut base_map), serde_json::Value::Object(overlay_map)) => {
            for (key, value) in overlay_map {
                if let Some(base_value) = base_map.get(&key) {
                    let merged = merge_json(base_value.clone(), value);
                    base_map.insert(key, merged);
                } else {
                    base_map.insert(key, value);
                }
            }
            serde_json::Value::Object(base_map)
        }
        (_, overlay) => overlay,
    }
}
