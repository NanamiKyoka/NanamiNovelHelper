use crate::error::{AppError, AppResult};
use crate::models::RecentProject;
use crate::services::project_state;
use crate::utils::{ensure_dir, file_exists, read_json_file, write_json_file};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

const PROJECT_FILE: &str = "project.json5";
const MAX_RECENT_PROJECTS: usize = 10;

pub struct ProjectService {
    current_project: Mutex<Option<crate::models::Project>>,
}

impl ProjectService {
    pub fn new() -> Self {
        Self {
            current_project: Mutex::new(None),
        }
    }

    fn get_app_data_dir() -> PathBuf {
        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
        base.join("NanamiNovelHelper")
    }

    fn get_recent_projects_file() -> PathBuf {
        Self::get_app_data_dir().join("recent-projects.json")
    }

    fn load_recent_projects() -> Vec<RecentProject> {
        let file = Self::get_recent_projects_file();
        if !file.exists() {
            return Vec::new();
        }
        read_json_file::<Vec<RecentProject>>(&file).unwrap_or_default()
    }

    fn save_recent_projects(recent: &[RecentProject]) -> AppResult<()> {
        let file = Self::get_recent_projects_file();
        let dir = file.parent().unwrap_or(&file);
        ensure_dir(dir)?;
        write_json_file(&file, recent)
    }

    pub fn get_recent_projects(&self) -> Vec<RecentProject> {
        let recent = Self::load_recent_projects();
        recent
            .into_iter()
            .filter(|item| PathBuf::from(&item.path).exists())
            .collect()
    }

    pub fn add_recent_project(&self, project: &crate::models::Project, path: &str) -> AppResult<()> {
        let mut recent = Self::load_recent_projects();
        recent.retain(|item| item.path != path);

        let now = chrono::Utc::now().to_rfc3339();
        recent.insert(
            0,
            RecentProject {
                id: project.id.clone(),
                name: project.name.clone(),
                path: path.to_string(),
                description: project.description.clone(),
                cover: project.cover.clone(),
                last_opened_at: now,
            },
        );

        if recent.len() > MAX_RECENT_PROJECTS {
            recent.truncate(MAX_RECENT_PROJECTS);
        }

        Self::save_recent_projects(&recent)
    }

    pub fn remove_recent_project(&self, path: &str) -> AppResult<()> {
        let mut recent = Self::load_recent_projects();
        recent.retain(|item| item.path != path);
        Self::save_recent_projects(&recent)
    }

    pub fn clear_recent_projects(&self) -> AppResult<()> {
        Self::save_recent_projects(&[])
    }

    pub fn update_project_info(&self, info: serde_json::Value) -> AppResult<crate::models::Project> {
        let mut current = self.current_project.lock().unwrap();
        let project = current
            .as_mut()
            .ok_or(AppError::ProjectNotOpen)?;

        if let Some(name) = info.get("name").and_then(|v| v.as_str()) {
            project.name = name.to_string();
        }
        if let Some(description) = info.get("description").and_then(|v| v.as_str()) {
            project.description = Some(description.to_string());
        }
        if let Some(author) = info.get("author").and_then(|v| v.as_str()) {
            project.author = Some(author.to_string());
        }
        if let Some(cover) = info.get("cover").and_then(|v| v.as_str()) {
            project.cover = Some(cover.to_string());
        }
        if let Some(tags) = info.get("tags").and_then(|v| v.as_array()) {
            project.tags = tags
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();
        }

        project.updated_at = chrono::Utc::now().to_rfc3339();

        let project_path = project_state::get_project_path()
            .ok_or(AppError::ProjectNotOpen)?;
        let project_file = Self::get_project_file_path(&project_path);
        write_json_file(&project_file, &*project)?;

        Ok(project.clone())
    }

    pub fn get_data_dir(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path)
    }

    pub fn get_project_file_path(project_path: &str) -> PathBuf {
        Self::get_data_dir(project_path).join(PROJECT_FILE)
    }

    pub fn create_project(
        &self,
        name: String,
        path: String,
    ) -> AppResult<crate::models::Project> {
        let project = crate::models::Project::new(name);
        let data_dir = Self::get_data_dir(&path);
        ensure_dir(&data_dir)?;

        let vocab_dir = data_dir.join("vocabularies");
        ensure_dir(&vocab_dir)?;

        for sub_dir in &["relationships", "organizations", "timelines", "sequence-charts", "maps"] {
            ensure_dir(&data_dir.join(sub_dir))?;
            ensure_dir(&data_dir.join(sub_dir).join("thumbnails"))?;
        }

        ensure_dir(&data_dir.join("ai-assistant").join("skills"))?;
        ensure_dir(&data_dir.join("backups"))?;

        let project_file = Self::get_project_file_path(&path);
        write_json_file(&project_file, &project)?;

        let mut current = self.current_project.lock().unwrap();
        *current = Some(project.clone());

        project_state::set_project_path(Some(path.clone()));

        let _ = self.add_recent_project(&project, &path);

        Ok(project)
    }

    pub fn open_project(&self, path: String) -> AppResult<crate::models::Project> {
        let project_file = Self::get_project_file_path(&path);
        if !file_exists(&project_file) {
            return Err(AppError::ProjectNotFound(path));
        }

        let project: crate::models::Project = read_json_file(&project_file)?;

        let mut current = self.current_project.lock().unwrap();
        *current = Some(project.clone());

        project_state::set_project_path(Some(path.clone()));

        drop(current);

        if let Err(e) = self.add_recent_project(&project, &path) {
            log::warn!("添加最近项目失败: {}", e);
        }

        Ok(project)
    }

    pub fn close_project(&self) {
        let mut current = self.current_project.lock().unwrap();
        *current = None;
        project_state::set_project_path(None);
    }

    pub fn get_current_project(&self) -> Option<crate::models::Project> {
        let current = self.current_project.lock().unwrap();
        current.clone()
    }

    #[allow(dead_code)]
    pub fn get_init_data_sync(&self) -> AppResult<crate::models::ProjectInitData> {
        let project = self
            .get_current_project()
            .ok_or(AppError::ProjectNotOpen)?;

        let project_path = project_state::get_project_path()
            .ok_or(AppError::ProjectNotOpen)?;
        let data_dir = Self::get_data_dir(&project_path);

        let settings = read_json_file::<serde_json::Value>(&data_dir.join("settings.json")).ok();

        let vocabulary_types = crate::services::VocabularyService::new()
            .load_vocabulary_types()
            .unwrap_or_default()
            .into_iter()
            .map(|v| serde_json::to_value(v).unwrap_or_default())
            .collect();

        let vocabulary_entries = crate::services::VocabularyService::new()
            .load_vocabulary_entries(None)
            .unwrap_or_default()
            .into_iter()
            .map(|v| serde_json::to_value(v).unwrap_or_default())
            .collect();

        let sensitive_words = crate::services::VocabularyService::new()
            .load_sensitive_words()
            .unwrap_or_default()
            .into_iter()
            .map(|v| serde_json::to_value(v).unwrap_or_default())
            .collect();

        let highlight_config = crate::services::SettingsService::new()
            .get_highlight_config()
            .ok();

        let relationship_graphs = crate::services::GraphService::new()
            .get_list("relationships")
            .unwrap_or_default();

        let timelines = crate::services::GraphService::new()
            .get_list("timelines")
            .unwrap_or_default();

        let sequence_charts = crate::services::GraphService::new()
            .get_list("sequence-charts")
            .unwrap_or_default();

        let organization_graphs = crate::services::GraphService::new()
            .get_list("organizations")
            .unwrap_or_default();

        let maps = crate::services::GraphService::new()
            .get_list("maps")
            .unwrap_or_default();

        Ok(crate::models::ProjectInitData {
            project: Some(project),
            settings,
            vocabulary_types,
            vocabulary_entries,
            sensitive_words,
            highlight_config,
            relationship_graphs,
            timelines,
            sequence_charts,
            organization_graphs,
            maps,
            file_tree: None,
        })
    }

    pub async fn get_init_data(&self) -> AppResult<crate::models::ProjectInitData> {
        let project = self
            .get_current_project()
            .ok_or(AppError::ProjectNotOpen)?;

        let project_path = project_state::get_project_path()
            .ok_or(AppError::ProjectNotOpen)?;
        let data_dir = Self::get_data_dir(&project_path);

        tokio::task::spawn_blocking(move || {
            let settings = read_json_file::<serde_json::Value>(&data_dir.join("settings.json")).ok();

            let vocabulary_types = crate::services::VocabularyService::new()
                .load_vocabulary_types()
                .unwrap_or_default()
                .into_iter()
                .map(|v| serde_json::to_value(v).unwrap_or_default())
                .collect();

            let vocabulary_entries = crate::services::VocabularyService::new()
                .load_vocabulary_entries(None)
                .unwrap_or_default()
                .into_iter()
                .map(|v| serde_json::to_value(v).unwrap_or_default())
                .collect();

            let sensitive_words = crate::services::VocabularyService::new()
                .load_sensitive_words()
                .unwrap_or_default()
                .into_iter()
                .map(|v| serde_json::to_value(v).unwrap_or_default())
                .collect();

            let highlight_config = crate::services::SettingsService::new()
                .get_highlight_config()
                .ok();

            let relationship_graphs = crate::services::GraphService::new()
                .get_list("relationships")
                .unwrap_or_default();

            let timelines = crate::services::GraphService::new()
                .get_list("timelines")
                .unwrap_or_default();

            let sequence_charts = crate::services::GraphService::new()
                .get_list("sequence-charts")
                .unwrap_or_default();

            let organization_graphs = crate::services::GraphService::new()
                .get_list("organizations")
                .unwrap_or_default();

            let maps = crate::services::GraphService::new()
                .get_list("maps")
                .unwrap_or_default();

            Ok(crate::models::ProjectInitData {
                project: Some(project),
                settings,
                vocabulary_types,
                vocabulary_entries,
                sensitive_words,
                highlight_config,
                relationship_graphs,
                timelines,
                sequence_charts,
                organization_graphs,
                maps,
                file_tree: None,
            })
        })
        .await
        .map_err(|e| AppError::OperationFailed(format!("获取项目初始化数据失败: {}", e)))?
    }

    pub fn get_project_stats(&self, project_path: &str) -> AppResult<serde_json::Value> {
        let root = PathBuf::from(project_path);
        if !root.exists() {
            return Err(AppError::FileNotFound(project_path.to_string()));
        }

        let mut total_files = 0u64;
        let mut total_words = 0u64;
        let mut file_types: std::collections::HashMap<String, u64> = std::collections::HashMap::new();

        fn scan_dir(dir: &std::path::Path, total_files: &mut u64, total_words: &mut u64, file_types: &mut std::collections::HashMap<String, u64>) {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.filter_map(|e| e.ok()) {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with('.') {
                        continue;
                    }
                    let path = entry.path();
                    if path.is_dir() {
                        scan_dir(&path, total_files, total_words, file_types);
                    } else if name.ends_with(".novel") {
                        *total_files += 1;
                        let ext = path.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
                        *file_types.entry(ext).or_insert(0) += 1;
                        if let Ok(content) = fs::read_to_string(&path) {
                            let text = regex::Regex::new(r"(?s)^---\n.*?\n---\n")
                                .ok()
                                .and_then(|re| re.replace(&content, "").parse::<String>().ok())
                                .unwrap_or(content);
                            *total_words += count_words(&text);
                        }
                    }
                }
            }
        }

        fn count_words(text: &str) -> u64 {
            let clean: String = text.chars().filter(|c| !c.is_whitespace()).collect();
            let cjk_count = clean.chars().filter(|c| {
                ('\u{4e00}'..='\u{9fa5}').contains(c) ||
                ('\u{3040}'..='\u{309f}').contains(c) ||
                ('\u{30a0}'..='\u{30ff}').contains(c) ||
                ('\u{ac00}'..='\u{d7af}').contains(c)
            }).count() as u64;
            let non_cjk: String = clean.chars().map(|c| {
                if ('\u{4e00}'..='\u{9fa5}').contains(&c) ||
                   ('\u{3040}'..='\u{309f}').contains(&c) ||
                   ('\u{30a0}'..='\u{30ff}').contains(&c) ||
                   ('\u{ac00}'..='\u{d7af}').contains(&c) {
                    ' '
                } else {
                    c
                }
            }).collect();
            let word_count = regex::Regex::new(r"[a-zA-Z0-9]+")
                .ok()
                .map(|re| re.find_iter(&non_cjk).count() as u64)
                .unwrap_or(0);
            cjk_count + word_count
        }

        scan_dir(&root, &mut total_files, &mut total_words, &mut file_types);

        Ok(serde_json::json!({
            "totalFiles": total_files,
            "totalWords": total_words,
            "fileTypes": file_types
        }))
    }
}

impl Default for ProjectService {
    fn default() -> Self {
        Self::new()
    }
}
