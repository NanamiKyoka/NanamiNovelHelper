use crate::services::tool_registry::{Tool, ToolResult};
use crate::services::tools::novel_utils;
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
        "读取项目中的文件内容，限制50KB。对于.novel文件默认只返回前50个段落，可指定offset和limit分页读取"
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "相对于项目根的路径"
                },
                "offset": {
                    "type": "integer",
                    "description": "起始段落索引（从0开始），仅对.novel文件有效"
                },
                "limit": {
                    "type": "integer",
                    "description": "返回段落数量，仅对.novel文件有效"
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
                };
            }

            let offset = params
                .get("offset")
                .and_then(|p| p.as_u64())
                .unwrap_or(0) as usize;
            let limit = params
                .get("limit")
                .and_then(|p| p.as_u64())
                .unwrap_or(0) as usize;

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
                };
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
                };
            }

            match std::fs::read_to_string(&full_path) {
                Ok(content) => {
                    if path.ends_with(".novel") {
                        let blocks = novel_utils::split_html_blocks(&content);
                        let total_blocks = blocks.len();
                        let effective_limit = if limit > 0 { limit } else { 50 };
                        let end = (offset + effective_limit).min(total_blocks);
                        let has_more = end < total_blocks;

                        let selected: Vec<String> = blocks[offset..end]
                            .iter()
                            .map(|b| novel_utils::strip_html_tags(b))
                            .filter(|t| !t.is_empty())
                            .collect();

                        let output_content = selected.join("\n\n");
                        ToolResult {
                            success: true,
                            result: Some(json!({
                                "path": path,
                                "content": output_content,
                                "total_blocks": total_blocks,
                                "offset": offset,
                                "returned_blocks": selected.len(),
                                "has_more": has_more
                            })),
                            error: None,
                        }
                    } else {
                        ToolResult {
                            success: true,
                            result: Some(json!({
                                "path": path,
                                "content": content
                            })),
                            error: None,
                        }
                    }
                }
                Err(e) => ToolResult {
                    success: false,
                    result: None,
                    error: Some(format!("读取文件失败: {}", e)),
                },
            }
        })
    }
}
