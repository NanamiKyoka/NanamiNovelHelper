use crate::error::{AppError, AppResult};
use crate::models::FileNode;
use crate::services::project_state;
use crate::utils::ensure_dir;
use std::fs;
use std::path::{Path, PathBuf};

pub struct FileService;

impl FileService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    fn safe_resolve_path(input_path: &str) -> AppResult<PathBuf> {
        let project_path = Self::get_project_path()?;
        let project = PathBuf::from(&project_path);

        let resolved = if Path::new(input_path).is_absolute() {
            PathBuf::from(input_path)
        } else {
            project.join(input_path)
        };

        let canonical_project = project.canonicalize().map_err(|_| {
            AppError::InvalidPath(format!("项目路径无效: {}", project_path))
        })?;

        let parent = resolved.parent();
        if let Some(p) = parent {
            if p.exists() {
                if let Ok(canonical_resolved) = resolved.canonicalize() {
                    if !canonical_resolved.starts_with(&canonical_project) {
                        return Err(AppError::InvalidPath("路径不在项目目录内".to_string()));
                    }
                }
            }
        }

        Ok(resolved)
    }

    pub async fn exists(&self, path: String) -> AppResult<bool> {
        let absolute_path = Self::safe_resolve_path(&path)?;
        Ok(absolute_path.exists())
    }

    pub async fn read_file(&self, path: String) -> AppResult<String> {
        let absolute_path = Self::safe_resolve_path(&path)?;
        if !absolute_path.exists() {
            return Err(AppError::FileNotFound(path));
        }
        fs::read_to_string(&absolute_path).map_err(|e| {
            AppError::OperationFailed(format!("读取文件失败: {}", e))
        })
    }

    pub async fn write_file(&self, path: String, content: String) -> AppResult<()> {
        let absolute_path = Self::safe_resolve_path(&path)?;
        if let Some(parent) = absolute_path.parent() {
            ensure_dir(parent)?;
        }
        fs::write(&absolute_path, content).map_err(|e| {
            AppError::OperationFailed(format!("写入文件失败: {}", e))
        })
    }

    pub async fn mkdir(&self, path: String, recursive: bool) -> AppResult<()> {
        let absolute_path = Self::safe_resolve_path(&path)?;
        if absolute_path.exists() {
            return Err(AppError::OperationFailed(format!("目录已存在: {}", path)));
        }
        if recursive {
            fs::create_dir_all(&absolute_path).map_err(|e| {
                AppError::OperationFailed(format!("创建目录失败: {}", e))
            })
        } else {
            fs::create_dir(&absolute_path).map_err(|e| {
                AppError::OperationFailed(format!("创建目录失败: {}", e))
            })
        }
    }

    pub async fn delete(&self, path: String) -> AppResult<()> {
        let absolute_path = Self::safe_resolve_path(&path)?;
        if !absolute_path.exists() {
            return Err(AppError::FileNotFound(path));
        }
        if absolute_path.is_dir() {
            fs::remove_dir_all(&absolute_path).map_err(|e| {
                AppError::OperationFailed(format!("删除目录失败: {}", e))
            })
        } else {
            fs::remove_file(&absolute_path).map_err(|e| {
                AppError::OperationFailed(format!("删除文件失败: {}", e))
            })
        }
    }

    pub async fn rename(&self, old_path: String, new_path: String) -> AppResult<()> {
        let absolute_old = Self::safe_resolve_path(&old_path)?;
        let absolute_new = Self::safe_resolve_path(&new_path)?;
        if !absolute_old.exists() {
            return Err(AppError::FileNotFound(old_path));
        }
        if absolute_new.exists() {
            return Err(AppError::OperationFailed(format!("目标路径已存在: {}", new_path)));
        }
        if let Some(parent) = absolute_new.parent() {
            ensure_dir(parent)?;
        }
        fs::rename(&absolute_old, &absolute_new).map_err(|e| {
            AppError::OperationFailed(format!("重命名失败: {}", e))
        })
    }

    pub async fn get_file_tree(&self, include_hidden: bool) -> AppResult<Vec<FileNode>> {
        let project_path = Self::get_project_path()?;
        let root = PathBuf::from(&project_path);
        if !root.exists() {
            return Ok(vec![]);
        }
        Self::scan_directory(&root, &root, true, include_hidden)
    }

    fn scan_directory(
        dir_path: &Path,
        project_root: &Path,
        recursive: bool,
        include_hidden: bool,
    ) -> AppResult<Vec<FileNode>> {
        let mut nodes = Vec::new();
        let entries = fs::read_dir(dir_path).map_err(|e| {
            AppError::OperationFailed(format!("读取目录失败: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                AppError::OperationFailed(format!("读取目录条目失败: {}", e))
            })?;
            let name = entry.file_name().to_string_lossy().to_string();

            if !include_hidden && name.starts_with('.') {
                continue;
            }

            let absolute_path = entry.path();
            let relative_path = absolute_path
                .strip_prefix(project_root)
                .unwrap_or(&absolute_path)
                .to_string_lossy()
                .to_string();

            let metadata = entry.metadata().map_err(|e| {
                AppError::OperationFailed(format!("读取文件信息失败: {}", e))
            })?;

            let is_directory = metadata.is_dir();
            let extension = if is_directory {
                None
            } else {
                absolute_path.extension().map(|e| e.to_string_lossy().to_string())
            };

            let modified_at = metadata.modified().ok().map(|t| {
                let datetime: chrono::DateTime<chrono::Utc> = t.into();
                datetime.to_rfc3339()
            });

            let children = if recursive && is_directory {
                Some(Self::scan_directory(&absolute_path, project_root, true, include_hidden)?)
            } else {
                None
            };

            nodes.push(FileNode {
                key: relative_path.clone(),
                name,
                path: relative_path,
                is_directory,
                extension,
                size: metadata.len(),
                modified_at,
                children,
            });
        }

        nodes.sort_by(|a, b| {
            if a.is_directory != b.is_directory {
                if a.is_directory { std::cmp::Ordering::Less } else { std::cmp::Ordering::Greater }
            } else {
                a.name.cmp(&b.name)
            }
        });

        Ok(nodes)
    }
}

impl Default for FileService {
    fn default() -> Self {
        Self::new()
    }
}
