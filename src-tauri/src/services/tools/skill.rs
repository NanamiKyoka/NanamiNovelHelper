use crate::services::ai_skill::AiSkillService;
use crate::services::tool_registry::{Tool, ToolResult};
use serde_json::json;
use std::future::Future;
use std::path::Path;
use std::pin::Pin;

pub struct SkillTool;

impl SkillTool {
    pub fn new() -> Self {
        Self
    }

    fn list_adjacent_files(skill_location: &str) -> Vec<String> {
        let path = Path::new(skill_location);
        let dir = match path.parent() {
            Some(d) => d,
            None => return vec![],
        };

        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return vec![],
        };

        let mut files: Vec<String> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                let p = e.path();
                p.is_file()
                    && p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| !n.ends_with(".SKILL.md"))
                        .unwrap_or(true)
            })
            .filter_map(|e| e.file_name().into_string().ok())
            .take(10)
            .collect();

        files.sort();
        files
    }

    fn build_output(skill: &crate::services::ai_skill::AiSkill) -> String {
        let dir = Path::new(&skill.location)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let mut output = format!(
            r#"<skill_content name="{}">
# Skill: {}

{}

Base directory: {}
"#,
            skill.name, skill.name, skill.content.trim(), dir
        );

        let adjacent_files = Self::list_adjacent_files(&skill.location);
        if !adjacent_files.is_empty() {
            output.push_str("\n<skill_files>\n");
            for file in &adjacent_files {
                output.push_str(&format!("<file>{}</file>\n", file));
            }
            output.push_str("</skill_files>\n");
        }

        output.push_str("</skill_content>");
        output
    }
}

impl Tool for SkillTool {
    fn name(&self) -> &str {
        "skill"
    }

    fn description(&self) -> &str {
        "加载一个专业 Skill 到当前对话中。当你需要某个领域的专业能力（如角色一致性检查、情节节奏分析、对话润色等）时，调用此工具并传入 Skill 名称。"
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "要加载的 Skill 名称"
                }
            },
            "required": ["name"]
        })
    }

    fn execute(
        &self,
        params: serde_json::Value,
    ) -> Pin<Box<dyn Future<Output = ToolResult> + Send + '_>> {
        Box::pin(async move {
            let name = params
                .get("name")
                .and_then(|p| p.as_str())
                .unwrap_or("");

            if name.is_empty() {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some("缺少 name 参数".to_string()),
                }
            }

            let service = AiSkillService::new();
            match service.find_skill_by_name(name) {
                Ok(skill) => {
                    let output = Self::build_output(&skill);
                    ToolResult {
                        success: true,
                        result: Some(json!({ "content": output })),
                        error: None,
                    }
                }
                Err(e) => ToolResult {
                    success: false,
                    result: None,
                    error: Some(e.to_string()),
                },
            }
        })
    }
}
