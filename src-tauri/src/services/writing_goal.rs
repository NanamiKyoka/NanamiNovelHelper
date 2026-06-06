use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{read_json5_file, write_json5_file};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WritingStatsData {
    pub stats: Vec<DailyWritingStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyWritingStats {
    pub date: String,
    pub word_count: i64,
}

pub struct WritingGoalService;

impl WritingGoalService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    fn get_stats_path(project_path: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join("writing-stats.json5")
    }

    pub fn get_writing_stats(&self) -> AppResult<WritingStatsData> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_stats_path(&project_path);
        if !path.exists() {
            return Ok(WritingStatsData::default());
        }
        read_json5_file(&path)
    }

    pub fn update_daily_stats(&self, date: &str, delta: i64) -> AppResult<WritingStatsData> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_stats_path(&project_path);
        let mut data = if path.exists() {
            read_json5_file::<WritingStatsData>(&path)?
        } else {
            WritingStatsData::default()
        };

        if let Some(entry) = data.stats.iter_mut().find(|s| s.date == date) {
            entry.word_count += delta;
        } else {
            data.stats.push(DailyWritingStats {
                date: date.to_string(),
                word_count: delta,
            });
        }

        write_json5_file(&path, &data)?;
        Ok(data)
    }

    pub fn get_project_total_words(&self) -> AppResult<u64> {
        let data = self.get_writing_stats()?;
        let total: i64 = data.stats.iter().map(|s| s.word_count).sum();
        Ok(total.max(0) as u64)
    }
}

impl Default for WritingGoalService {
    fn default() -> Self {
        Self::new()
    }
}
