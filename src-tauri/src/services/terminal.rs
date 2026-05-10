use crate::error::{AppError, AppResult};
use crate::services::project_state;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

struct PtyInstance {
    writer: Box<dyn Write + Send>,
    exited: Arc<Mutex<bool>>,
    exit_code: Arc<Mutex<Option<i32>>>,
}

pub struct TerminalService {
    instances: Mutex<HashMap<String, PtyInstance>>,
    metas: Mutex<HashMap<String, TerminalMeta>>,
}

struct TerminalMeta {
    id: String,
    name: String,
    cwd: String,
    pid: u32,
}

impl TerminalService {
    pub fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
            metas: Mutex::new(HashMap::new()),
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
        shell_path: Option<String>,
        app: &tauri::AppHandle,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path().ok();
        let working_dir = cwd.or(project_path).unwrap_or_default();

        let id = crate::utils::generate_id();
        let term_name = name.unwrap_or_else(|| "Terminal".to_string());

        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::OperationFailed(format!("创建 PTY 失败: {}", e)))?;

        let shell = shell_path.unwrap_or_else(|| {
            if cfg!(target_os = "windows") {
                r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe".to_string()
            } else {
                "/bin/bash".to_string()
            }
        });

        let mut cmd = CommandBuilder::new(&shell);
        if !working_dir.is_empty() {
            cmd.cwd(&working_dir);
        }

        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| AppError::OperationFailed(format!("启动 Shell 失败: {}", e)))?;

        drop(pair.slave);

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| AppError::OperationFailed(format!("获取 PTY 读取器失败: {}", e)))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| AppError::OperationFailed(format!("获取 PTY 写入器失败: {}", e)))?;

        let pid = child.process_id().unwrap_or(0);

        let exited = Arc::new(Mutex::new(false));
        let exit_code = Arc::new(Mutex::new(None::<i32>));

        let exited_clone = exited.clone();
        let exit_code_clone = exit_code.clone();
        let term_id = id.clone();
        let app_clone = app.clone();

        std::thread::spawn(move || {
            let exit_status = child.wait();
            if let Ok(ref status) = exit_status {
                if let Ok(mut ec) = exit_code_clone.lock() {
                    *ec = Some(status.exit_code() as i32);
                }
            }
            if let Ok(mut ex) = exited_clone.lock() {
                *ex = true;
            }
            let exit_code_val = exit_status.ok().map(|s| s.exit_code());
            let _ = app_clone.emit("terminal:exit", serde_json::json!({
                "id": term_id,
                "exitCode": exit_code_val
            }));
        });

        let term_id_for_reader = id.clone();
        let app_for_reader = app.clone();
        std::thread::spawn(move || {
            let mut reader = BufReader::new(reader);
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]);
                        let _ = app_for_reader.emit(
                            "terminal:data",
                            serde_json::json!({
                                "id": term_id_for_reader,
                                "data": data.to_string()
                            }),
                        );
                    }
                    Err(_) => break,
                }
            }
        });

        {
            let mut instances = self.instances.lock().unwrap();
            instances.insert(
                id.clone(),
                PtyInstance {
                    writer,
                    exited,
                    exit_code,
                },
            );
        }

        {
            let mut metas = self.metas.lock().unwrap();
            metas.insert(
                id.clone(),
                TerminalMeta {
                    id: id.clone(),
                    name: term_name.clone(),
                    cwd: working_dir.clone(),
                    pid,
                },
            );
        }

        Ok(serde_json::json!({
            "id": id,
            "name": term_name,
            "pid": pid,
            "cwd": working_dir,
            "exited": false
        }))
    }

    pub fn list(&self) -> AppResult<Vec<serde_json::Value>> {
        let metas = self.metas.lock().unwrap();
        let instances = self.instances.lock().unwrap();
        let result: Vec<serde_json::Value> = metas
            .values()
            .map(|meta| {
                let (exited, exit_code) = instances
                    .get(&meta.id)
                    .map(|inst| {
                        let ex = *inst.exited.lock().unwrap();
                        let ec = *inst.exit_code.lock().unwrap();
                        (ex, ec)
                    })
                    .unwrap_or((true, None));
                serde_json::json!({
                    "id": meta.id,
                    "name": meta.name,
                    "pid": meta.pid,
                    "cwd": meta.cwd,
                    "exited": exited,
                    "exitCode": exit_code
                })
            })
            .collect();
        Ok(result)
    }

    pub fn kill(&self, id: &str) -> AppResult<bool> {
        let mut instances = self.instances.lock().unwrap();
        if let Some(inst) = instances.remove(id) {
            let _ = inst.writer;
            let mut ex = inst.exited.lock().unwrap();
            *ex = true;
            let mut ec = inst.exit_code.lock().unwrap();
            *ec = Some(0);
            drop(instances);

            let mut metas = self.metas.lock().unwrap();
            metas.remove(id);
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

    pub fn write(&self, id: &str, data: &str) -> AppResult<()> {
        let mut instances = self.instances.lock().unwrap();
        if let Some(inst) = instances.get_mut(id) {
            inst.writer
                .write_all(data.as_bytes())
                .map_err(|e| AppError::OperationFailed(format!("写入终端失败: {}", e)))?;
            inst.writer
                .flush()
                .map_err(|e| AppError::OperationFailed(format!("刷新终端失败: {}", e)))?;
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
