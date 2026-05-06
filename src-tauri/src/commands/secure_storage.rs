use crate::error::AppResult;
use crate::services::secure_storage::SecureStorageService;
use tauri::State;

#[tauri::command]
pub fn secure_is_encryption_available(
    secure_storage: State<'_, SecureStorageService>,
) -> bool {
    secure_storage.is_encryption_available()
}

#[tauri::command]
pub fn secure_get_api_key(
    key_name: String,
    secure_storage: State<'_, SecureStorageService>,
) -> Option<String> {
    secure_storage.get_api_key(&key_name)
}

#[tauri::command]
pub fn secure_set_api_key(
    key_name: String,
    value: String,
    secure_storage: State<'_, SecureStorageService>,
) -> AppResult<()> {
    secure_storage.set_api_key(&key_name, &value)
}

#[tauri::command]
pub fn secure_delete_api_key(
    key_name: String,
    secure_storage: State<'_, SecureStorageService>,
) -> AppResult<()> {
    secure_storage.delete_api_key(&key_name)
}

#[tauri::command]
pub fn secure_get_api_key_names(
    secure_storage: State<'_, SecureStorageService>,
) -> Vec<String> {
    secure_storage.get_api_key_names()
}
