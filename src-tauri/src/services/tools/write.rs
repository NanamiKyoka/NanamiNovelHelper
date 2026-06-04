use crate::services::tool_registry::{Tool, ToolResult};
use crate::services::tools::novel_utils;
use crate::services::tools::resolve_project_file;
use serde_json::json;
use std::future::Future;
use std::pin::Pin;

pub struct WriteTool;

impl WriteTool {
    pub fn new() -> Self {
        Self
    }
}

impl Tool for WriteTool {
    fn name(&self) -> &str {
        "write"
    }

    fn description(&self) -> &str {
        "写入文件内容"
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "相对于项目根的文件路径"
                },
                "content": {
                    "type": "string",
                    "description": "文件内容"
                }
            },
            "required": ["path", "content"]
        })
    }

    fn execute(
        &self,
        params: serde_json::Value,
    ) -> Pin<Box<dyn Future<Output = ToolResult> + Send + '_>> {
        Box::pin(async move {
            let path = params.get("path").and_then(|p| p.as_str()).unwrap_or("");
            let content = params.get("content").and_then(|p| p.as_str()).unwrap_or("");

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

            if let Some(parent) = full_path.parent() {
                if let Err(e) = std::fs::create_dir_all(parent) {
                    return ToolResult {
                        success: false,
                        result: None,
                        error: Some(format!("创建目录失败: {}", e)),
                    }
                }
            }

            let output_content = if path.ends_with(".novel") && !content.contains('<') {
                novel_utils::plain_text_to_html(content)
            } else {
                content.to_string()
            };

            match std::fs::write(&full_path, output_content) {
                Ok(_) => ToolResult {
                    success: true,
                    result: Some(json!({
                        "path": path,
                        "written": true
                    })),
                    error: None,
                },
                Err(e) => ToolResult {
                    success: false,
                    result: None,
                    error: Some(format!("写入文件失败: {}", e)),
                },
            }
        })
    }
}
