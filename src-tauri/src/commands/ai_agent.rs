use crate::error::AppResult;
use crate::services::ai_agent::AiAgentService;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn ai_agent_run(
    session_id: String,
    user_intent: String,
    content: String,
    app: AppHandle,
    agent_service: State<'_, AiAgentService>,
) -> AppResult<()> {
    agent_service
        .run_agent_loop(session_id, user_intent, content, &app)
        .await
}

#[tauri::command]
pub fn ai_agent_stop(
    session_id: String,
    agent_service: State<'_, AiAgentService>,
) -> bool {
    agent_service.stop_agent(&session_id)
}

#[tauri::command]
pub fn ai_agent_get_session(
    session_id: String,
    agent_service: State<'_, AiAgentService>,
) -> Option<crate::services::ai_agent::AgentSession> {
    agent_service.get_session(&session_id)
}

#[tauri::command]
pub fn ai_agent_list_sessions(
    agent_service: State<'_, AiAgentService>,
) -> Vec<crate::services::ai_agent::AgentSession> {
    agent_service.list_sessions()
}

#[tauri::command]
pub fn ai_agent_create_session(
    agent_service: State<'_, AiAgentService>,
) -> crate::services::ai_agent::AgentSession {
    agent_service.create_session()
}
