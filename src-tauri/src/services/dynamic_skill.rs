use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_id, generate_timestamp, read_json5_file, write_json5_file};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tokio::process::Command;

pub struct DynamicSkillService {
    running_processes: Mutex<HashMap<String, tokio::process::Child>>,
}

impl DynamicSkillService {
    pub fn new() -> Self {
        Self {
            running_processes: Mutex::new(HashMap::new()),
        }
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
        ensure_dir(&skill_dir.join("scripts"))?;

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

            if let Some(tools) = obj.remove("tools") {
                if tools.is_array() && !tools.as_array().unwrap().is_empty() {
                    let tools_path = skill_dir.join("tools.json");
                    fs::write(&tools_path, serde_json::to_string_pretty(&tools)?)?;
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
                if key == "tools" {
                    let tools_path = skill_dir.join("tools.json");
                    fs::write(&tools_path, serde_json::to_string_pretty(value)?)?;
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

    fn find_script(scripts_dir: &std::path::Path, tool_id: &str) -> Option<PathBuf> {
        for ext in &["py", "js", "ts"] {
            let script = scripts_dir.join(format!("{}.{}", tool_id, ext));
            if script.exists() {
                return Some(script);
            }
        }
        None
    }

    pub async fn execute_tool(
        &self,
        skill_id: &str,
        tool_id: &str,
        parameters: serde_json::Value,
        context: serde_json::Value,
        app: &tauri::AppHandle,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let skill_dir = Self::get_skills_dir(&project_path).join(skill_id);
        if !skill_dir.exists() {
            return Err(AppError::FileNotFound(skill_id.to_string()));
        }

        let scripts_dir = skill_dir.join("scripts");
        let script_path = Self::find_script(&scripts_dir, tool_id)
            .ok_or_else(|| AppError::FileNotFound(format!("scripts/{}", tool_id)))?;

        let execution_id = format!("{}-{}-{}", skill_id, tool_id, chrono::Utc::now().timestamp_millis());

        let ext = script_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        let (cmd, args) = if ext == "py" {
            ("python".to_string(), vec![script_path.to_string_lossy().to_string()])
        } else {
            ("node".to_string(), vec![script_path.to_string_lossy().to_string()])
        };

        let input_data = serde_json::json!({
            "parameters": parameters,
            "context": context
        });

        let project_path_for_env = project_path.clone();
        let exec_id_for_emit = execution_id.clone();
        let app_for_emit = app.clone();

        let mut child = Command::new(&cmd)
            .args(&args)
            .current_dir(script_path.parent().unwrap_or(&scripts_dir))
            .env("NANAMI_PROJECT_PATH", &project_path_for_env)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| AppError::OperationFailed(format!("启动脚本失败: {}", e)))?;

        if let Some(mut stdin) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            let _ = stdin.write_all(input_data.to_string().as_bytes()).await;
            drop(stdin);
        }

        {
            let mut procs = self.running_processes.lock().unwrap();
            procs.insert(execution_id.clone(), child);
        }

        let exec_id = execution_id.clone();
        let app_handle = app.clone();

        let result = tokio::spawn(async move {
            let child = {
                let mut procs = app_handle.state::<DynamicSkillService>().inner().running_processes.lock().unwrap();
                procs.remove(&exec_id)
            };
            if let Some(mut child) = child {
                let output = child.wait_with_output().await;

                match output {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

                        if output.status.success() {
                            let _ = app_handle.emit(
                                "skill:executionOutput",
                                serde_json::json!({
                                    "executionId": exec_id,
                                    "status": "completed",
                                    "output": stdout,
                                    "exitCode": output.status.code()
                                }),
                            );

                            serde_json::json!({
                                "executionId": exec_id,
                                "status": "completed",
                                "outputLines": stdout.lines().collect::<Vec<_>>(),
                                "exitCode": output.status.code(),
                                "error": if stderr.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(stderr) }
                            })
                        } else {
                            let _ = app_handle.emit(
                                "skill:executionOutput",
                                serde_json::json!({
                                    "executionId": exec_id,
                                    "status": "error",
                                    "error": stderr,
                                    "exitCode": output.status.code()
                                }),
                            );

                            serde_json::json!({
                                "executionId": exec_id,
                                "status": "error",
                                "outputLines": stdout.lines().collect::<Vec<_>>(),
                                "error": stderr,
                                "exitCode": output.status.code()
                            })
                        }
                    }
                    Err(e) => {
                        serde_json::json!({
                            "executionId": exec_id,
                            "status": "error",
                            "error": format!("执行失败: {}", e),
                            "outputLines": []
                        })
                    }
                }
            } else {
                serde_json::json!({
                    "executionId": exec_id,
                    "status": "error",
                    "error": "执行进程未找到",
                    "outputLines": []
                })
            }
        });

        let res = result.await.map_err(|e| AppError::OperationFailed(format!("执行任务失败: {}", e)))?;
        Ok(res)
    }

    pub fn cancel_execution(&self, execution_id: &str) -> AppResult<bool> {
        let mut procs = self.running_processes.lock().unwrap();
        if let Some(child) = procs.remove(execution_id) {
            drop(child);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn check_python(&self) -> serde_json::Value {
        let python_result = std::process::Command::new("python")
            .arg("--version")
            .output();

        match python_result {
            Ok(output) => {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                serde_json::json!({
                    "available": output.status.success(),
                    "version": if output.status.success() { Some(version) } else { None },
                    "path": Some("python")
                })
            }
            Err(_) => {
                let python3_result = std::process::Command::new("python3")
                    .arg("--version")
                    .output();
                match python3_result {
                    Ok(output) => {
                        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        serde_json::json!({
                            "available": output.status.success(),
                            "version": if output.status.success() { Some(version) } else { None },
                            "path": Some("python3")
                        })
                    }
                    Err(_) => serde_json::json!({
                        "available": false
                    }),
                }
            }
        }
    }

    fn get_whitelist_path() -> AppResult<PathBuf> {
        let project_path = Self::get_project_path()?;
        Ok(project_state::get_data_dir(&project_path).join("ai-assistant").join("skill-whitelist.json"))
    }

    fn load_whitelist() -> AppResult<serde_json::Value> {
        let path = Self::get_whitelist_path()?;
        if !path.exists() {
            return Ok(serde_json::json!({
                "entries": [],
                "updatedAt": chrono::Utc::now().to_rfc3339()
            }));
        }
        let content = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).map_err(|e| {
            AppError::OperationFailed(format!("解析白名单配置失败: {}", e))
        })
    }

    fn save_whitelist(config: &serde_json::Value) -> AppResult<()> {
        let path = Self::get_whitelist_path()?;
        if let Some(parent) = path.parent() {
            ensure_dir(parent)?;
        }
        let mut config = config.clone();
        if let Some(obj) = config.as_object_mut() {
            obj.insert("updatedAt".to_string(), serde_json::Value::String(chrono::Utc::now().to_rfc3339()));
        }
        fs::write(&path, serde_json::to_string_pretty(&config)?)
            .map_err(|e| AppError::OperationFailed(format!("保存白名单失败: {}", e)))
    }

    fn calculate_path_hash(dir_path: &std::path::Path) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();

        fn hash_dir(dir: &std::path::Path, hasher: &mut DefaultHasher) {
            if !dir.exists() {
                return;
            }
            let read_dir = match fs::read_dir(dir) {
                Ok(rd) => rd,
                Err(_) => return,
            };
            let mut entries: Vec<_> = read_dir
                .filter_map(|e| e.ok())
                .collect();
            entries.sort_by_key(|e| e.file_name());

            for entry in entries {
                let name = entry.file_name().to_string_lossy().to_string();
                name.hash(hasher);
                let path = entry.path();
                if path.is_dir() {
                    hash_dir(&path, hasher);
                } else if let Ok(content) = fs::read(&path) {
                    content.hash(hasher);
                }
            }
        }

        hash_dir(dir_path, &mut hasher);
        format!("{:016x}", hasher.finish())
    }

    pub fn get_whitelist(&self) -> AppResult<serde_json::Value> {
        let whitelist = Self::load_whitelist()?;
        Ok(whitelist.get("entries").cloned().unwrap_or(serde_json::json!([])))
    }

    pub fn add_to_whitelist(&self, skill_id: String, skill_name: String, skill_path: String) -> AppResult<()> {
        let mut whitelist = Self::load_whitelist()?;
        let entries = whitelist
            .get_mut("entries")
            .and_then(|e| e.as_array_mut())
            .ok_or_else(|| AppError::OperationFailed("白名单格式错误".to_string()))?;

        let path_hash = Self::calculate_path_hash(std::path::Path::new(&skill_path));
        let entry = serde_json::json!({
            "skillId": skill_id,
            "skillName": skill_name,
            "addedAt": chrono::Utc::now().to_rfc3339(),
            "pathHash": path_hash
        });

        if let Some(idx) = entries.iter().position(|e| e.get("skillId").and_then(|v| v.as_str()) == Some(&skill_id)) {
            entries[idx] = entry;
        } else {
            entries.push(entry);
        }

        Self::save_whitelist(&whitelist)
    }

    pub fn remove_from_whitelist(&self, skill_id: String) -> AppResult<()> {
        let mut whitelist = Self::load_whitelist()?;
        if let Some(entries) = whitelist.get_mut("entries").and_then(|e| e.as_array_mut()) {
            entries.retain(|e| e.get("skillId").and_then(|v| v.as_str()) != Some(&skill_id));
        }
        Self::save_whitelist(&whitelist)
    }

    pub fn is_trusted(&self, skill_id: String, skill_path: String) -> AppResult<bool> {
        let whitelist = Self::load_whitelist()?;
        let empty_entries = Vec::new();
        let entries = whitelist.get("entries").and_then(|e| e.as_array()).unwrap_or(&empty_entries);

        let entry = entries.iter().find(|e| e.get("skillId").and_then(|v| v.as_str()) == Some(&skill_id));
        if let Some(entry) = entry {
            let stored_hash = entry.get("pathHash").and_then(|v| v.as_str()).unwrap_or("");
            let current_hash = Self::calculate_path_hash(std::path::Path::new(&skill_path));
            Ok(stored_hash == current_hash)
        } else {
            Ok(false)
        }
    }

    pub fn reload_skills(&self) -> AppResult<Vec<serde_json::Value>> {
        self.list_skills()
    }
}

impl Default for DynamicSkillService {
    fn default() -> Self {
        Self::new()
    }
}
