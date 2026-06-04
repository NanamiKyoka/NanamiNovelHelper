use crate::services::project_state;
use crate::services::tool_registry::{Tool, ToolResult};
use crate::services::tools::novel_utils;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::future::Future;
use std::path::PathBuf;
use std::pin::Pin;

pub struct SearchFilesTool;

impl SearchFilesTool {
    pub fn new() -> Self {
        Self
    }
}

impl Tool for SearchFilesTool {
    fn name(&self) -> &str {
        "search_files"
    }

    fn description(&self) -> &str {
        "在 .novel 文件中搜索关键词"
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "搜索关键词"
                }
            },
            "required": ["keyword"]
        })
    }

    fn execute(
        &self,
        params: serde_json::Value,
    ) -> Pin<Box<dyn Future<Output = ToolResult> + Send + '_>> {
        Box::pin(async move {
            let keyword = params.get("keyword").and_then(|p| p.as_str()).unwrap_or("");
            if keyword.is_empty() {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some("缺少 keyword 参数".to_string()),
                };
            }

            let project_path = match project_state::get_project_path() {
                Some(p) => p,
                None => {
                    return ToolResult {
                        success: false,
                        result: None,
                        error: Some("项目未打开".to_string()),
                    }
                }
            };

            let root = PathBuf::from(&project_path);
            let mut results = Vec::new();

            if let Err(e) = search_in_novel_files(&root, &root, keyword, &mut results) {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(format!("搜索失败: {}", e)),
                };
            }

            ToolResult {
                success: true,
                result: Some(json!({
                    "keyword": keyword,
                    "results": results
                })),
                error: None,
            }
        })
    }
}

#[derive(Serialize, Deserialize)]
struct SearchMatch {
    file: String,
    line: usize,
    line_text: String,
}

fn extract_context(text: &str, keyword: &str, max_chars: usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() <= max_chars {
        return text.to_string();
    }

    if let Some(byte_pos) = text.find(keyword) {
        let char_pos = text[..byte_pos].chars().count();
        let keyword_chars = keyword.chars().count();
        let start = char_pos.saturating_sub(max_chars / 2);
        let end = (char_pos + keyword_chars + max_chars / 2).min(chars.len());
        let mut result: String = chars[start..end].iter().collect();
        if start > 0 {
            result.insert_str(0, "...");
        }
        if end < chars.len() {
            result.push_str("...");
        }
        result
    } else {
        chars.into_iter().take(max_chars).collect::<String>() + "..."
    }
}

fn search_in_novel_files(
    dir: &std::path::Path,
    root: &std::path::Path,
    keyword: &str,
    results: &mut Vec<SearchMatch>,
) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            search_in_novel_files(&path, root, keyword, results)?;
        } else if name.ends_with(".novel") {
            let relative = path
                .strip_prefix(root)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            let content = std::fs::read_to_string(&path).unwrap_or_default();
            let blocks = novel_utils::split_html_blocks(&content);
            for (idx, block) in blocks.iter().enumerate() {
                let text = novel_utils::strip_html_tags(block);
                if text.contains(keyword) {
                    let context = extract_context(&text, keyword, 200);
                    results.push(SearchMatch {
                        file: relative.clone(),
                        line: idx + 1,
                        line_text: context,
                    });
                }
            }
        }
    }
    Ok(())
}
