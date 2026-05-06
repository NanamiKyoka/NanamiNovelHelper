use crate::error::AppResult;
use crate::services::search::SearchService;
use tauri::State;

#[tauri::command]
pub fn search_content(
    query: String,
    case_sensitive: Option<bool>,
    whole_word: Option<bool>,
    use_regex: Option<bool>,
    files_to_include: Option<String>,
    files_to_exclude: Option<String>,
    max_file_size: Option<u64>,
    max_results: Option<usize>,
    search_service: State<'_, SearchService>,
) -> AppResult<serde_json::Value> {
    search_service.search(
        query,
        case_sensitive.unwrap_or(false),
        whole_word.unwrap_or(false),
        use_regex.unwrap_or(false),
        files_to_include,
        files_to_exclude,
        max_file_size,
        max_results,
    )
}

#[tauri::command]
pub fn search_replace(
    file_path: String,
    search_query: String,
    replace_text: String,
    case_sensitive: Option<bool>,
    whole_word: Option<bool>,
    use_regex: Option<bool>,
    replace_all: Option<bool>,
    line: Option<usize>,
    column: Option<usize>,
    search_service: State<'_, SearchService>,
) -> AppResult<serde_json::Value> {
    search_service.replace(
        &file_path,
        &search_query,
        &replace_text,
        case_sensitive.unwrap_or(false),
        whole_word.unwrap_or(false),
        use_regex.unwrap_or(false),
        replace_all.unwrap_or(false),
        line,
        column,
    )
}
