use crate::error::AppResult;
use crate::services::dynamic_skill::DynamicSkillService;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn skill_list(
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<Vec<serde_json::Value>> {
    skill_service.list_skills()
}

#[tauri::command]
pub fn skill_get(
    id: String,
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<serde_json::Value> {
    skill_service.get_skill(&id)
}

#[tauri::command]
pub fn skill_create(
    skill: serde_json::Value,
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<serde_json::Value> {
    skill_service.create_skill(skill)
}

#[tauri::command]
pub fn skill_update(
    id: String,
    updates: serde_json::Value,
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<serde_json::Value> {
    skill_service.update_skill(&id, updates)
}

#[tauri::command]
pub fn skill_delete(
    id: String,
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<bool> {
    skill_service.delete_skill(&id)
}

#[tauri::command]
pub fn skill_get_instructions(
    id: String,
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<String> {
    skill_service.get_skill_instructions(&id)
}

#[tauri::command]
pub fn skill_update_instructions(
    id: String,
    instructions: String,
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<()> {
    skill_service.update_skill_instructions(&id, instructions)
}

#[tauri::command]
pub async fn skill_execute(
    skill_id: String,
    tool_id: String,
    parameters: serde_json::Value,
    context: serde_json::Value,
    app: AppHandle,
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<serde_json::Value> {
    skill_service.execute_tool(&skill_id, &tool_id, parameters, context, &app).await
}

#[tauri::command]
pub fn skill_cancel(
    execution_id: String,
    skill_service: State<'_, DynamicSkillService>,
) -> AppResult<bool> {
    skill_service.cancel_execution(&execution_id)
}

#[tauri::command]
pub fn skill_check_python(
    skill_service: State<'_, DynamicSkillService>,
) -> serde_json::Value {
    skill_service.check_python()
}
