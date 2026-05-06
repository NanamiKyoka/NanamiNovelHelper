use std::sync::Mutex;

static CURRENT_PROJECT_PATH: Mutex<Option<String>> = Mutex::new(None);

pub fn set_project_path(path: Option<String>) {
    let mut current = CURRENT_PROJECT_PATH.lock().unwrap();
    *current = path;
}

pub fn get_project_path() -> Option<String> {
    let current = CURRENT_PROJECT_PATH.lock().unwrap();
    current.clone()
}

pub fn get_data_dir(project_path: &str) -> std::path::PathBuf {
    std::path::PathBuf::from(project_path).join(".novelhelper").join("data")
}
