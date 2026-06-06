use crate::error::AppResult;
use crate::services::ai_skill::{AiSkill, AiSkillMatchResult, AiSkillService};
use tauri::State;

#[tauri::command]
pub fn ai_discover_skills(service: State<'_, AiSkillService>) -> AppResult<Vec<AiSkill>> {
    service.discover_skills()
}

#[tauri::command]
pub fn ai_load_skill_content(
    location: String,
    service: State<'_, AiSkillService>,
) -> AppResult<AiSkill> {
    service.load_skill_content(&location)
}

#[tauri::command]
pub fn ai_match_skills(
    user_intent: String,
    skills: Vec<AiSkill>,
    service: State<'_, AiSkillService>,
) -> Vec<AiSkillMatchResult> {
    service.match_skills(&user_intent, &skills)
}

#[tauri::command]
pub fn ai_save_skill(
    name: String,
    description: String,
    tags: Vec<String>,
    content: String,
    service: State<'_, AiSkillService>,
) -> AppResult<AiSkill> {
    service.save_skill(&name, &description, tags, &content)
}

#[tauri::command]
pub fn ai_delete_skill(name: String, service: State<'_, AiSkillService>) -> AppResult<()> {
    service.delete_skill(&name)
}

#[tauri::command]
pub fn ai_ensure_builtin_skills(service: State<'_, AiSkillService>) -> AppResult<()> {
    service.ensure_builtin_skills()
}
