use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::Mutex;

const MAX_LOG_SIZE: u64 = 5 * 1024 * 1024;
const MAX_BACKUP_COUNT: u32 = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub module: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

pub struct LogService {
    log_dir: Mutex<Option<PathBuf>>,
}

#[allow(dead_code)]
impl LogService {
    pub fn new() -> Self {
        Self {
            log_dir: Mutex::new(None),
        }
    }

    pub fn set_project(&self, project_path: Option<&str>) {
        match self.log_dir.lock() {
            Ok(mut dir) => {
                *dir = project_path.map(|p| {
                    PathBuf::from(p)
                        .join(".novelhelper")
                        .join("logs")
                });
                if let Some(ref d) = *dir {
                    let _ = fs::create_dir_all(d);
                }
            }
            Err(e) => log::error!("获取日志目录锁失败: {}", e),
        }
    }

    fn log_file_path(&self) -> Option<PathBuf> {
        self.log_dir
            .lock()
            .ok()
            .and_then(|dir| dir.as_ref().map(|d| d.join("app.log")))
    }

    fn rotate_if_needed(&self, file_path: &PathBuf) {
        if let Ok(meta) = fs::metadata(file_path) {
            if meta.len() > MAX_LOG_SIZE {
                for i in (1..=MAX_BACKUP_COUNT).rev() {
                    let old = file_path.with_extension(format!("log.{}", i));
                    let new = file_path.with_extension(format!("log.{}", i + 1));
                    if old.exists() {
                        let _ = fs::rename(&old, &new);
                    }
                }
                let backup = file_path.with_extension("log.1");
                let _ = fs::rename(file_path, &backup);
            }
        }
    }

    fn write_entry(&self, entry: &LogEntry) {
        let file_path = match self.log_file_path() {
            Some(p) => p,
            None => return,
        };

        self.rotate_if_needed(&file_path);

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)
        {
            if let Ok(line) = serde_json::to_string(entry) {
                let _ = writeln!(file, "{}", line);
                let _ = file.flush();
            }
        }
    }

    pub fn debug(&self, module: &str, message: &str, details: Option<&str>) {
        log::debug!("[{}] {} {:?}", module, message, details);
        self.write_entry(&LogEntry {
            timestamp: Local::now().format("%Y-%m-%dT%H:%M:%S%.3f").to_string(),
            level: "DEBUG".to_string(),
            module: module.to_string(),
            message: message.to_string(),
            error_code: None,
            details: details.map(|s| s.to_string()),
        });
    }

    pub fn info(&self, module: &str, message: &str) {
        log::info!("[{}] {}", module, message);
        self.write_entry(&LogEntry {
            timestamp: Local::now().format("%Y-%m-%dT%H:%M:%S%.3f").to_string(),
            level: "INFO".to_string(),
            module: module.to_string(),
            message: message.to_string(),
            error_code: None,
            details: None,
        });
    }

    pub fn warn(&self, module: &str, message: &str, error_code: Option<&str>) {
        log::warn!("[{}] [{}] {}", module, error_code.unwrap_or("-"), message);
        self.write_entry(&LogEntry {
            timestamp: Local::now().format("%Y-%m-%dT%H:%M:%S%.3f").to_string(),
            level: "WARN".to_string(),
            module: module.to_string(),
            message: message.to_string(),
            error_code: error_code.map(|s| s.to_string()),
            details: None,
        });
    }

    pub fn error(
        &self,
        module: &str,
        message: &str,
        error_code: Option<&str>,
        details: Option<&str>,
    ) {
        log::error!(
            "[{}] [{}] {} | {}",
            module,
            error_code.unwrap_or("-"),
            message,
            details.unwrap_or("")
        );
        self.write_entry(&LogEntry {
            timestamp: Local::now().format("%Y-%m-%dT%H:%M:%S%.3f").to_string(),
            level: "ERROR".to_string(),
            module: module.to_string(),
            message: message.to_string(),
            error_code: error_code.map(|s| s.to_string()),
            details: details.map(|s| s.to_string()),
        });
    }

    pub fn log_app_error(&self, module: &str, error: &crate::error::AppError) {
        let code = error.code();
        let message = error.to_string();
        self.error(module, &message, Some(code), None);
    }

    pub fn get_recent_logs(&self, n: usize) -> Vec<LogEntry> {
        let file_path = match self.log_file_path() {
            Some(p) => p,
            None => return Vec::new(),
        };

        if !file_path.exists() {
            return Vec::new();
        }

        match File::open(&file_path) {
            Ok(file) => {
                let reader = BufReader::new(file);
                let mut entries: Vec<LogEntry> = reader
                    .lines()
                    .filter_map(|line| line.ok())
                    .filter_map(|line| serde_json::from_str::<LogEntry>(&line).ok())
                    .collect();
                entries.reverse();
                entries.truncate(n);
                entries.reverse();
                entries
            }
            Err(_) => Vec::new(),
        }
    }

    pub fn clear_logs(&self) -> bool {
        let file_path = match self.log_file_path() {
            Some(p) => p,
            None => return false,
        };

        if file_path.exists() {
            fs::remove_file(&file_path).is_ok()
        } else {
            true
        }
    }

    pub fn get_log_path(&self) -> Option<String> {
        self.log_file_path()
            .map(|p| p.to_string_lossy().to_string())
    }
}
