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

    #[error("权限不足: {0}")]
    PermissionDenied(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = std::result::Result<T, AppError>;
