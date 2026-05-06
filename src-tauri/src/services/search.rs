use crate::error::{AppError, AppResult};
use crate::services::project_state;
use std::fs;
use std::path::PathBuf;

pub struct SearchService;

impl SearchService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    pub fn search(
        &self,
        query: String,
        case_sensitive: bool,
        whole_word: bool,
        use_regex: bool,
        files_to_include: Option<String>,
        files_to_exclude: Option<String>,
        max_file_size: Option<u64>,
        max_results: Option<usize>,
    ) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let root = PathBuf::from(&project_path);
        if !root.exists() {
            return Ok(serde_json::json!({
                "success": true,
                "results": [],
                "totalMatches": 0,
                "filesSearched": 0
            }));
        }

        let regex_pattern = if use_regex {
            query.clone()
        } else if whole_word {
            format!(r"\b{}\b", regex::escape(&query))
        } else {
            regex::escape(&query)
        };

        let re = regex::RegexBuilder::new(&regex_pattern)
            .case_insensitive(!case_sensitive)
            .build()
            .map_err(|e| AppError::InvalidParam(format!("正则表达式无效: {}", e)))?;

        let include_patterns: Vec<String> = files_to_include
            .map(|s| s.split(',').map(|p| p.trim().to_string()).collect())
            .unwrap_or_default();

        let exclude_patterns: Vec<String> = files_to_exclude
            .map(|s| s.split(',').map(|p| p.trim().to_string()).collect())
            .unwrap_or_default();

        let max_size = max_file_size.unwrap_or(1024 * 1024);
        let max_res = max_results.unwrap_or(1000);

        let mut results = Vec::new();
        let mut total_matches = 0;
        let mut files_searched = 0;

        Self::search_directory(
            &root,
            &root,
            &re,
            &include_patterns,
            &exclude_patterns,
            max_size,
            max_res,
            &mut results,
            &mut total_matches,
            &mut files_searched,
        )?;

        Ok(serde_json::json!({
            "success": true,
            "results": results,
            "totalMatches": total_matches,
            "filesSearched": files_searched
        }))
    }

    fn search_directory(
        dir: &std::path::Path,
        project_root: &std::path::Path,
        re: &regex::Regex,
        include_patterns: &[String],
        exclude_patterns: &[String],
        max_file_size: u64,
        max_results: usize,
        results: &mut Vec<serde_json::Value>,
        total_matches: &mut usize,
        files_searched: &mut usize,
    ) -> AppResult<()> {
        let entries = fs::read_dir(dir).map_err(|e| {
            AppError::OperationFailed(format!("读取目录失败: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                AppError::OperationFailed(format!("读取目录条目失败: {}", e))
            })?;

            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            if name.starts_with('.') {
                continue;
            }

            if path.is_dir() {
                Self::search_directory(
                    &path,
                    project_root,
                    re,
                    include_patterns,
                    exclude_patterns,
                    max_file_size,
                    max_results,
                    results,
                    total_matches,
                    files_searched,
                )?;
                continue;
            }

            let relative_path = path
                .strip_prefix(project_root)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();

            if !include_patterns.is_empty() {
                let matches_include = include_patterns.iter().any(|p| {
                    glob_match(p, &relative_path) || glob_match(p, &name)
                });
                if !matches_include {
                    continue;
                }
            }

            if !exclude_patterns.is_empty() {
                let matches_exclude = exclude_patterns.iter().any(|p| {
                    glob_match(p, &relative_path) || glob_match(p, &name)
                });
                if matches_exclude {
                    continue;
                }
            }

            let metadata = entry.metadata().map_err(|e| {
                AppError::OperationFailed(format!("读取文件信息失败: {}", e))
            })?;

            if metadata.len() > max_file_size {
                continue;
            }

            *files_searched += 1;

            if *total_matches >= max_results {
                return Ok(());
            }

            let content = match fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let mut file_matches = Vec::new();
            for (line_num, line) in content.lines().enumerate() {
                for mat in re.find_iter(line) {
                    if *total_matches + file_matches.len() >= max_results {
                        break;
                    }

                    let start = mat.start();
                    let context_before = if start > 50 {
                        line[start - 50..start].to_string()
                    } else {
                        line[..start].to_string()
                    };
                    let end = mat.end();
                    let context_after = if end + 50 < line.len() {
                        line[end..end + 50].to_string()
                    } else {
                        line[end..].to_string()
                    };

                    file_matches.push(serde_json::json!({
                        "line": line_num + 1,
                        "column": start + 1,
                        "matchText": mat.as_str(),
                        "lineText": line,
                        "contextBefore": context_before,
                        "contextAfter": context_after
                    }));
                }
            }

            if !file_matches.is_empty() {
                *total_matches += file_matches.len();
                results.push(serde_json::json!({
                    "filePath": relative_path,
                    "fileName": name,
                    "matches": file_matches
                }));
            }
        }

        Ok(())
    }
}

impl Default for SearchService {
    fn default() -> Self {
        Self::new()
    }
}

fn glob_match(pattern: &str, text: &str) -> bool {
    let pattern = pattern.replace('*', ".*").replace('?', ".");
    if let Ok(re) = regex::Regex::new(&format!("^{}$", pattern)) {
        re.is_match(text)
    } else {
        text.contains(&pattern)
    }
}
