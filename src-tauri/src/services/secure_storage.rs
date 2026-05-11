use crate::error::AppResult;
use crate::utils::{ensure_dir, read_json_file, write_json_file};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

const SERVICE_NAME: &str = "NanamiNovelHelper";

pub struct SecureStorageService {
    cache: Mutex<HashMap<String, String>>,
}

impl SecureStorageService {
    pub fn new() -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
        }
    }

    fn get_keyring_entry(key_name: &str) -> keyring::Result<keyring::Entry> {
        keyring::Entry::new(SERVICE_NAME, key_name)
    }

    fn get_fallback_file() -> PathBuf {
        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
        base.join("NanamiNovelHelper").join("encrypted-keys.json")
    }

    fn load_fallback_keys() -> HashMap<String, String> {
        let file = Self::get_fallback_file();
        if !file.exists() {
            return HashMap::new();
        }
        read_json_file::<HashMap<String, String>>(&file).unwrap_or_default()
    }

    fn save_fallback_keys(keys: &HashMap<String, String>) -> AppResult<()> {
        let file = Self::get_fallback_file();
        let dir = file.parent().unwrap_or(&file);
        ensure_dir(dir)?;
        write_json_file(&file, keys)
    }

    pub fn is_encryption_available(&self) -> bool {
        Self::get_keyring_entry("__test__").is_ok()
    }

    pub fn get_api_key(&self, key_name: &str) -> Option<String> {
        {
            let cache = self.cache.lock().ok()?;
            if let Some(val) = cache.get(key_name) {
                return Some(val.clone());
            }
        }

        if let Ok(entry) = Self::get_keyring_entry(key_name) {
            if let Ok(password) = entry.get_password() {
                if let Ok(mut cache) = self.cache.lock() {
                    cache.insert(key_name.to_string(), password.clone());
                }
                return Some(password);
            }
        }

        let fallback = Self::load_fallback_keys();
        if let Some(val) = fallback.get(key_name) {
            if let Ok(mut cache) = self.cache.lock() {
                cache.insert(key_name.to_string(), val.clone());
            }
            return Some(val.clone());
        }

        None
    }

    pub fn set_api_key(&self, key_name: &str, value: &str) -> AppResult<()> {
        if let Ok(entry) = Self::get_keyring_entry(key_name) {
            match entry.set_password(value) {
                Ok(()) => {
                    if let Ok(mut cache) = self.cache.lock() {
                        cache.insert(key_name.to_string(), value.to_string());
                    }
                    return Ok(());
                }
                Err(_) => {}
            }
        }

        let mut fallback = Self::load_fallback_keys();
        fallback.insert(key_name.to_string(), value.to_string());
        Self::save_fallback_keys(&fallback)?;

        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(key_name.to_string(), value.to_string());
        }

        Ok(())
    }

    pub fn delete_api_key(&self, key_name: &str) -> AppResult<()> {
        if let Ok(entry) = Self::get_keyring_entry(key_name) {
            let _ = entry.delete_credential();
        }

        let mut fallback = Self::load_fallback_keys();
        fallback.remove(key_name);
        Self::save_fallback_keys(&fallback)?;

        if let Ok(mut cache) = self.cache.lock() {
            cache.remove(key_name);
        }

        Ok(())
    }

    pub fn get_api_key_names(&self) -> Vec<String> {
        let mut names = std::collections::HashSet::new();

        if let Ok(cache) = self.cache.lock() {
            for key in cache.keys() {
                names.insert(key.clone());
            }
        }

        let fallback = Self::load_fallback_keys();
        for key in fallback.keys() {
            names.insert(key.clone());
        }

        names.into_iter().collect()
    }
}

impl Default for SecureStorageService {
    fn default() -> Self {
        Self::new()
    }
}
