use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

pub struct FileWatcherService {
    watcher: Mutex<Option<RecommendedWatcher>>,
    watched_path: Mutex<Option<PathBuf>>,
    app: Mutex<Option<AppHandle>>,
}

#[derive(Debug, Clone, serde::Serialize)]
struct FileChangeEvent {
    #[serde(rename = "type")]
    change_type: String,
    path: String,
}

#[derive(Debug, Clone, serde::Serialize)]
struct BatchFileChangeEvent {
    changes: Vec<FileChangeEvent>,
    timestamp: u64,
}

impl FileWatcherService {
    pub fn new() -> Self {
        Self {
            watcher: Mutex::new(None),
            watched_path: Mutex::new(None),
            app: Mutex::new(None),
        }
    }

    pub fn set_app(&self, app: AppHandle) {
        if let Ok(mut a) = self.app.lock() {
            *a = Some(app);
        }
    }

    pub fn start(&self, project_path: &str) -> bool {
        self.stop();

        let path = PathBuf::from(project_path);
        if !path.exists() {
            return false;
        }

        let (tx, rx) = mpsc::channel();

        let mut watcher = match RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        ) {
            Ok(w) => w,
            Err(_) => return false,
        };

        if watcher.watch(&path, RecursiveMode::Recursive).is_err() {
            return false;
        }

        if let Ok(mut w) = self.watcher.lock() {
            *w = Some(watcher);
        }
        if let Ok(mut p) = self.watched_path.lock() {
            *p = Some(path);
        }

        let app_handle = self.app.lock().ok().and_then(|a| a.clone());

        std::thread::spawn(move || {
            let mut pending: Vec<FileChangeEvent> = Vec::new();
            let mut batch_timer: Option<std::time::Instant> = None;
            let batch_debounce = std::time::Duration::from_millis(500);

            loop {
                let timeout = batch_timer
                    .map(|t| batch_debounce.saturating_sub(t.elapsed()))
                    .unwrap_or(std::time::Duration::from_secs(1));

                match rx.recv_timeout(timeout) {
                    Ok(event) => {
                        let change_type = match event.kind {
                            EventKind::Create(_) => "add",
                            EventKind::Modify(_) => "change",
                            EventKind::Remove(_) => "unlink",
                            _ => continue,
                        };

                        for path in event.paths {
                            let path_str = path.to_string_lossy().to_string();
                            if path_str.contains("node_modules")
                                || path_str.contains(".git/objects")
                                || path_str.contains(".git/refs")
                                || path_str.contains(".git/logs")
                                || path_str.contains("dist")
                                || path_str.contains("build")
                            {
                                continue;
                            }

                            let existing = pending.iter().position(|e| e.path == path_str);
                            if let Some(idx) = existing {
                                let prev = &pending[idx];
                                if prev.change_type == "add" && change_type == "unlink" {
                                    pending.remove(idx);
                                } else if prev.change_type == "unlink" && change_type == "add" {
                                    pending[idx].change_type = "change".to_string();
                                } else {
                                    pending[idx].change_type = change_type.to_string();
                                }
                            } else {
                                pending.push(FileChangeEvent {
                                    change_type: change_type.to_string(),
                                    path: path_str,
                                });
                            }
                            batch_timer = Some(std::time::Instant::now());
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        if let Some(timer) = batch_timer {
                            if timer.elapsed() >= batch_debounce && !pending.is_empty() {
                                if let Some(ref app) = app_handle {
                                    let _ = app.emit(
                                        "file-change",
                                        BatchFileChangeEvent {
                                            changes: pending.clone(),
                                            timestamp: std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .unwrap_or_default()
                                                .as_millis() as u64,
                                        },
                                    );
                                }
                                pending.clear();
                                batch_timer = None;
                            }
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => {
                        break;
                    }
                }
            }
        });

        true
    }

    pub fn stop(&self) {
        if let Ok(mut w) = self.watcher.lock() {
            *w = None;
        }
        if let Ok(mut p) = self.watched_path.lock() {
            *p = None;
        }
    }

    pub fn is_watching(&self) -> bool {
        self.watcher.lock().map(|w| w.is_some()).unwrap_or(false)
    }

    pub fn get_watched_path(&self) -> Option<String> {
        self.watched_path
            .lock()
            .ok()
            .and_then(|p| p.as_ref().map(|path| path.to_string_lossy().to_string()))
    }
}

impl Default for FileWatcherService {
    fn default() -> Self {
        Self::new()
    }
}
