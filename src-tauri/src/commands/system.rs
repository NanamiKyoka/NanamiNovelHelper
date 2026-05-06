use crate::error::AppResult;
use tauri::WebviewWindow;

#[tauri::command]
pub async fn window_minimize(window: WebviewWindow) -> AppResult<()> {
    window.minimize().map_err(|e| crate::error::AppError::OperationFailed(format!("最小化失败: {}", e)))
}

#[tauri::command]
pub async fn window_maximize(window: WebviewWindow) -> AppResult<()> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| crate::error::AppError::OperationFailed(format!("还原失败: {}", e)))
    } else {
        window.maximize().map_err(|e| crate::error::AppError::OperationFailed(format!("最大化失败: {}", e)))
    }
}

#[tauri::command]
pub async fn window_close(window: WebviewWindow) -> AppResult<()> {
    window.close().map_err(|e| crate::error::AppError::OperationFailed(format!("关闭失败: {}", e)))
}

#[tauri::command]
pub async fn window_is_maximized(window: WebviewWindow) -> AppResult<bool> {
    Ok(window.is_maximized().unwrap_or(false))
}

#[tauri::command]
pub async fn window_set_fullscreen(is_fullscreen: bool, window: WebviewWindow) -> AppResult<()> {
    window.set_fullscreen(is_fullscreen).map_err(|e| crate::error::AppError::OperationFailed(format!("全屏设置失败: {}", e)))
}

#[tauri::command]
pub async fn window_is_fullscreen(window: WebviewWindow) -> AppResult<bool> {
    Ok(window.is_fullscreen().unwrap_or(false))
}

#[tauri::command]
pub async fn shell_open_external(url: String) -> AppResult<()> {
    open::that(&url).map_err(|e| crate::error::AppError::OperationFailed(format!("打开链接失败: {}", e)))
}

#[tauri::command]
pub fn path_resolve(path_segments: Vec<String>) -> String {
    let path: std::path::PathBuf = path_segments.iter().collect();
    path.to_string_lossy().to_string()
}

#[tauri::command]
pub fn path_basename(path: String) -> String {
    std::path::Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default()
}

#[tauri::command]
pub fn path_dirname(path: String) -> String {
    std::path::Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string())
}

#[tauri::command]
pub fn path_join(path_segments: Vec<String>) -> String {
    let path: std::path::PathBuf = path_segments.iter().collect();
    path.to_string_lossy().to_string()
}

#[tauri::command]
pub fn path_relative(from: String, to: String) -> String {
    let from_path = std::path::Path::new(&from);
    let to_path = std::path::Path::new(&to);
    pathdiff::diff_paths(to_path, from_path)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| to.clone())
}
