use crate::error::{AppError, AppResult};
use crate::models::*;
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_id, generate_timestamp, read_json5_file, write_json5_file};
use std::fs;
use std::path::PathBuf;

pub struct VocabularyService;

impl VocabularyService {
    pub fn new() -> Self {
        Self
    }

    fn get_vocabulary_dir(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join("vocabularies")
    }

    fn get_types_path(project_path: &str) -> PathBuf {
        Self::get_vocabulary_dir(project_path).join("types.json5")
    }

    fn get_entries_path(project_path: &str, type_id: &str) -> PathBuf {
        Self::get_vocabulary_dir(project_path).join(format!("{}.json5", type_id))
    }

    fn get_sensitive_words_path(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join("sensitive-words.json5")
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    pub fn load_vocabulary_types(&self) -> AppResult<Vec<VocabularyType>> {
        let project_path = Self::get_project_path()?;
        let types_path = Self::get_types_path(&project_path);
        Ok(read_json5_file(&types_path).unwrap_or_default())
    }

    pub fn save_vocabulary_types(&self, types: Vec<VocabularyType>) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let types_path = Self::get_types_path(&project_path);
        write_json5_file(&types_path, &types)
    }

    pub fn add_vocabulary_type(&self, name: String, color: String, is_built_in: bool, description: Option<String>, icon: Option<String>, fields: Option<Vec<serde_json::Value>>, table_config: Option<Vec<serde_json::Value>>) -> AppResult<VocabularyType> {
        let mut types = self.load_vocabulary_types()?;
        let now = generate_timestamp();
        let new_type = VocabularyType {
            base: BaseEntity {
                id: generate_id(),
                created_at: now.clone(),
                updated_at: now,
            },
            name,
            icon,
            color,
            is_built_in,
            fields: fields.unwrap_or_default(),
            table_config: table_config.unwrap_or_default(),
            order: types.len() as i32,
            description,
        };
        types.push(new_type.clone());
        self.save_vocabulary_types(types)?;
        Ok(new_type)
    }

    pub fn update_vocabulary_type(&self, id: String, updates: serde_json::Value) -> AppResult<Option<VocabularyType>> {
        let mut types = self.load_vocabulary_types()?;
        let index = types.iter().position(|t| t.base.id == id);
        if let Some(idx) = index {
            let now = generate_timestamp();
            if let Some(name) = updates.get("name").and_then(|v| v.as_str()) {
                types[idx].name = name.to_string();
            }
            if let Some(icon) = updates.get("icon").and_then(|v| v.as_str()) {
                types[idx].icon = Some(icon.to_string());
            }
            if let Some(color) = updates.get("color").and_then(|v| v.as_str()) {
                types[idx].color = color.to_string();
            }
            if let Some(fields) = updates.get("fields").and_then(|v| v.as_array()) {
                types[idx].fields = fields.clone();
            }
            if let Some(table_config) = updates.get("tableConfig").and_then(|v| v.as_array()) {
                types[idx].table_config = table_config.clone();
            }
            if let Some(desc) = updates.get("description").and_then(|v| v.as_str()) {
                types[idx].description = Some(desc.to_string());
            }
            types[idx].base.updated_at = now;
            let updated = types[idx].clone();
            self.save_vocabulary_types(types)?;
            Ok(Some(updated))
        } else {
            Ok(None)
        }
    }

    pub fn delete_vocabulary_type(&self, id: String) -> AppResult<bool> {
        let mut types = self.load_vocabulary_types()?;
        let index = types.iter().position(|t| t.base.id == id);
        if let Some(idx) = index {
            types.remove(idx);
            self.save_vocabulary_types(types)?;
            let project_path = Self::get_project_path()?;
            let entries_path = Self::get_entries_path(&project_path, &id);
            let _ = fs::remove_file(entries_path);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn load_vocabulary_entries(&self, type_id: Option<String>) -> AppResult<Vec<VocabularyEntry>> {
        let project_path = Self::get_project_path()?;
        if let Some(tid) = type_id {
            let entries_path = Self::get_entries_path(&project_path, &tid);
            Ok(read_json5_file(&entries_path).unwrap_or_default())
        } else {
            let types = self.load_vocabulary_types()?;
            let mut all_entries = Vec::new();
            for t in types {
                let entries_path = Self::get_entries_path(&project_path, &t.base.id);
                let entries: Vec<VocabularyEntry> = read_json5_file(&entries_path).unwrap_or_default();
                all_entries.extend(entries);
            }
            Ok(all_entries)
        }
    }

    pub fn save_vocabulary_entries(&self, type_id: String, entries: Vec<VocabularyEntry>) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let entries_path = Self::get_entries_path(&project_path, &type_id);
        write_json5_file(&entries_path, &entries)
    }

    pub fn add_vocabulary_entry(&self, entry: serde_json::Value) -> AppResult<VocabularyEntry> {
        let type_id = entry.get("typeId").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let mut entries = self.load_vocabulary_entries(Some(type_id.clone()))?;
        let now = generate_timestamp();
        let id = generate_id();
        let new_entry = VocabularyEntry {
            base: BaseEntity {
                id: id.clone(),
                created_at: now.clone(),
                updated_at: now.clone(),
            },
            name: entry.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            type_id: type_id.clone(),
            type_name: entry.get("typeName").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            order: entries.len() as i32,
            color: entry.get("color").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            fields: entry.get("fields").cloned().unwrap_or(serde_json::Value::Object(serde_json::Map::new())),
            starred: entry.get("starred").and_then(|v| v.as_bool()).unwrap_or(false),
            description: entry.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
            linked_file_path: entry.get("linkedFilePath").and_then(|v| v.as_str()).map(|s| s.to_string()),
            aliases: entry.get("aliases")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default(),
            tags: entry.get("tags")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default(),
        };
        entries.push(new_entry.clone());
        self.save_vocabulary_entries(type_id, entries)?;
        Ok(new_entry)
    }

    pub fn update_vocabulary_entry(&self, id: String, updates: serde_json::Value) -> AppResult<Option<VocabularyEntry>> {
        let all_entries = self.load_vocabulary_entries(None)?;
        let existing = all_entries.iter().find(|e| e.base.id == id);
        if let Some(existing_entry) = existing {
            let type_id = existing_entry.type_id.clone();
            let mut entries = self.load_vocabulary_entries(Some(type_id.clone()))?;
            if let Some(idx) = entries.iter().position(|e| e.base.id == id) {
                let now = generate_timestamp();
                if let Some(name) = updates.get("name").and_then(|v| v.as_str()) {
                    entries[idx].name = name.to_string();
                }
                if let Some(color) = updates.get("color").and_then(|v| v.as_str()) {
                    entries[idx].color = color.to_string();
                }
                if let Some(fields) = updates.get("fields") {
                    entries[idx].fields = fields.clone();
                }
                if let Some(aliases) = updates.get("aliases").and_then(|v| v.as_array()) {
                    entries[idx].aliases = aliases.iter().filter_map(|v| v.as_str().map(String::from)).collect();
                }
                if let Some(tags) = updates.get("tags").and_then(|v| v.as_array()) {
                    entries[idx].tags = tags.iter().filter_map(|v| v.as_str().map(String::from)).collect();
                }
                if let Some(starred) = updates.get("starred").and_then(|v| v.as_bool()) {
                    entries[idx].starred = starred;
                }
                if let Some(desc) = updates.get("description").and_then(|v| v.as_str()) {
                    entries[idx].description = Some(desc.to_string());
                }
                if let Some(linked) = updates.get("linkedFilePath").and_then(|v| v.as_str()) {
                    entries[idx].linked_file_path = Some(linked.to_string());
                }
                entries[idx].base.updated_at = now;
                let updated = entries[idx].clone();
                self.save_vocabulary_entries(type_id, entries)?;
                Ok(Some(updated))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    pub fn delete_vocabulary_entry(&self, id: String) -> AppResult<bool> {
        let all_entries = self.load_vocabulary_entries(None)?;
        let existing = all_entries.iter().find(|e| e.base.id == id);
        if let Some(existing_entry) = existing {
            let type_id = existing_entry.type_id.clone();
            let mut entries = self.load_vocabulary_entries(Some(type_id.clone()))?;
            if let Some(idx) = entries.iter().position(|e| e.base.id == id) {
                entries.remove(idx);
                self.save_vocabulary_entries(type_id, entries)?;
                Ok(true)
            } else {
                Ok(false)
            }
        } else {
            Ok(false)
        }
    }

    pub fn load_sensitive_words(&self) -> AppResult<Vec<SensitiveWord>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_sensitive_words_path(&project_path);
        Ok(read_json5_file(&path).unwrap_or_default())
    }

    pub fn save_sensitive_words(&self, words: Vec<SensitiveWord>) -> AppResult<()> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_sensitive_words_path(&project_path);
        write_json5_file(&path, &words)
    }

    pub fn add_sensitive_word(&self, word: serde_json::Value) -> AppResult<SensitiveWord> {
        let mut words = self.load_sensitive_words()?;
        let now = generate_timestamp();
        let id = generate_id();
        let new_word = SensitiveWord {
            base: BaseEntity {
                id: id.clone(),
                created_at: now.clone(),
                updated_at: now.clone(),
            },
            name: word.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            order: words.len() as i32,
            level: word.get("level").and_then(|v| v.as_str()).map(|s| s.to_string()),
            category: word.get("category").and_then(|v| v.as_str()).map(|s| s.to_string()),
            description: word.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
        };
        words.push(new_word.clone());
        self.save_sensitive_words(words)?;
        Ok(new_word)
    }

    pub fn update_sensitive_word(&self, id: String, updates: serde_json::Value) -> AppResult<Option<SensitiveWord>> {
        let mut words = self.load_sensitive_words()?;
        if let Some(idx) = words.iter().position(|w| w.base.id == id) {
            let now = generate_timestamp();
            if let Some(name) = updates.get("name").and_then(|v| v.as_str()) {
                words[idx].name = name.to_string();
            }
            if let Some(level) = updates.get("level").and_then(|v| v.as_str()) {
                words[idx].level = Some(level.to_string());
            }
            if let Some(category) = updates.get("category").and_then(|v| v.as_str()) {
                words[idx].category = Some(category.to_string());
            }
            if let Some(desc) = updates.get("description").and_then(|v| v.as_str()) {
                words[idx].description = Some(desc.to_string());
            }
            words[idx].base.updated_at = now;
            let updated = words[idx].clone();
            self.save_sensitive_words(words)?;
            Ok(Some(updated))
        } else {
            Ok(None)
        }
    }

    pub fn delete_sensitive_word(&self, id: String) -> AppResult<bool> {
        let mut words = self.load_sensitive_words()?;
        if let Some(idx) = words.iter().position(|w| w.base.id == id) {
            words.remove(idx);
            self.save_sensitive_words(words)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn create_linked_file(&self, entry: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = project_state::get_project_path().ok_or(AppError::ProjectNotOpen)?;
        let data_dir = project_state::get_data_dir(&project_path);
        let detail_dir = data_dir.join("vocabulary").join("detail");
        ensure_dir(&detail_dir)?;

        let entry_id = entry.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let type_name = entry.get("typeName").and_then(|v| v.as_str()).unwrap_or("unknown");
        let entry_name = entry.get("name").and_then(|v| v.as_str()).unwrap_or("untitled");
        let description = entry.get("description").and_then(|v| v.as_str()).unwrap_or("");
        let created_at = entry.get("createdAt").and_then(|v| v.as_str()).unwrap_or("");

        let safe_type_name: String = type_name.chars().map(|c| if r#"\/:*?"<>|"#.contains(c) { '_' } else { c }).collect();
        let safe_entry_name: String = entry_name.chars().map(|c| if r#"\/:*?"<>|"#.contains(c) { '_' } else { c }).collect();
        let file_name = format!("{}_{}.novel", safe_type_name, safe_entry_name);
        let file_path = detail_dir.join(&file_name);

        let content = format!(
            "---\nid: {}\ntype: {}\nname: {}\ncreatedAt: {}\nupdatedAt: {}\n---\n\n# {}\n\n{}\n",
            entry_id, type_name, entry_name, created_at, generate_timestamp(), entry_name, description
        );

        fs::write(&file_path, &content).map_err(|e| {
            AppError::OperationFailed(format!("创建关联文件失败: {}", e))
        })?;

        let relative_path = file_path.strip_prefix(std::path::Path::new(&project_path))
            .unwrap_or(&file_path)
            .to_string_lossy()
            .to_string();

        self.update_vocabulary_entry(entry_id.to_string(), serde_json::json!({ "linkedFilePath": relative_path }))?;

        Ok(serde_json::json!({ "path": relative_path }))
    }
}

impl Default for VocabularyService {
    fn default() -> Self {
        Self::new()
    }
}
