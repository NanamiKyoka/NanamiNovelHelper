use crate::error::AppResult;
use crate::services::terminal::TerminalService;
use tauri::State;

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
    terminal_service: State<'_, TerminalService>,
) -> AppResult<serde_json::Value> {
    terminal_service.create(name, cwd, shell_path)
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
