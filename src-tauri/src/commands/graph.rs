use crate::error::AppResult;
use crate::services::GraphService;
use tauri::State;

#[tauri::command]
pub fn graph_get_list(sub_dir: String, service: State<GraphService>) -> AppResult<Vec<serde_json::Value>> {
    service.get_list(&sub_dir)
}

#[tauri::command]
pub fn graph_get(
    sub_dir: String,
    id: String,
    service: State<GraphService>,
) -> AppResult<Option<serde_json::Value>> {
    service.get(&sub_dir, &id)
}

#[tauri::command]
pub fn graph_create(
    sub_dir: String,
    data: serde_json::Value,
    service: State<GraphService>,
) -> AppResult<serde_json::Value> {
    service.create(&sub_dir, data)
}

#[tauri::command]
pub fn graph_update(
    sub_dir: String,
    id: String,
    updates: serde_json::Value,
    service: State<GraphService>,
) -> AppResult<Option<serde_json::Value>> {
    service.update(&sub_dir, &id, updates)
}

#[tauri::command]
pub fn graph_delete(
    sub_dir: String,
    id: String,
    service: State<GraphService>,
) -> AppResult<bool> {
    service.delete(&sub_dir, &id)
}

#[tauri::command]
pub fn graph_save_thumbnail(
    sub_dir: String,
    id: String,
    data_url: String,
    service: State<GraphService>,
) -> AppResult<Option<String>> {
    service.save_thumbnail(&sub_dir, &id, data_url)
}

#[tauri::command]
pub fn graph_get_thumbnail_path(
    sub_dir: String,
    id: String,
    service: State<GraphService>,
) -> AppResult<Option<String>> {
    service.get_thumbnail_path(&sub_dir, &id)
}

#[tauri::command]
pub fn graph_export(
    sub_dir: String,
    id: String,
    service: State<GraphService>,
) -> AppResult<Option<String>> {
    service.export_item(&sub_dir, &id)
}

#[tauri::command]
pub fn graph_import(
    sub_dir: String,
    json_content: String,
    service: State<GraphService>,
) -> AppResult<Option<serde_json::Value>> {
    service.import_item(&sub_dir, json_content)
}

#[tauri::command]
pub fn graph_reorder(
    sub_dir: String,
    ids: Vec<String>,
    service: State<GraphService>,
) -> AppResult<bool> {
    service.reorder(&sub_dir, ids)
}
