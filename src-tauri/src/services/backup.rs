use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_timestamp, read_json5_file, write_json5_file};
use base64::Engine;
use std::fs;
use std::path::PathBuf;

pub struct BackupService;

impl BackupService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    fn get_backup_dir(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join("backups")
    }

    fn get_data_dir(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path)
    }

    pub fn create_backup(&self) -> AppResult<String> {
        let project_path = Self::get_project_path()?;
        let backup_dir = Self::get_backup_dir(&project_path);
        ensure_dir(&backup_dir)?;

        let data_dir = Self::get_data_dir(&project_path);
        let timestamp = generate_timestamp();
        let backup_filename = format!("backup_{}.json", timestamp);
        let backup_path = backup_dir.join(&backup_filename);

        let mut backup_data = serde_json::Map::new();
        backup_data.insert(
            "createdAt".to_string(),
            serde_json::Value::String(chrono::Utc::now().to_rfc3339()),
        );
        backup_data.insert(
            "version".to_string(),
            serde_json::Value::String("1.0.0".to_string()),
        );

        let data_files = [
            ("vocabularyTypes", "vocabularies/types.json5"),
            ("vocabularyEntries", "vocabularies/entries.json5"),
            ("sensitiveWords", "vocabularies/sensitive-words.json5"),
            ("highlightConfig", "highlight-config.json5"),
            ("settings", "settings.json5"),
            ("relationshipGraphs", "relationships/graphs.json5"),
            ("timelines", "timelines/timelines.json5"),
            ("sequenceCharts", "sequence-charts/charts.json5"),
            ("organizationGraphs", "organizations/graphs.json5"),
            ("maps", "maps/maps.json5"),
        ];

        for (key, relative_path) in &data_files {
            let file_path = data_dir.join(relative_path);
            if file_path.exists() {
                if let Ok(content) = read_json5_file::<serde_json::Value>(&file_path) {
                    backup_data.insert(key.to_string(), content);
                }
            }
        }

        let json_content = serde_json::to_string_pretty(&backup_data).map_err(|e| {
            AppError::OperationFailed(format!("序列化备份数据失败: {}", e))
        })?;

        let compressed = flate2::write::GzEncoder::new(
            Vec::new(),
            flate2::Compression::default(),
        );
        let mut compressor = compressed;
        use std::io::Write;
        compressor
            .write_all(json_content.as_bytes())
            .map_err(|e| AppError::OperationFailed(format!("压缩备份数据失败: {}", e)))?;
        let compressed_data = compressor
            .finish()
            .map_err(|e| AppError::OperationFailed(format!("完成压缩失败: {}", e)))?;

        fs::write(&backup_path, &compressed_data).map_err(|e| {
            AppError::OperationFailed(format!("写入备份文件失败: {}", e))
        })?;

        self.cleanup_old_backups(&backup_dir)?;

        Ok(backup_filename)
    }

    pub fn list_backups(&self) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let backup_dir = Self::get_backup_dir(&project_path);

        if !backup_dir.exists() {
            return Ok(Vec::new());
        }

        let mut backups = Vec::new();
        let entries = fs::read_dir(&backup_dir).map_err(|e| {
            AppError::OperationFailed(format!("读取备份目录失败: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                AppError::OperationFailed(format!("读取目录条目失败: {}", e))
            })?;

            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                let filename = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let metadata = entry.metadata().map_err(|e| {
                    AppError::OperationFailed(format!("读取文件信息失败: {}", e))
                })?;

                let created = entry
                    .metadata()?
                    .modified()
                    .ok()
                    .map(|t| {
                        let datetime: chrono::DateTime<chrono::Local> = t.into();
                        datetime.to_rfc3339()
                    })
                    .unwrap_or_default();

                backups.push(serde_json::json!({
                    "filename": filename,
                    "createdAt": created,
                    "size": metadata.len()
                }));
            }
        }

        backups.sort_by(|a, b| {
            let a_time = a.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
            let b_time = b.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");
            b_time.cmp(a_time)
        });

        Ok(backups)
    }

    pub fn restore_backup(&self, filename: String) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let backup_dir = Self::get_backup_dir(&project_path);
        let backup_path = backup_dir.join(&filename);

        if !backup_path.exists() {
            return Err(AppError::FileNotFound(filename));
        }

        let compressed_data = fs::read(&backup_path).map_err(|e| {
            AppError::OperationFailed(format!("读取备份文件失败: {}", e))
        })?;

        let mut decoder = flate2::read::GzDecoder::new(&compressed_data[..]);
        let mut json_content = String::new();
        use std::io::Read;
        decoder
            .read_to_string(&mut json_content)
            .map_err(|e| AppError::OperationFailed(format!("解压备份文件失败: {}", e)))?;

        let backup_data: serde_json::Value = serde_json::from_str(&json_content).map_err(|e| {
            AppError::OperationFailed(format!("解析备份数据失败: {}", e))
        })?;

        let data_dir = Self::get_data_dir(&project_path);
        let restore_map = [
            ("vocabularyTypes", "vocabularies/types.json5"),
            ("vocabularyEntries", "vocabularies/entries.json5"),
            ("sensitiveWords", "vocabularies/sensitive-words.json5"),
            ("highlightConfig", "highlight-config.json5"),
            ("settings", "settings.json5"),
            ("relationshipGraphs", "relationships/graphs.json5"),
            ("timelines", "timelines/timelines.json5"),
            ("sequenceCharts", "sequence-charts/charts.json5"),
            ("organizationGraphs", "organizations/graphs.json5"),
            ("maps", "maps/maps.json5"),
        ];

        if let Some(obj) = backup_data.as_object() {
            for (key, relative_path) in &restore_map {
                if let Some(value) = obj.get(*key) {
                    let file_path = data_dir.join(relative_path);
                    if let Some(parent) = file_path.parent() {
                        ensure_dir(parent)?;
                    }
                    write_json5_file(&file_path, value)?;
                }
            }
        }

        Ok(true)
    }

    pub fn delete_backup(&self, filename: String) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let backup_dir = Self::get_backup_dir(&project_path);
        let backup_path = backup_dir.join(&filename);

        if !backup_path.exists() {
            return Ok(false);
        }

        fs::remove_file(&backup_path).map_err(|e| {
            AppError::OperationFailed(format!("删除备份文件失败: {}", e))
        })?;

        Ok(true)
    }

    pub fn export_backup(&self, filename: String) -> AppResult<String> {
        let project_path = Self::get_project_path()?;
        let backup_dir = Self::get_backup_dir(&project_path);
        let backup_path = backup_dir.join(&filename);

        if !backup_path.exists() {
            return Err(AppError::FileNotFound(filename));
        }

        let data = fs::read(&backup_path).map_err(|e| {
            AppError::OperationFailed(format!("读取备份文件失败: {}", e))
        })?;

        let base64 = base64::engine::general_purpose::STANDARD.encode(&data);
        Ok(base64)
    }

    pub fn import_backup(&self, base64_data: String) -> AppResult<String> {
        let project_path = Self::get_project_path()?;
        let backup_dir = Self::get_backup_dir(&project_path);
        ensure_dir(&backup_dir)?;

        let data = base64::engine::general_purpose::STANDARD
            .decode(&base64_data)
            .map_err(|e| AppError::OperationFailed(format!("Base64 解码失败: {}", e)))?;

        let timestamp = generate_timestamp();
        let filename = format!("backup_imported_{}.json", timestamp);
        let backup_path = backup_dir.join(&filename);

        fs::write(&backup_path, &data).map_err(|e| {
            AppError::OperationFailed(format!("写入备份文件失败: {}", e))
        })?;

        Ok(filename)
    }

    pub fn import_backup_from_file(&self, import_path: String) -> AppResult<String> {
        let project_path = Self::get_project_path()?;
        let backup_dir = Self::get_backup_dir(&project_path);
        ensure_dir(&backup_dir)?;

        let source = std::path::Path::new(&import_path);
        if !source.exists() {
            return Err(AppError::FileNotFound(import_path));
        }

        let timestamp = generate_timestamp();
        let filename = format!("backup_imported_{}.json", timestamp);
        let backup_path = backup_dir.join(&filename);

        fs::copy(source, &backup_path).map_err(|e| {
            AppError::OperationFailed(format!("导入备份文件失败: {}", e))
        })?;

        Ok(filename)
    }

    fn cleanup_old_backups(&self, backup_dir: &std::path::Path) -> AppResult<()> {
        let max_count = 10;

        let mut backups: Vec<(String, std::time::SystemTime)> = Vec::new();
        let entries = fs::read_dir(backup_dir).map_err(|e| {
            AppError::OperationFailed(format!("读取备份目录失败: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                AppError::OperationFailed(format!("读取目录条目失败: {}", e))
            })?;

            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                let modified = entry.metadata()?.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                backups.push((filename, modified));
            }
        }

        if backups.len() > max_count {
            backups.sort_by(|a, b| b.1.cmp(&a.1));
            for (filename, _) in backups.iter().skip(max_count) {
                let path = backup_dir.join(filename);
                let _ = fs::remove_file(&path);
            }
        }

        Ok(())
    }
}

impl Default for BackupService {
    fn default() -> Self {
        Self::new()
    }
}
