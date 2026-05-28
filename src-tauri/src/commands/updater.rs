use crate::error::AppResult;
use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub date: Option<String>,
    pub body: Option<String>,
}

#[derive(Serialize)]
pub struct UpdateCheckResult {
    pub update_available: bool,
    pub current_version: String,
    pub update_info: Option<UpdateInfo>,
}

#[tauri::command]
pub async fn updater_check(app: AppHandle) -> AppResult<UpdateCheckResult> {
    let current_version = env!("APP_VERSION").to_string();

    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => Ok(UpdateCheckResult {
                update_available: true,
                current_version: current_version.clone(),
                update_info: Some(UpdateInfo {
                    version: update.version.clone(),
                    date: update.date.map(|d| {
                        format!(
                            "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
                            d.year(),
                            d.month() as u8,
                            d.day(),
                            d.hour(),
                            d.minute(),
                            d.second()
                        )
                    }),
                    body: update.body.clone(),
                }),
            }),
            Ok(None) => Ok(UpdateCheckResult {
                update_available: false,
                current_version: current_version.clone(),
                update_info: None,
            }),
            Err(e) => Err(crate::error::AppError::OperationFailed(format!(
                "检查更新失败: {}",
                e
            ))),
        },
        Err(e) => Err(crate::error::AppError::OperationFailed(format!(
            "初始化更新器失败: {}",
            e
        ))),
    }
}

#[tauri::command]
pub async fn updater_install(app: AppHandle) -> AppResult<()> {
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => {
                update
                    .download_and_install(
                        |_chunk, _content_len| {},
                        || {},
                    )
                    .await
                    .map_err(|e| {
                        crate::error::AppError::OperationFailed(format!("下载更新失败: {}", e))
                    })?;
                Ok(())
            }
            Ok(None) => Err(crate::error::AppError::OperationFailed(
                "没有可用的更新".to_string(),
            )),
            Err(e) => Err(crate::error::AppError::OperationFailed(format!(
                "检查更新失败: {}",
                e
            ))),
        },
        Err(e) => Err(crate::error::AppError::OperationFailed(format!(
            "初始化更新器失败: {}",
            e
        ))),
    }
}
