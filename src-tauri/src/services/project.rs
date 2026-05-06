use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, file_exists, read_json_file, write_json_file};
use std::path::PathBuf;
use std::sync::Mutex;

const PROJECT_FILE: &str = "project.json";

pub struct ProjectService {
    current_project: Mutex<Option<crate::models::Project>>,
}

impl ProjectService {
    pub fn new() -> Self {
        Self {
            current_project: Mutex::new(None),
        }
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
        let project = crate::models::Project::new(name, path.clone());
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

        project_state::set_project_path(Some(path));

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

        project_state::set_project_path(Some(path));

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

    pub fn get_init_data(&self) -> AppResult<crate::models::ProjectInitData> {
        let project = self
            .get_current_project()
            .ok_or(AppError::ProjectNotOpen)?;

        let data_dir = Self::get_data_dir(&project.path);

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
}

impl Default for ProjectService {
    fn default() -> Self {
        Self::new()
    }
}
