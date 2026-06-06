use crate::error::AppResult;
use crate::services::writing_goal::{DailyWritingStats, WritingGoalService, WritingStatsData};
use tauri::State;

#[tauri::command]
pub fn get_writing_stats(service: State<'_, WritingGoalService>) -> AppResult<WritingStatsData> {
    service.get_writing_stats()
}

#[tauri::command]
pub fn update_daily_stats(
    date: String,
    delta: i64,
    service: State<'_, WritingGoalService>,
) -> AppResult<WritingStatsData> {
    service.update_daily_stats(&date, delta)
}

#[tauri::command]
pub fn get_project_total_words(service: State<'_, WritingGoalService>) -> AppResult<u64> {
    service.get_project_total_words()
}

#[tauri::command]
pub fn writing_goal_get_daily_stats(
    service: State<'_, WritingGoalService>,
) -> AppResult<Vec<DailyWritingStats>> {
    let data = service.get_writing_stats()?;
    Ok(data.stats)
}
