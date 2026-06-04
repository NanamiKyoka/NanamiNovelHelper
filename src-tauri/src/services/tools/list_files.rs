use crate::services::project_state;
use crate::services::tool_registry::{Tool, ToolResult};
use serde_json::json;
use std::future::Future;
use std::path::PathBuf;
use std::pin::Pin;

pub struct ListFilesTool;

impl ListFilesTool {
    pub fn new() -> Self {
        Self
    }
}

impl Tool for ListFilesTool {
    fn name(&self) -> &str {
        "list_files"
    }

    fn description(&self) -> &str {
        "列出项目中的所有 .novel 文件"
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {}
        })
    }

    fn execute(
        &self,
        _params: serde_json::Value,
    ) -> Pin<Box<dyn Future<Output = ToolResult> + Send + '_>> {
        Box::pin(async move {
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
            if !root.exists() {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some("项目路径不存在".to_string()),
                }
            }

            let mut files = Vec::new();
            if let Err(e) = collect_novel_files(&root, &root, &mut files) {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(format!("遍历文件失败: {}", e)),
                }
            }

            ToolResult {
                success: true,
                result: Some(json!({ "files": files })),
                error: None,
            }
        })
    }
}

fn collect_novel_files(
    dir: &std::path::Path,
    root: &std::path::Path,
    files: &mut Vec<String>,
) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            collect_novel_files(&path, root, files)?;
        } else if name.ends_with(".novel") {
            let relative = path
                .strip_prefix(root)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            files.push(relative);
        }
    }
    Ok(())
}
