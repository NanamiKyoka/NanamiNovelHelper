use crate::services::editor_state;
use crate::services::tool_registry::{Tool, ToolResult};
use crate::services::tools::novel_utils;
use crate::services::tools::resolve_project_file;
use serde_json::json;
use std::future::Future;
use std::pin::Pin;

pub struct EditTool;

impl EditTool {
    pub fn new() -> Self {
        Self
    }
}

impl Tool for EditTool {
    fn name(&self) -> &str {
        "edit"
    }

    fn description(&self) -> &str {
        "在编辑器当前内容中替换文本（替换第一次出现）"
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "要编辑的文件路径（相对于项目根目录），不提供则编辑当前打开的文件"
                },
                "old_string": {
                    "type": "string",
                    "description": "要替换的旧文本"
                },
                "new_string": {
                    "type": "string",
                    "description": "替换后的新文本"
                }
            },
            "required": ["old_string", "new_string"]
        })
    }

    fn execute(
        &self,
        params: serde_json::Value,
    ) -> Pin<Box<dyn Future<Output = ToolResult> + Send + '_>> {
        Box::pin(async move {
            let old_string = params
                .get("old_string")
                .and_then(|p| p.as_str())
                .unwrap_or("");
            let new_string = params
                .get("new_string")
                .and_then(|p| p.as_str())
                .unwrap_or("");
            let path_param = params
                .get("path")
                .and_then(|p| p.as_str())
                .unwrap_or("");

            if old_string.is_empty() {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some("old_string 不能为空".to_string()),
                }
            }

            let file_path = if !path_param.is_empty() {
                path_param.to_string()
            } else {
                match editor_state::get_current_file() {
                    Some(p) => p,
                    None => {
                        return ToolResult {
                            success: false,
                            result: None,
                            error: Some("没有打开的编辑器文件，请提供 path 参数".to_string()),
                        }
                    }
                }
            };

            let full_path = match resolve_project_file(&file_path) {
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
                    error: Some(format!("文件不存在: {}", file_path)),
                }
            }

            let content = match std::fs::read_to_string(&full_path) {
                Ok(c) => c,
                Err(e) => {
                    return ToolResult {
                        success: false,
                        result: None,
                        error: Some(format!("读取文件失败: {}", e)),
                    }
                }
            };

            let new_content = if file_path.ends_with(".novel") {
                match novel_utils::edit_novel_html(&content, old_string, new_string) {
                    Some(c) => c,
                    None => {
                        return ToolResult {
                            success: false,
                            result: None,
                            error: Some("未找到指定的旧文本".to_string()),
                        }
                    }
                }
            } else {
                if !content.contains(old_string) {
                    return ToolResult {
                        success: false,
                        result: None,
                        error: Some("未找到指定的旧文本".to_string()),
                    }
                }
                content.replacen(old_string, new_string, 1)
            };

            let (original_out, modified_out, full_modified) = if file_path.ends_with(".novel") {
                let block_idx = novel_utils::find_first_diff_block(&content, &new_content)
                    .unwrap_or(0);
                let original_ctx = novel_utils::extract_block_context(&content, block_idx, 2);
                let modified_ctx = novel_utils::extract_block_context(&new_content, block_idx, 2);
                (original_ctx, modified_ctx, new_content)
            } else {
                let c = content.clone();
                let n = new_content.clone();
                (c.clone(), n.clone(), n)
            };

            ToolResult {
                success: true,
                result: Some(json!({
                    "path": file_path,
                    "replaced": true,
                    "original": original_out,
                    "modified": modified_out,
                    "full_modified": full_modified
                })),
                error: None,
            }
        })
    }
}
