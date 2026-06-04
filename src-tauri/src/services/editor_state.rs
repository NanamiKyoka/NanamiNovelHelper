use std::sync::Mutex;

static CURRENT_EDITOR_FILE: Mutex<Option<String>> = Mutex::new(None);

pub fn set_current_file(path: Option<String>) {
    match CURRENT_EDITOR_FILE.lock() {
        Ok(mut current) => *current = path,
        Err(e) => log::error!("获取编辑器文件锁失败: {}", e),
    }
}

pub fn get_current_file() -> Option<String> {
    CURRENT_EDITOR_FILE.lock().ok().map(|g| g.clone()).flatten()
}
