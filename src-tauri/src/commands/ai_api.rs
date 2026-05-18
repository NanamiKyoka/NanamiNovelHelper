use crate::error::AppResult;
use crate::services::ai_api::{AiApiCallOptions, AiApiService};
use crate::services::secure_storage::SecureStorageService;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn ai_call_api(
    prompt: String,
    options: Option<AiApiCallOptions>,
    ai_api_service: State<'_, AiApiService>,
    secure_storage: State<'_, SecureStorageService>,
) -> AppResult<serde_json::Value> {
    let opts = options.unwrap_or(AiApiCallOptions {
        provider: None,
        model: None,
        system_prompt: None,
        temperature: None,
        max_tokens: None,
    });
    let result = ai_api_service.call(&prompt, &opts, &secure_storage).await;
    Ok(serde_json::to_value(result)?)
}

#[tauri::command]
pub async fn ai_call_api_stream(
    prompt: String,
    options: Option<AiApiCallOptions>,
    app: AppHandle,
    ai_api_service: State<'_, AiApiService>,
    secure_storage: State<'_, SecureStorageService>,
) -> AppResult<serde_json::Value> {
    let opts = options.unwrap_or(AiApiCallOptions {
        provider: None,
        model: None,
        system_prompt: None,
        temperature: None,
        max_tokens: None,
    });
    let result = ai_api_service
        .call_stream(&prompt, &opts, &secure_storage, &app)
        .await;
    Ok(serde_json::to_value(result)?)
}

#[tauri::command]
pub async fn ai_test_connection(
    provider: String,
    ai_api_service: State<'_, AiApiService>,
    secure_storage: State<'_, SecureStorageService>,
) -> AppResult<serde_json::Value> {
    let result = ai_api_service
        .test_connection(&provider, &secure_storage)
        .await;
    Ok(serde_json::to_value(result)?)
}

#[tauri::command]
pub fn ai_get_available_models(
    provider: String,
    ai_api_service: State<'_, AiApiService>,
) -> AppResult<Vec<String>> {
    Ok(ai_api_service.get_available_models(&provider))
}
