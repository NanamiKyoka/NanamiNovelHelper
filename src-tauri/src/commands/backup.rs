use crate::error::AppResult;
use crate::services::backup::BackupService;
use tauri::State;

#[tauri::command]
pub fn create_backup(
    backup_service: State<'_, BackupService>,
) -> AppResult<String> {
    backup_service.create_backup()
}

#[tauri::command]
pub fn list_backups(
    backup_service: State<'_, BackupService>,
) -> AppResult<Vec<serde_json::Value>> {
    backup_service.list_backups()
}

#[tauri::command]
pub fn restore_backup(
    filename: String,
    backup_service: State<'_, BackupService>,
) -> AppResult<bool> {
    backup_service.restore_backup(filename)
}

#[tauri::command]
pub fn delete_backup(
    filename: String,
    backup_service: State<'_, BackupService>,
) -> AppResult<bool> {
    backup_service.delete_backup(filename)
}

#[tauri::command]
pub fn export_backup(
    filename: String,
    backup_service: State<'_, BackupService>,
) -> AppResult<String> {
    backup_service.export_backup(filename)
}

#[tauri::command]
pub fn import_backup(
    base64_data: String,
    backup_service: State<'_, BackupService>,
) -> AppResult<String> {
    backup_service.import_backup(base64_data)
}

#[tauri::command]
pub fn import_backup_from_file(
    import_path: String,
    backup_service: State<'_, BackupService>,
) -> AppResult<String> {
    backup_service.import_backup_from_file(import_path)
}
