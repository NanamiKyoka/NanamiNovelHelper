pub mod edit;
pub mod list_files;
pub mod novel_utils;
pub mod read_file;
pub mod search_files;
pub mod write;

use crate::error::{AppError, AppResult};
use crate::services::project_state;
use std::path::PathBuf;

pub fn resolve_project_file(path: &str) -> AppResult<PathBuf> {
    let project_path = project_state::get_project_path().ok_or(AppError::ProjectNotOpen)?;
    let project = PathBuf::from(&project_path);
    let resolved = if std::path::Path::new(path).is_absolute() {
        PathBuf::from(path)
    } else {
        project.join(path)
    };

    let canonical_project = project.canonicalize().map_err(|_| {
        AppError::InvalidPath(format!("项目路径无效: {}", project_path))
    })?;

    let parent = resolved.parent();
    if let Some(p) = parent {
        if p.exists() {
            if let Ok(canonical_resolved) = p.canonicalize() {
                if !canonical_resolved.starts_with(&canonical_project) {
                    return Err(AppError::InvalidPath(
                        "路径不在项目目录内".to_string(),
                    ))
                }
            }
        }
    }

    Ok(resolved)
}
