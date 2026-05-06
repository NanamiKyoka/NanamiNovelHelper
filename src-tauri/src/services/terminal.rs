use crate::error::{AppError, AppResult};
use crate::services::project_state;
use std::collections::HashMap;
use std::sync::Mutex;

pub struct TerminalService {
    instances: Mutex<HashMap<String, TerminalInstance>>,
}

struct TerminalInstance {
    id: String,
    name: String,
    cwd: String,
    exited: bool,
    exit_code: Option<i32>,
}

impl TerminalService {
    pub fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
        }
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    pub fn get_shells(&self) -> Vec<serde_json::Value> {
        let mut shells = Vec::new();

        if cfg!(target_os = "windows") {
            let ps_paths = [
                r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
                r"C:\Program Files\PowerShell\7\pwsh.exe",
                r"C:\Program Files (x86)\PowerShell\7\pwsh.exe",
            ];

            for psh_path in &ps_paths {
                if std::path::Path::new(psh_path).exists() {
                    let is_pwsh = psh_path.contains("PowerShell\\7");
                    shells.push(serde_json::json!({
                        "name": if is_pwsh { "PowerShell 7" } else { "Windows PowerShell" },
                        "path": psh_path,
                        "isDefault": is_pwsh
                    }));
                }
            }

            let git_bash_paths = [
                r"C:\Program Files\Git\bin\bash.exe",
                r"C:\Program Files (x86)\Git\bin\bash.exe",
            ];
            for git_path in &git_bash_paths {
                if std::path::Path::new(git_path).exists() {
                    shells.push(serde_json::json!({
                        "name": "Git Bash",
                        "path": git_path
                    }));
                    break;
                }
            }

            let cmd_path = r"C:\Windows\System32\cmd.exe";
            if std::path::Path::new(cmd_path).exists() {
                shells.push(serde_json::json!({
                    "name": "Command Prompt",
                    "path": cmd_path
                }));
            }
        } else {
            let unix_shells = [
                ("/bin/bash", "Bash"),
                ("/bin/zsh", "Zsh"),
                ("/bin/sh", "Sh"),
                ("/usr/bin/fish", "Fish"),
            ];
            for (path, name) in &unix_shells {
                if std::path::Path::new(path).exists() {
                    shells.push(serde_json::json!({
                        "name": name,
                        "path": path,
                        "isDefault": *path == "/bin/bash"
                    }));
                }
            }
        }

        shells
    }

    pub fn create(
        &self,
        name: Option<String>,
        cwd: Option<String>,
        _shell_path: Option<String>,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path().ok();
        let working_dir = cwd.or(project_path).unwrap_or_default();

        let id = crate::utils::generate_id();
        let term_name = name.unwrap_or_else(|| "Terminal".to_string());

        let instance = TerminalInstance {
            id: id.clone(),
            name: term_name.clone(),
            cwd: working_dir.clone(),
            exited: false,
            exit_code: None,
        };

        {
            let mut instances = self.instances.lock().unwrap();
            instances.insert(id.clone(), instance);
        }

        Ok(serde_json::json!({
            "id": id,
            "name": term_name,
            "pid": 0,
            "cwd": working_dir,
            "exited": false
        }))
    }

    pub fn list(&self) -> AppResult<Vec<serde_json::Value>> {
        let instances = self.instances.lock().unwrap();
        let result: Vec<serde_json::Value> = instances
            .values()
            .map(|inst| {
                serde_json::json!({
                    "id": inst.id,
                    "name": inst.name,
                    "pid": 0,
                    "cwd": inst.cwd,
                    "exited": inst.exited,
                    "exitCode": inst.exit_code
                })
            })
            .collect();
        Ok(result)
    }

    pub fn kill(&self, id: &str) -> AppResult<bool> {
        let mut instances = self.instances.lock().unwrap();
        if let Some(inst) = instances.get_mut(id) {
            inst.exited = true;
            inst.exit_code = Some(0);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn resize(&self, id: &str, _cols: u16, _rows: u16) -> AppResult<()> {
        let instances = self.instances.lock().unwrap();
        if instances.contains_key(id) {
            Ok(())
        } else {
            Err(AppError::InvalidParam(format!("终端实例 {} 不存在", id)))
        }
    }

    pub fn write(&self, id: &str, _data: &str) -> AppResult<()> {
        let instances = self.instances.lock().unwrap();
        if instances.contains_key(id) {
            Ok(())
        } else {
            Err(AppError::InvalidParam(format!("终端实例 {} 不存在", id)))
        }
    }
}

impl Default for TerminalService {
    fn default() -> Self {
        Self::new()
    }
}
