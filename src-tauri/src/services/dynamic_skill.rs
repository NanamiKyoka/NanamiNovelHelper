use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_id, generate_timestamp, read_json5_file, write_json5_file};
use std::fs;
use std::path::PathBuf;

pub struct DynamicSkillService;

impl DynamicSkillService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    fn get_skills_dir(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join("ai-assistant").join("skills")
    }

    pub fn list_skills(&self) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let skills_dir = Self::get_skills_dir(&project_path);

        if !skills_dir.exists() {
            return Ok(Vec::new());
        }

        let mut skills = Vec::new();
        let entries = fs::read_dir(&skills_dir)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let metadata_path = path.join("metadata.json5");
                if metadata_path.exists() {
                    if let Ok(metadata) = read_json5_file::<serde_json::Value>(&metadata_path) {
                        skills.push(metadata);
                    }
                }
            }
        }

        Ok(skills)
    }

    pub fn get_skill(&self, id: &str) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let skill_dir = Self::get_skills_dir(&project_path).join(id);
        if !skill_dir.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }

        let metadata_path = skill_dir.join("metadata.json5");
        let instructions_path = skill_dir.join("instructions.md");

        let mut skill = read_json5_file::<serde_json::Value>(&metadata_path)?;

        if instructions_path.exists() {
            if let Ok(instructions) = fs::read_to_string(&instructions_path) {
                if let Some(obj) = skill.as_object_mut() {
                    obj.insert(
                        "instructions".to_string(),
                        serde_json::Value::String(instructions),
                    );
                }
            }
        }

        Ok(skill)
    }

    pub fn create_skill(&self, skill: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let skills_dir = Self::get_skills_dir(&project_path);
        ensure_dir(&skills_dir)?;

        let id = skill
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| generate_id());

        let skill_dir = skills_dir.join(&id);
        ensure_dir(&skill_dir)?;

        let now = generate_timestamp();
        let mut metadata = skill.clone();
        if let Some(obj) = metadata.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
            obj.insert(
                "createdAt".to_string(),
                serde_json::Value::String(now.clone()),
            );
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));

            if let Some(instructions) = obj.remove("instructions") {
                if let Some(text) = instructions.as_str() {
                    let instructions_path = skill_dir.join("instructions.md");
                    fs::write(&instructions_path, text)?;
                }
            }
        }

        let metadata_path = skill_dir.join("metadata.json5");
        write_json5_file(&metadata_path, &metadata)?;

        Ok(metadata)
    }

    pub fn update_skill(
        &self,
        id: &str,
        updates: serde_json::Value,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let skill_dir = Self::get_skills_dir(&project_path).join(id);
        if !skill_dir.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }

        let metadata_path = skill_dir.join("metadata.json5");
        let mut metadata: serde_json::Value = read_json5_file(&metadata_path)?;

        if let (Some(obj), Some(updates_obj)) = (metadata.as_object_mut(), updates.as_object()) {
            for (key, value) in updates_obj {
                if key == "instructions" {
                    if let Some(text) = value.as_str() {
                        let instructions_path = skill_dir.join("instructions.md");
                        fs::write(&instructions_path, text)?;
                    }
                    continue;
                }
                obj.insert(key.clone(), value.clone());
            }
            obj.insert(
                "updatedAt".to_string(),
                serde_json::Value::String(generate_timestamp()),
            );
        }

        write_json5_file(&metadata_path, &metadata)?;
        Ok(metadata)
    }

    pub fn delete_skill(&self, id: &str) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let skill_dir = Self::get_skills_dir(&project_path).join(id);
        if !skill_dir.exists() {
            return Ok(false);
        }
        fs::remove_dir_all(&skill_dir)?;
        Ok(true)
    }

    pub fn get_skill_instructions(&self, id: &str) -> AppResult<String> {
        let project_path = Self::get_project_path()?;
        let instructions_path = Self::get_skills_dir(&project_path).join(id).join("instructions.md");
        if !instructions_path.exists() {
            return Ok(String::new());
        }
        fs::read_to_string(&instructions_path).map_err(|e| {
            AppError::OperationFailed(format!("读取 SKILL 说明文档失败: {}", e))
        })
    }

    pub fn update_skill_instructions(&self, id: &str, instructions: String) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let skill_dir = Self::get_skills_dir(&project_path).join(id);
        if !skill_dir.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }
        let instructions_path = skill_dir.join("instructions.md");
        fs::write(&instructions_path, &instructions)?;
        Ok(())
    }
}

impl Default for DynamicSkillService {
    fn default() -> Self {
        Self::new()
    }
}
