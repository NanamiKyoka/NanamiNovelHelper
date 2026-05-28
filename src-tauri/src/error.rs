use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("项目未找到: {0}")]
    ProjectNotFound(String),

    #[error("文件未找到: {0}")]
    FileNotFound(String),

    #[error("IO错误: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON解析错误: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("JSON5解析错误: {0}")]
    Json5Error(#[from] json5::Error),

    #[error("路径无效: {0}")]
    InvalidPath(String),

    #[error("操作失败: {0}")]
    OperationFailed(String),

    #[error("项目未打开")]
    ProjectNotOpen,

    #[error("参数无效: {0}")]
    InvalidParam(String),

    #[allow(dead_code)]
    #[error("权限不足: {0}")]
    PermissionDenied(String),
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::ProjectNotFound(_) => "PRJ_NOT_FOUND",
            AppError::FileNotFound(_) => "FIL_NOT_FOUND",
            AppError::IoError(_) => "SYS_IO_ERROR",
            AppError::JsonError(_) => "DAT_PARSE_ERROR",
            AppError::Json5Error(_) => "DAT_PARSE_ERROR",
            AppError::InvalidPath(_) => "PRJ_INVALID_PATH",
            AppError::OperationFailed(_) => "UNKNOWN",
            AppError::ProjectNotOpen => "PRJ_NOT_OPEN",
            AppError::InvalidParam(_) => "ARG_INVALID",
            AppError::PermissionDenied(_) => "SEC_PERMISSION_DENIED",
        }
    }

    pub fn module(&self) -> &'static str {
        match self {
            AppError::ProjectNotFound(_) | AppError::ProjectNotOpen | AppError::InvalidPath(_) => {
                "Project"
            }
            AppError::FileNotFound(_) => "File",
            AppError::IoError(_) => "System",
            AppError::JsonError(_) | AppError::Json5Error(_) => "Data",
            AppError::OperationFailed(_) => "Service",
            AppError::InvalidParam(_) => "Service",
            AppError::PermissionDenied(_) => "Security",
        }
    }
}

#[derive(Serialize)]
struct AppErrorPayload {
    code: &'static str,
    message: String,
    module: &'static str,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let payload = AppErrorPayload {
            code: self.code(),
            message: self.to_string(),
            module: self.module(),
        };
        payload.serialize(serializer)
    }
}

pub type AppResult<T> = std::result::Result<T, AppError>;