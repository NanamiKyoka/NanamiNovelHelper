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

#[tauri::command]
pub fn graph_batch_delete_nodes(
    sub_dir: String,
    id: String,
    node_ids: Vec<String>,
    service: State<GraphService>,
) -> AppResult<u64> {
    service.batch_delete_nodes(&sub_dir, &id, node_ids)
}

#[tauri::command]
pub fn graph_move_node(
    sub_dir: String,
    id: String,
    node_id: String,
    new_order: i32,
    service: State<GraphService>,
) -> AppResult<Option<serde_json::Value>> {
    service.move_node(&sub_dir, &id, &node_id, new_order)
}

#[tauri::command]
pub fn graph_batch_move_nodes(
    sub_dir: String,
    id: String,
    node_ids: Vec<String>,
    target_order: i32,
    service: State<GraphService>,
) -> AppResult<Option<serde_json::Value>> {
    service.batch_move_nodes(&sub_dir, &id, node_ids, target_order)
}

#[tauri::command]
pub fn timeline_create_branch(
    parent_timeline_id: String,
    branch_from_node_id: String,
    name: Option<String>,
    service: State<GraphService>,
) -> AppResult<serde_json::Value> {
    service.create_branch(&parent_timeline_id, &branch_from_node_id, name)
}

#[tauri::command]
pub fn timeline_merge_branch(
    branch_timeline_id: String,
    target_timeline_id: String,
    target_node_id: Option<String>,
    service: State<GraphService>,
) -> AppResult<bool> {
    service.merge_branch(&branch_timeline_id, &target_timeline_id, target_node_id)
}

#[tauri::command]
pub fn timeline_get_branches(
    parent_timeline_id: String,
    service: State<GraphService>,
) -> AppResult<Vec<serde_json::Value>> {
    service.get_branches(&parent_timeline_id)
}

#[tauri::command]
pub fn timeline_get_branch_source_node(
    timeline_id: String,
    service: State<GraphService>,
) -> AppResult<Option<serde_json::Value>> {
    service.get_branch_source_node(&timeline_id)
}

#[tauri::command]
pub fn sequence_chart_update_event_time(
    chart_id: String,
    event_id: String,
    cell_start: i64,
    cell_end: i64,
    service: State<GraphService>,
) -> AppResult<Option<serde_json::Value>> {
    service.update_event_time(&chart_id, &event_id, cell_start, cell_end)
}

#[tauri::command]
pub fn graph_export_markdown(
    sub_dir: String,
    id: String,
    service: State<GraphService>,
) -> AppResult<Option<String>> {
    service.export_markdown(&sub_dir, &id)
}
