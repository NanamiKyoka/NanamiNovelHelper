use crate::services::tool_registry::{Tool, ToolResult};
use crate::services::tools::resolve_project_file;
use serde_json::json;
use std::future::Future;
use std::pin::Pin;

pub struct ReadFileTool;

impl ReadFileTool {
    pub fn new() -> Self {
        Self
    }
}

impl Tool for ReadFileTool {
    fn name(&self) -> &str {
        "read_file"
    }

    fn description(&self) -> &str {
        "读取项目中的文件内容，限制50KB"
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "相对于项目根的路径"
                }
            },
            "required": ["path"]
        })
    }

    fn execute(
        &self,
        params: serde_json::Value,
    ) -> Pin<Box<dyn Future<Output = ToolResult> + Send + '_>> {
        Box::pin(async move {
            let path = params.get("path").and_then(|p| p.as_str()).unwrap_or("");
            if path.is_empty() {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some("缺少 path 参数".to_string()),
                }
            }

            let full_path = match resolve_project_file(path) {
                Ok(p) => p,
                Err(e) => {
                    return ToolResult {
                        success: false,
                        result: None,
                        error: Some(e.to_string()),
                    }
                }
            };

            if !full_path.exists() {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(format!("文件不存在: {}", path)),
                }
            }

            let metadata = match std::fs::metadata(&full_path) {
                Ok(m) => m,
                Err(e) => {
                    return ToolResult {
                        success: false,
                        result: None,
                        error: Some(format!("无法读取文件信息: {}", e)),
                    }
                }
            };

            if metadata.len() > 50 * 1024 {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some("文件超过50KB限制".to_string()),
                }
            }

            match std::fs::read_to_string(&full_path) {
                Ok(content) => ToolResult {
                    success: true,
                    result: Some(json!({
                        "path": path,
                        "content": content
                    })),
                    error: None,
                },
                Err(e) => ToolResult {
                    success: false,
                    result: None,
                    error: Some(format!("读取文件失败: {}", e)),
                },
            }
        })
    }
}
