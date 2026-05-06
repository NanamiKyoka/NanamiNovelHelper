use crate::error::AppResult;
use crate::models::*;
use crate::services::VocabularyService;
use tauri::State;

#[tauri::command]
pub fn vocabulary_load_types(service: State<VocabularyService>) -> AppResult<Vec<VocabularyType>> {
    service.load_vocabulary_types()
}

#[tauri::command]
pub fn vocabulary_save_types(
    types: Vec<VocabularyType>,
    service: State<VocabularyService>,
) -> AppResult<()> {
    service.save_vocabulary_types(types)
}

#[tauri::command]
pub fn vocabulary_add_type(
    name: String,
    color: String,
    is_built_in: bool,
    description: Option<String>,
    service: State<VocabularyService>,
) -> AppResult<VocabularyType> {
    service.add_vocabulary_type(name, color, is_built_in, description)
}

#[tauri::command]
pub fn vocabulary_update_type(
    id: String,
    updates: serde_json::Value,
    service: State<VocabularyService>,
) -> AppResult<Option<VocabularyType>> {
    service.update_vocabulary_type(id, updates)
}

#[tauri::command]
pub fn vocabulary_delete_type(
    id: String,
    service: State<VocabularyService>,
) -> AppResult<bool> {
    service.delete_vocabulary_type(id)
}

#[tauri::command]
pub fn vocabulary_load_entries(
    type_id: Option<String>,
    service: State<VocabularyService>,
) -> AppResult<Vec<VocabularyEntry>> {
    service.load_vocabulary_entries(type_id)
}

#[tauri::command]
pub fn vocabulary_save_entries(
    type_id: String,
    entries: Vec<VocabularyEntry>,
    service: State<VocabularyService>,
) -> AppResult<()> {
    service.save_vocabulary_entries(type_id, entries)
}

#[tauri::command]
pub fn vocabulary_add_entry(
    entry: VocabularyEntry,
    service: State<VocabularyService>,
) -> AppResult<VocabularyEntry> {
    service.add_vocabulary_entry(entry)
}

#[tauri::command]
pub fn vocabulary_update_entry(
    id: String,
    updates: serde_json::Value,
    service: State<VocabularyService>,
) -> AppResult<Option<VocabularyEntry>> {
    service.update_vocabulary_entry(id, updates)
}

#[tauri::command]
pub fn vocabulary_delete_entry(
    id: String,
    service: State<VocabularyService>,
) -> AppResult<bool> {
    service.delete_vocabulary_entry(id)
}

#[tauri::command]
pub fn sensitive_load_words(service: State<VocabularyService>) -> AppResult<Vec<SensitiveWord>> {
    service.load_sensitive_words()
}

#[tauri::command]
pub fn sensitive_save_words(
    words: Vec<SensitiveWord>,
    service: State<VocabularyService>,
) -> AppResult<()> {
    service.save_sensitive_words(words)
}

#[tauri::command]
pub fn sensitive_add_word(
    word: SensitiveWord,
    service: State<VocabularyService>,
) -> AppResult<SensitiveWord> {
    service.add_sensitive_word(word)
}

#[tauri::command]
pub fn sensitive_update_word(
    id: String,
    updates: serde_json::Value,
    service: State<VocabularyService>,
) -> AppResult<Option<SensitiveWord>> {
    service.update_sensitive_word(id, updates)
}

#[tauri::command]
pub fn sensitive_delete_word(
    id: String,
    service: State<VocabularyService>,
) -> AppResult<bool> {
    service.delete_sensitive_word(id)
}

#[tauri::command]
pub fn sensitive_import_words(
    words: Vec<SensitiveWord>,
    service: State<VocabularyService>,
) -> AppResult<usize> {
    let mut existing = service.load_sensitive_words()?;
    let count = words.len();
    existing.extend(words);
    service.save_sensitive_words(existing)?;
    Ok(count)
}
