use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::ensure_dir;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSkill {
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub content: String,
    pub source: String,
    pub enabled: bool,
    pub location: String,
    pub is_built_in: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSkillMatchResult {
    pub skill: AiSkill,
    pub score: u32,
}

pub struct AiSkillService;

impl AiSkillService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    fn get_project_skills_dir(project_path: &str) -> PathBuf {
        PathBuf::from(project_path).join(".novelhelper").join("skills")
    }

    fn get_global_skills_dir() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("NanamiNovelHelper")
            .join("skills")
    }

    pub fn discover_skills(&self) -> AppResult<Vec<AiSkill>> {
        let project_path = Self::get_project_path()?;
        let mut skills = Vec::new();

        let global_dir = Self::get_global_skills_dir();
        if global_dir.exists() {
            Self::scan_skill_dir(&global_dir, "global", &mut skills)?;
        }

        let project_dir = Self::get_project_skills_dir(&project_path);
        if project_dir.exists() {
            Self::scan_skill_dir(&project_dir, "project", &mut skills)?;
        }

        Ok(skills)
    }

    fn scan_skill_dir(
        dir: &Path,
        source: &str,
        skills: &mut Vec<AiSkill>,
    ) -> AppResult<()> {
        let entries = fs::read_dir(dir)?;
        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md")
                && path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .map(|s| s.ends_with(".SKILL"))
                    .unwrap_or(false)
            {
                if let Ok(skill) = Self::load_skill_from_path(&path, source) {
                    skills.push(skill);
                }
            }
        }
        Ok(())
    }

    pub fn load_skill_content(&self, location: &str) -> AppResult<AiSkill> {
        let path = PathBuf::from(location);
        if !path.exists() {
            return Err(AppError::FileNotFound(location.to_string()));
        }
        let source = if location.contains(".novelhelper") {
            "project"
        } else {
            "global"
        };
        Self::load_skill_from_path(&path, source)
    }

    fn load_skill_from_path(path: &Path, source: &str) -> AppResult<AiSkill> {
        let content = fs::read_to_string(path)?;
        let location = path.to_string_lossy().to_string();
        Self::parse_skill(&content, source, &location)
    }

    fn parse_skill(content: &str, source: &str, location: &str) -> AppResult<AiSkill> {
        let re = Regex::new(r"^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$").map_err(|e| {
            AppError::OperationFailed(format!("正则表达式错误: {}", e))
        })?;

        let (frontmatter, body) = if let Some(caps) = re.captures(content) {
            let fm = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let b = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            (fm, b.trim().to_string())
        } else {
            ("", content.trim().to_string())
        };

        let mut name = String::new();
        let mut description = String::new();
        let mut tags = Vec::new();

        for line in frontmatter.lines() {
            if let Some((key, value)) = line.split_once(':') {
                let key = key.trim();
                let value = value.trim();
                match key {
                    "name" => name = value.to_string(),
                    "description" => description = value.to_string(),
                    "tags" => {
                        tags = Self::parse_tags(value);
                    }
                    _ => {}
                }
            }
        }

        if name.is_empty() {
            name = Path::new(location)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .replace(".SKILL", "");
        }

        let is_built_in = matches!(
            name.as_str(),
            "consistency-check" | "pacing-analysis" | "dialogue-polish"
        );

        Ok(AiSkill {
            name,
            description,
            tags,
            content: body,
            source: source.to_string(),
            enabled: true,
            location: location.to_string(),
            is_built_in,
        })
    }

    fn parse_tags(value: &str) -> Vec<String> {
        let value = value.trim();
        if value.starts_with('[') && value.ends_with(']') {
            value[1..value.len() - 1]
                .split(',')
                .map(|s| s.trim().trim_matches('"').trim_matches('\'').to_string())
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            value
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        }
    }

    pub fn find_skill_by_name(&self, name: &str) -> AppResult<AiSkill> {
        let skills = self.discover_skills()?;
        let name_lower = name.to_lowercase();
        let found = skills
            .iter()
            .find(|s| s.name.to_lowercase() == name_lower && s.enabled)
            .cloned();
        found.ok_or_else(|| {
            AppError::OperationFailed(format!(
                "Skill '{}' 未找到。可用 Skill: {}",
                name,
                skills
                    .iter()
                    .filter(|s| s.enabled)
                    .map(|s| s.name.clone())
                    .collect::<Vec<_>>()
                    .join(", ")
            ))
        })
    }

    pub fn match_skills(&self, user_intent: &str, skills: &[AiSkill]) -> Vec<AiSkillMatchResult> {
        let intent_words: HashSet<String> = Self::tokenize(user_intent);
        let mut results: Vec<AiSkillMatchResult> = skills
            .iter()
            .filter(|s| s.enabled)
            .map(|skill| {
                let desc_words: HashSet<String> = Self::tokenize(&skill.description);
                let score = intent_words.intersection(&desc_words).count() as u32;
                AiSkillMatchResult {
                    skill: skill.clone(),
                    score,
                }
            })
            .filter(|r| r.score > 0)
            .collect();

        results.sort_by(|a, b| b.score.cmp(&a.score));
        results.truncate(3);
        results
    }

    fn tokenize(text: &str) -> HashSet<String> {
        text.to_lowercase()
            .split(|c: char| !c.is_alphanumeric() && !('\u{4e00}'..='\u{9fff}').contains(&c))
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty())
            .collect()
    }

    pub fn save_skill(
        &self,
        name: &str,
        description: &str,
        tags: Vec<String>,
        content: &str,
    ) -> AppResult<AiSkill> {
        let project_path = Self::get_project_path()?;
        let skills_dir = Self::get_project_skills_dir(&project_path);
        ensure_dir(&skills_dir)?;

        let filename = format!("{}.SKILL.md", name);
        let path = skills_dir.join(&filename);

        let tags_str = tags
            .iter()
            .map(|t| format!("'{}'", t))
            .collect::<Vec<_>>()
            .join(", ");
        let full_content = format!(
            "---\nname: {}\ndescription: {}\ntags: [{}]\n---\n{}",
            name, description, tags_str, content
        );
        fs::write(&path, full_content)?;

        Self::load_skill_from_path(&path, "project")
    }

    pub fn delete_skill(&self, name: &str) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let skills_dir = Self::get_project_skills_dir(&project_path);
        let filename = format!("{}.SKILL.md", name);
        let path = skills_dir.join(&filename);

        if path.exists() {
            fs::remove_file(&path)?;
        }
        Ok(())
    }

    pub fn ensure_builtin_skills(&self) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let skills_dir = Self::get_project_skills_dir(&project_path);

        if skills_dir.exists() {
            let entries = fs::read_dir(&skills_dir)?;
            let has_skills = entries.filter_map(|e| e.ok()).any(|e| {
                e.path()
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext == "md")
                    .unwrap_or(false)
            });
            if has_skills {
                return Ok(());
            }
        }

        ensure_dir(&skills_dir)?;

        Self::write_builtin_skill(
            &skills_dir,
            "consistency-check.SKILL.md",
            "consistency-check",
            "检查全文角色设定一致性，发现前后矛盾之处",
            &["consistency", "character"],
            BUILTIN_CONSISTENCY_CHECK,
        )?;

        Self::write_builtin_skill(
            &skills_dir,
            "pacing-analysis.SKILL.md",
            "pacing-analysis",
            "分析小说情节节奏，指出拖沓或过快之处",
            &["pacing", "plot"],
            BUILTIN_PACING_ANALYSIS,
        )?;

        Self::write_builtin_skill(
            &skills_dir,
            "dialogue-polish.SKILL.md",
            "dialogue-polish",
            "润色对话，使其更自然、更有角色辨识度",
            &["dialogue", "polish"],
            BUILTIN_DIALOGUE_POLISH,
        )?;

        Ok(())
    }

    fn write_builtin_skill(
        dir: &Path,
        filename: &str,
        name: &str,
        description: &str,
        tags: &[&str],
        content: &str,
    ) -> AppResult<()> {
        let path = dir.join(filename);
        let tags_str = tags
            .iter()
            .map(|t| format!("'{}'", t))
            .collect::<Vec<_>>()
            .join(", ");
        let full_content = format!(
            "---\nname: {}\ndescription: {}\ntags: [{}]\n---\n{}",
            name, description, tags_str, content
        );
        fs::write(&path, full_content)?;
        Ok(())
    }
}

impl Default for AiSkillService {
    fn default() -> Self {
        Self::new()
    }
}

const BUILTIN_CONSISTENCY_CHECK: &str = r"# 角色一致性检查

你是一个专业的小说编辑。请逐章检查以下角色的设定是否一致：
- 外貌描写
- 性格特征
- 能力/技能
- 人际关系

如果发现矛盾，请引用原文并给出修改建议。
";

const BUILTIN_PACING_ANALYSIS: &str = r"# 情节节奏分析

你是一个资深小说节奏分析师。请分析以下内容的情节节奏：
- 是否存在过长的铺垫或说明
- 高潮是否来得太突然或太拖沓
- 章节之间的过渡是否流畅

给出具体的改进建议。
";

const BUILTIN_DIALOGUE_POLISH: &str = r"# 对话润色

你是一个对话写作专家。请润色以下对话：
- 让对话更符合角色身份和性格
- 减少不必要的对话标签
- 增加潜台词和情感层次
- 避免过于直白的 exposition
";
