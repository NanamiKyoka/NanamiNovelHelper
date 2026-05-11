use crate::error::AppResult;
use crate::services::git::GitService;
use tauri::State;

#[tauri::command]
pub fn git_is_available() -> AppResult<bool> {
    Ok(GitService::is_system_git_available())
}

#[tauri::command]
pub async fn git_is_repo(
    repo_path: String,
    git_service: State<'_, GitService>,
) -> AppResult<bool> {
    git_service.is_repo_async(&repo_path).await
}

#[tauri::command]
pub async fn git_init(
    path: String,
    default_branch: Option<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.init_async(path, default_branch).await
}

#[tauri::command]
pub async fn git_get_status(
    repo_path: String,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.get_status_async(&repo_path).await
}

#[tauri::command]
pub fn git_get_log(
    repo_path: String,
    max_count: Option<u32>,
    skip: Option<u32>,
    path: Option<String>,
    search: Option<String>,
    author: Option<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.get_log(&repo_path, max_count, skip, path, search, author)
}

#[tauri::command]
pub fn git_add(
    repo_path: String,
    filepaths: Vec<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.add(&repo_path, filepaths)
}

#[tauri::command]
pub fn git_unstage(
    repo_path: String,
    filepaths: Vec<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.unstage(&repo_path, filepaths)
}

#[tauri::command]
pub fn git_commit(
    repo_path: String,
    message: String,
    all: Option<bool>,
    author_name: Option<String>,
    author_email: Option<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.commit(&repo_path, message, all, author_name, author_email)
}

#[tauri::command]
pub fn git_reset(
    repo_path: String,
    commit: String,
    mode: String,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.reset(&repo_path, commit, mode)
}

#[tauri::command]
pub fn git_restore(
    repo_path: String,
    filepaths: Vec<String>,
    source: Option<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.restore(&repo_path, filepaths, source)
}

#[tauri::command]
pub fn git_get_diff(
    repo_path: String,
    filepath: String,
    staged: Option<bool>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.get_diff(&repo_path, &filepath, staged.unwrap_or(false))
}

#[tauri::command]
pub fn git_get_commit_file_diff(
    repo_path: String,
    commit_hash: String,
    filepath: String,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.get_commit_file_diff(&repo_path, &commit_hash, &filepath)
}

#[tauri::command]
pub fn git_get_commit_files(
    repo_path: String,
    commit_hash: String,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.get_commit_files(&repo_path, &commit_hash)
}

#[tauri::command]
pub fn git_get_branches(
    repo_path: String,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.get_branches(&repo_path)
}

#[tauri::command]
pub fn git_create_branch(
    repo_path: String,
    name: String,
    start_point: Option<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.create_branch(&repo_path, &name, start_point)
}

#[tauri::command]
pub fn git_delete_branch(
    repo_path: String,
    name: String,
    force: Option<bool>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.delete_branch(&repo_path, &name, force.unwrap_or(false))
}

#[tauri::command]
pub fn git_rename_branch(
    repo_path: String,
    old_name: String,
    new_name: String,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.rename_branch(&repo_path, &old_name, &new_name)
}

#[tauri::command]
pub fn git_checkout(
    repo_path: String,
    target: String,
    create_branch: Option<bool>,
    force: Option<bool>,
    paths: Option<Vec<String>>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.checkout(&repo_path, target, create_branch, force, paths)
}

#[tauri::command]
pub fn git_merge(
    repo_path: String,
    branch: String,
    allow_unrelated_histories: Option<bool>,
    message: Option<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.merge(&repo_path, branch, allow_unrelated_histories, message)
}

#[tauri::command]
pub fn git_get_config(
    repo_path: String,
    key: String,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.get_config(&repo_path, &key)
}

#[tauri::command]
pub fn git_check_author_identity(
    repo_path: String,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.check_author_identity(&repo_path)
}

#[tauri::command]
pub fn git_set_config(
    repo_path: String,
    key: String,
    value: String,
    scope: Option<String>,
    git_service: State<'_, GitService>,
) -> AppResult<serde_json::Value> {
    git_service.set_config(&repo_path, &key, &value, scope)
}

#[tauri::command]
pub fn git_set_mode(mode: String, git_service: State<'_, GitService>) {
    git_service.set_mode(mode)
}

#[tauri::command]
pub fn git_get_mode(git_service: State<'_, GitService>) -> String {
    git_service.get_mode()
}
