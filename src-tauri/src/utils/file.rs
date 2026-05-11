use crate::error::{AppError, AppResult};
use std::fs;
use std::path::Path;

pub fn ensure_dir(path: &Path) -> AppResult<()> {
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| {
            AppError::OperationFailed(format!("无法创建目录 {}: {}", path.display(), e))
        })?;
    }
    Ok(())
}

pub fn read_json5_file<T: serde::de::DeserializeOwned>(path: &Path) -> AppResult<T> {
    if !path.exists() {
        return Err(AppError::FileNotFound(path.display().to_string()));
    }
    let content = fs::read_to_string(path)?;
    let value: T = json5::from_str(&content)?;
    Ok(value)
}

pub fn write_json5_file<T: serde::Serialize>(path: &Path, value: &T) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        ensure_dir(parent)?;
    }
    let content = serde_json::to_string_pretty(value)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn read_json_file<T: serde::de::DeserializeOwned>(path: &Path) -> AppResult<T> {
    if !path.exists() {
        return Err(AppError::FileNotFound(path.display().to_string()));
    }
    let content = fs::read_to_string(path)?;
    let value: T = serde_json::from_str(&content)?;
    Ok(value)
}

pub fn write_json_file<T: serde::Serialize + ?Sized>(path: &Path, value: &T) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        ensure_dir(parent)?;
    }
    let content = serde_json::to_string_pretty(value)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn file_exists(path: &Path) -> bool {
    path.exists() && path.is_file()
}

#[allow(dead_code)]
pub fn dir_exists(path: &Path) -> bool {
    path.exists() && path.is_dir()
}
