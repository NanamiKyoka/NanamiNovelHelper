use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_id, generate_timestamp, read_json5_file, write_json5_file};
use std::fs;
use std::path::PathBuf;

pub struct AiAssistantService;

impl AiAssistantService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    fn get_ai_dir(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join("ai-assistant")
    }

    fn get_templates_dir(project_path: &str) -> PathBuf {
        Self::get_ai_dir(project_path).join("templates")
    }

    fn get_workflows_dir(project_path: &str) -> PathBuf {
        Self::get_ai_dir(project_path).join("workflows")
    }

    fn get_executions_dir(project_path: &str) -> PathBuf {
        Self::get_ai_dir(project_path).join("executions")
    }

    fn get_sessions_dir(project_path: &str) -> PathBuf {
        Self::get_ai_dir(project_path).join("sessions")
    }

    fn ensure_dirs(project_path: &str) -> AppResult<()> {
        ensure_dir(&Self::get_templates_dir(project_path))?;
        ensure_dir(&Self::get_workflows_dir(project_path))?;
        ensure_dir(&Self::get_executions_dir(project_path))?;
        ensure_dir(&Self::get_sessions_dir(project_path))?;
        Ok(())
    }

    pub fn list_templates(&self) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let templates_dir = Self::get_templates_dir(&project_path);
        Self::read_json5_list(&templates_dir)
    }

    pub fn get_template(&self, id: &str) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_templates_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }
        read_json5_file(&path)
    }

    pub fn create_template(&self, template: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        Self::ensure_dirs(&project_path)?;
        let templates_dir = Self::get_templates_dir(&project_path);

        let id = template
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| generate_id());

        let now = generate_timestamp();
        let mut template = template;
        if let Some(obj) = template.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
            obj.insert(
                "createdAt".to_string(),
                serde_json::Value::String(now.clone()),
            );
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));
        }

        let path = templates_dir.join(format!("{}.json5", id));
        write_json5_file(&path, &template)?;
        Ok(template)
    }

    pub fn update_template(
        &self,
        id: &str,
        updates: serde_json::Value,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_templates_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }

        let mut template: serde_json::Value = read_json5_file(&path)?;
        if let (Some(obj), Some(updates_obj)) = (template.as_object_mut(), updates.as_object()) {
            for (key, value) in updates_obj {
                obj.insert(key.clone(), value.clone());
            }
            obj.insert(
                "updatedAt".to_string(),
                serde_json::Value::String(generate_timestamp()),
            );
        }

        write_json5_file(&path, &template)?;
        Ok(template)
    }

    pub fn delete_template(&self, id: &str) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_templates_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Ok(false);
        }
        fs::remove_file(&path)?;
        Ok(true)
    }

    pub fn list_workflows(&self) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let workflows_dir = Self::get_workflows_dir(&project_path);
        Self::read_json5_list(&workflows_dir)
    }

    pub fn get_workflow(&self, id: &str) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_workflows_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }
        read_json5_file(&path)
    }

    pub fn create_workflow(&self, workflow: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        Self::ensure_dirs(&project_path)?;
        let workflows_dir = Self::get_workflows_dir(&project_path);

        let id = workflow
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| generate_id());

        let now = generate_timestamp();
        let mut workflow = workflow;
        if let Some(obj) = workflow.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
            obj.insert(
                "createdAt".to_string(),
                serde_json::Value::String(now.clone()),
            );
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));
        }

        let path = workflows_dir.join(format!("{}.json5", id));
        write_json5_file(&path, &workflow)?;
        Ok(workflow)
    }

    pub fn update_workflow(
        &self,
        id: &str,
        updates: serde_json::Value,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_workflows_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }

        let mut workflow: serde_json::Value = read_json5_file(&path)?;
        if let (Some(obj), Some(updates_obj)) = (workflow.as_object_mut(), updates.as_object()) {
            for (key, value) in updates_obj {
                obj.insert(key.clone(), value.clone());
            }
            obj.insert(
                "updatedAt".to_string(),
                serde_json::Value::String(generate_timestamp()),
            );
        }

        write_json5_file(&path, &workflow)?;
        Ok(workflow)
    }

    pub fn delete_workflow(&self, id: &str) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_workflows_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Ok(false);
        }
        fs::remove_file(&path)?;
        Ok(true)
    }

    pub fn save_execution(&self, execution: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        Self::ensure_dirs(&project_path)?;
        let executions_dir = Self::get_executions_dir(&project_path);

        let id = execution
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| generate_id());

        let mut execution = execution;
        if let Some(obj) = execution.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
        }

        let path = executions_dir.join(format!("{}.json5", id));
        write_json5_file(&path, &execution)?;
        Ok(execution)
    }

    pub fn list_executions(&self) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let executions_dir = Self::get_executions_dir(&project_path);
        Self::read_json5_list(&executions_dir)
    }

    pub fn delete_execution(&self, id: &str) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_executions_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Ok(false);
        }
        fs::remove_file(&path)?;
        Ok(true)
    }

    pub fn list_sessions(&self) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let sessions_dir = Self::get_sessions_dir(&project_path);
        Self::read_json5_list(&sessions_dir)
    }

    pub fn get_session(&self, id: &str) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_sessions_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }
        read_json5_file(&path)
    }

    pub fn save_session(&self, session: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        Self::ensure_dirs(&project_path)?;
        let sessions_dir = Self::get_sessions_dir(&project_path);

        let id = session
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| generate_id());

        let now = generate_timestamp();
        let mut session = session;
        if let Some(obj) = session.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now.clone()));
            if !obj.contains_key("createdAt") {
                obj.insert("createdAt".to_string(), serde_json::Value::String(now));
            }
        }

        let path = sessions_dir.join(format!("{}.json5", id));
        write_json5_file(&path, &session)?;
        Ok(session)
    }

    pub fn delete_session(&self, id: &str) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_sessions_dir(&project_path).join(format!("{}.json5", id));
        if !path.exists() {
            return Ok(false);
        }
        fs::remove_file(&path)?;
        Ok(true)
    }

    fn read_json5_list(dir: &std::path::Path) -> AppResult<Vec<serde_json::Value>> {
        if !dir.exists() {
            return Ok(Vec::new());
        }

        let mut items = Vec::new();
        let entries = fs::read_dir(dir)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map(|e| e == "json5").unwrap_or(false) {
                if let Ok(value) = read_json5_file::<serde_json::Value>(&path) {
                    items.push(value);
                }
            }
        }

        items.sort_by(|a, b| {
            let a_time = a
                .get("updatedAt")
                .or_else(|| a.get("createdAt"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let b_time = b
                .get("updatedAt")
                .or_else(|| b.get("createdAt"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            b_time.cmp(a_time)
        });

        Ok(items)
    }
}

impl Default for AiAssistantService {
    fn default() -> Self {
        Self::new()
    }
}
