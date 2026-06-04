use std::sync::Mutex;

static CURRENT_PROJECT_PATH: Mutex<Option<String>> = Mutex::new(None);

pub fn set_project_path(path: Option<String>) {
    match CURRENT_PROJECT_PATH.lock() {
        Ok(mut current) => *current = path,
        Err(e) => log::error!("获取项目路径锁失败: {}", e),
    }
}

pub fn get_project_path() -> Option<String> {
    CURRENT_PROJECT_PATH
        .lock()
        .map(|current| current.clone())
        .ok()
        .flatten()
}

pub fn get_data_dir(project_path: &str) -> std::path::PathBuf {
    std::path::PathBuf::from(project_path).join(".novelhelper").join("data")
}
