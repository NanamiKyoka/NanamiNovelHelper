use crate::error::AppResult;
use crate::services::ai_assistant::AiAssistantService;
use tauri::State;

#[tauri::command]
pub fn ai_list_templates(
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<Vec<serde_json::Value>> {
    ai_service.list_templates()
}

#[tauri::command]
pub fn ai_get_template(
    id: String,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.get_template(&id)
}

#[tauri::command]
pub fn ai_create_template(
    template: serde_json::Value,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.create_template(template)
}

#[tauri::command]
pub fn ai_update_template(
    id: String,
    updates: serde_json::Value,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.update_template(&id, updates)
}

#[tauri::command]
pub fn ai_delete_template(
    id: String,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<bool> {
    ai_service.delete_template(&id)
}

#[tauri::command]
pub fn ai_list_workflows(
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<Vec<serde_json::Value>> {
    ai_service.list_workflows()
}

#[tauri::command]
pub fn ai_get_workflow(
    id: String,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.get_workflow(&id)
}

#[tauri::command]
pub fn ai_create_workflow(
    workflow: serde_json::Value,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.create_workflow(workflow)
}

#[tauri::command]
pub fn ai_update_workflow(
    id: String,
    updates: serde_json::Value,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.update_workflow(&id, updates)
}

#[tauri::command]
pub fn ai_delete_workflow(
    id: String,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<bool> {
    ai_service.delete_workflow(&id)
}

#[tauri::command]
pub fn ai_save_execution(
    execution: serde_json::Value,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.save_execution(execution)
}

#[tauri::command]
pub fn ai_list_executions(
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<Vec<serde_json::Value>> {
    ai_service.list_executions()
}

#[tauri::command]
pub fn ai_delete_execution(
    id: String,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<bool> {
    ai_service.delete_execution(&id)
}

#[tauri::command]
pub fn ai_list_sessions(
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<Vec<serde_json::Value>> {
    ai_service.list_sessions()
}

#[tauri::command]
pub fn ai_get_session(
    id: String,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.get_session(&id)
}

#[tauri::command]
pub fn ai_save_session(
    session: serde_json::Value,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<serde_json::Value> {
    ai_service.save_session(session)
}

#[tauri::command]
pub fn ai_delete_session(
    id: String,
    ai_service: State<'_, AiAssistantService>,
) -> AppResult<bool> {
    ai_service.delete_session(&id)
}
