use crate::error::AppResult;
use crate::services::terminal::TerminalService;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub fn terminal_get_shells(
    terminal_service: State<'_, TerminalService>,
) -> Vec<serde_json::Value> {
    terminal_service.get_shells()
}

#[tauri::command]
pub fn terminal_create(
    name: Option<String>,
    cwd: Option<String>,
    shell_path: Option<String>,
    app: AppHandle,
    terminal_service: State<'_, TerminalService>,
) -> AppResult<serde_json::Value> {
    terminal_service.create(name, cwd, shell_path, &app)
}

#[tauri::command]
pub fn terminal_list(
    terminal_service: State<'_, TerminalService>,
) -> AppResult<Vec<serde_json::Value>> {
    terminal_service.list()
}

#[tauri::command]
pub fn terminal_kill(
    id: String,
    terminal_service: State<'_, TerminalService>,
) -> AppResult<bool> {
    terminal_service.kill(&id)
}

#[tauri::command]
pub fn terminal_resize(
    id: String,
    cols: u16,
    rows: u16,
    terminal_service: State<'_, TerminalService>,
) -> AppResult<()> {
    terminal_service.resize(&id, cols, rows)
}

#[tauri::command]
pub fn terminal_write(
    id: String,
    data: String,
    terminal_service: State<'_, TerminalService>,
) -> AppResult<()> {
    terminal_service.write(&id, &data)
}

#[tauri::command]
pub async fn terminal_window_create(app: AppHandle) -> AppResult<bool> {
    let existing = app.get_webview_window("terminal-window");
    if existing.is_some() {
        if let Some(win) = existing {
            let _ = win.show();
            let _ = win.set_focus();
        }
        return Ok(true);
    }

    let window = WebviewWindowBuilder::new(
        &app,
        "terminal-window",
        WebviewUrl::App("terminal.html".into()),
    )
    .title("终端")
    .inner_size(800.0, 600.0)
    .min_inner_size(400.0, 300.0)
    .resizable(true)
    .build()
    .map_err(|e| crate::error::AppError::OperationFailed(format!("创建终端窗口失败: {}", e)))?;

    let app_clone = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            let _ = app_clone.emit("terminal-window:closed", ());
        }
    });

    let _ = app.emit("terminal-window:opened", ());
    Ok(true)
}

#[tauri::command]
pub fn terminal_window_is_open(app: AppHandle) -> bool {
    app.get_webview_window("terminal-window").is_some()
}

#[tauri::command]
pub fn terminal_window_close(app: AppHandle) -> AppResult<()> {
    if let Some(win) = app.get_webview_window("terminal-window") {
        win.close().map_err(|e| crate::error::AppError::OperationFailed(format!("关闭终端窗口失败: {}", e)))?;
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_window_show(app: AppHandle) -> AppResult<()> {
    if let Some(win) = app.get_webview_window("terminal-window") {
        win.show().map_err(|e| crate::error::AppError::OperationFailed(format!("显示终端窗口失败: {}", e)))?;
        let _ = win.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_window_minimize(app: AppHandle) -> AppResult<()> {
    if let Some(win) = app.get_webview_window("terminal-window") {
        win.minimize().map_err(|e| crate::error::AppError::OperationFailed(format!("最小化终端窗口失败: {}", e)))?;
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_window_maximize(app: AppHandle) -> AppResult<()> {
    if let Some(win) = app.get_webview_window("terminal-window") {
        win.maximize().map_err(|e| crate::error::AppError::OperationFailed(format!("最大化终端窗口失败: {}", e)))?;
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_window_is_maximized(app: AppHandle) -> bool {
    app.get_webview_window("terminal-window")
        .and_then(|win| win.is_maximized().ok())
        .unwrap_or(false)
}
