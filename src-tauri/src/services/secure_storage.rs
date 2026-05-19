use crate::error::AppResult;
use crate::utils::ensure_dir;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

const SERVICE_NAME: &str = "NanamiNovelHelper";

pub struct SecureStorageService {
    cache: Mutex<HashMap<String, String>>,
}

#[cfg(windows)]
mod dpapi {
    use windows_dpapi::{decrypt_data, encrypt_data, Scope};

    pub fn encrypt(plaintext: &[u8]) -> Result<Vec<u8>, String> {
        encrypt_data(plaintext, Scope::User, None)
            .map_err(|e| format!("DPAPI encrypt failed: {}", e))
    }

    pub fn decrypt(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
        decrypt_data(ciphertext, Scope::User, None)
            .map_err(|e| format!("DPAPI decrypt failed: {}", e))
    }
}

#[cfg(not(windows))]
mod dpapi {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    use sha2::{Digest, Sha256};

    fn derive_key() -> [u8; 32] {
        let username = whoami::username();
        let hostname = whoami::hostname();
        let platform = whoami::platform();
        let seed = format!("{}:{}:{}:NanamiNovelHelper", username, hostname, platform);

        let mut hasher = Sha256::new();
        hasher.update(seed.as_bytes());
        let result = hasher.finalize();

        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    }

    pub fn encrypt(plaintext: &[u8]) -> Result<Vec<u8>, String> {
        let key = derive_key();
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| format!("Cipher init failed: {}", e))?;

        let nonce_bytes = [0u8; 12];
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| format!("Encryption failed: {}", e))?;

        let mut result = Vec::with_capacity(12 + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    pub fn decrypt(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
        if ciphertext.len() < 12 {
            return Err("Ciphertext too short".to_string());
        }

        let key = derive_key();
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| format!("Cipher init failed: {}", e))?;

        let nonce = Nonce::from_slice(&ciphertext[..12]);
        let encrypted = &ciphertext[12..];

        cipher
            .decrypt(nonce, encrypted)
            .map_err(|e| format!("Decryption failed: {}", e))
    }
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
        base.join("NanamiNovelHelper").join("encrypted-keys.bin")
    }

    fn load_fallback_keys() -> HashMap<String, String> {
        let file = Self::get_fallback_file();
        if !file.exists() {
            return HashMap::new();
        }

        let encrypted_data = match fs::read(&file) {
            Ok(data) => data,
            Err(e) => {
                log::warn!("Failed to read fallback file: {}", e);
                return HashMap::new();
            }
        };

        let decrypted_data = match dpapi::decrypt(&encrypted_data) {
            Ok(data) => data,
            Err(e) => {
                log::warn!("Failed to decrypt fallback file: {}", e);
                return HashMap::new();
            }
        };

        let json_str = match String::from_utf8(decrypted_data) {
            Ok(s) => s,
            Err(e) => {
                log::warn!("Failed to convert decrypted data to UTF-8: {}", e);
                return HashMap::new();
            }
        };

        match serde_json::from_str(&json_str) {
            Ok(map) => map,
            Err(e) => {
                log::warn!("Failed to parse fallback JSON: {}", e);
                HashMap::new()
            }
        }
    }

    fn save_fallback_keys(keys: &HashMap<String, String>) -> AppResult<()> {
        let file = Self::get_fallback_file();
        let dir = file.parent().unwrap_or(&file);
        ensure_dir(dir)?;

        let json_str = serde_json::to_string(keys)?;
        let plaintext = json_str.as_bytes();

        let encrypted_data = match dpapi::encrypt(plaintext) {
            Ok(data) => data,
            Err(e) => {
                log::error!("Failed to encrypt fallback data: {}", e);
                return Err(crate::error::AppError::OperationFailed(format!(
                    "加密失败: {}",
                    e
                )));
            }
        };

        fs::write(&file, encrypted_data)?;
        Ok(())
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
        let mut keyring_success = false;

        if let Ok(entry) = Self::get_keyring_entry(key_name) {
            if entry.set_password(value).is_ok() {
                keyring_success = true;
            }
        }

        let mut fallback = Self::load_fallback_keys();
        fallback.insert(key_name.to_string(), value.to_string());
        if let Err(e) = Self::save_fallback_keys(&fallback) {
            log::error!("Failed to save fallback keys: {}", e);
        }

        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(key_name.to_string(), value.to_string());
        }

        if !keyring_success {
            #[cfg(windows)]
            log::warn!(
                "Failed to save API key '{}' to keyring, using DPAPI-encrypted fallback instead",
                key_name
            );
            #[cfg(not(windows))]
            log::warn!(
                "Failed to save API key '{}' to keyring, using AES-256-GCM encrypted fallback instead",
                key_name
            );
        }

        Ok(())
    }

    pub fn delete_api_key(&self, key_name: &str) -> AppResult<()> {
        if let Ok(entry) = Self::get_keyring_entry(key_name) {
            let _ = entry.delete_credential();
        }

        let mut fallback = Self::load_fallback_keys();
        fallback.remove(key_name);
        if let Err(e) = Self::save_fallback_keys(&fallback) {
            log::error!("Failed to save fallback keys after delete: {}", e);
        }

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
