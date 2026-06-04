use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct GitService {
    mode: Mutex<String>,
}

impl GitService {
    pub fn new() -> Self {
        Self {
            mode: Mutex::new("auto".to_string()),
        }
    }

    fn normalize_path(path: &str) -> AppResult<PathBuf> {
        let path = Path::new(path);
        
        if !path.exists() {
            return Err(AppError::OperationFailed(format!(
                "路径不存在: {}",
                path.display()
            )));
        }
        
        if !path.is_dir() {
            return Err(AppError::OperationFailed(format!(
                "路径不是目录: {}",
                path.display()
            )));
        }
        
        let canonical = path
            .canonicalize()
            .map_err(|e| AppError::OperationFailed(format!("路径规范化失败: {}", e)))?;
        
        Ok(canonical)
    }

    async fn exec_git_async(cwd: &str, args: &[&str]) -> AppResult<String> {
        let normalized_path = Self::normalize_path(cwd)?;
        
        let mut cmd = tokio::process::Command::new("git");
        cmd.args(args)
            .current_dir(&normalized_path);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);
        let output = cmd
            .output()
            .await
            .map_err(|e| AppError::OperationFailed(format!("执行 git 命令失败: {}", e)))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Err(AppError::OperationFailed(format!(
                "git {} 失败: {}",
                args.first().unwrap_or(&""),
                stderr.trim()
            )))
        }
    }

    fn exec_git(cwd: &str, args: &[&str]) -> AppResult<String> {
        let normalized_path = Self::normalize_path(cwd)?;
        
        let mut cmd = std::process::Command::new("git");
        cmd.args(args)
            .current_dir(&normalized_path);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);
        let output = cmd
            .output()
            .map_err(|e| AppError::OperationFailed(format!("执行 git 命令失败: {}", e)))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Err(AppError::OperationFailed(format!(
                "git {} 失败: {}",
                args.first().unwrap_or(&""),
                stderr.trim()
            )))
        }
    }

    pub fn is_system_git_available() -> bool {
        let mut cmd = std::process::Command::new("git");
        cmd.arg("--version");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub async fn is_repo_async(&self, repo_path: &str) -> AppResult<bool> {
        match Self::exec_git_async(repo_path, &["rev-parse", "--git-dir"]).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn init_async(&self, path: String, default_branch: Option<String>) -> AppResult<serde_json::Value> {
        let mut args = vec!["init"];
        if let Some(ref branch) = default_branch {
            args.push("-b");
            args.push(branch);
        }
        Self::exec_git_async(&path, &args).await?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub async fn get_status_async(&self, repo_path: &str) -> AppResult<serde_json::Value> {
        let branch = Self::exec_git_async(repo_path, &["branch", "--show-current"])
            .await
            .map(|s| s.trim().to_string())
            .ok();

        let status_output = Self::exec_git_async(repo_path, &["status", "--porcelain=v1", "-z", "-uall"]).await?;
        let mut changes: Vec<serde_json::Value> = Vec::new();
        let mut staged_changes: Vec<serde_json::Value> = Vec::new();

        let entries: Vec<&str> = status_output.split('\0').filter(|s| !s.is_empty()).collect();
        let mut i = 0;

        let mut unstaged_paths: Vec<String> = Vec::new();
        let mut staged_paths: Vec<String> = Vec::new();

        let mut raw_entries: Vec<(String, Option<String>, &str, &str, bool)> = Vec::new();

        while i < entries.len() {
            let entry = entries[i];

            if entry.len() < 3 {
                i += 1;
                continue;
            }

            let status_code = &entry[0..2];
            let file_path: String;
            let mut old_path: Option<String> = None;

            let x = status_code.chars().next().unwrap_or(' ');
            let y = status_code.chars().nth(1).unwrap_or(' ');

            let (status, short) = match (x, y) {
                ('?', '?') => ("untracked", "?"),
                ('!', '!') => ("ignored", "!"),
                ('R', _) | ('C', _) => {
                    let st = if x == 'R' { "renamed" } else { "copied" };
                    let sh = if x == 'R' { "R" } else { "C" };
                    if i + 1 < entries.len() {
                        old_path = Some(entry[3..].to_string());
                        i += 1;
                        file_path = entries[i].to_string();
                    } else {
                        file_path = entry[3..].to_string();
                    }
                    let staged = x != ' ' && x != '?' && x != '!';
                    raw_entries.push((file_path.clone(), old_path, st, sh, staged));
                    if staged { staged_paths.push(file_path); } else { unstaged_paths.push(file_path); }
                    i += 1;
                    continue;
                }
                ('D', 'D') => ("modified", "M"),
                ('A', 'A') => ("added", "A"),
                ('U', 'U') => ("modified", "U"),
                (_, _) => {
                    let (st, sh) = if y == 'D' || x == 'D' {
                        ("deleted", "D")
                    } else if x == 'A' || y == 'A' {
                        ("added", "A")
                    } else {
                        ("modified", "M")
                    };
                    (st, sh)
                }
            };

            file_path = entry[3..].to_string();
            let staged = x != ' ' && x != '?' && x != '!';
            raw_entries.push((file_path.clone(), old_path, status, short, staged));
            if staged { staged_paths.push(file_path); } else { unstaged_paths.push(file_path); }

            i += 1;
        }

        let numstat_unstaged = Self::get_batch_numstat(repo_path, &unstaged_paths, false).await;
        let numstat_staged = Self::get_batch_numstat(repo_path, &staged_paths, true).await;

        for (file_path, old_path, status, short, staged) in raw_entries {
            let stats = if staged {
                numstat_staged.get(&file_path)
            } else {
                numstat_unstaged.get(&file_path)
            };
            let (additions, deletions) = stats.copied().unwrap_or((0, 0));

            let change = serde_json::json!({
                "path": file_path,
                "oldPath": old_path,
                "status": status,
                "statusShort": short,
                "staged": staged,
                "additions": additions,
                "deletions": deletions
            });

            if staged {
                staged_changes.push(change);
            } else {
                changes.push(change);
            }
        }

        let (ahead, behind) = match Self::exec_git_async(
            repo_path,
            &["rev-list", "--left-right", "@{upstream}...HEAD", "--count"],
        ).await {
            Ok(output) => {
                let re = regex::Regex::new(r"^(\d+)\s+(\d+)$").expect("invalid ahead/behind regex");
                if let Some(caps) = re.captures(output.trim()) {
                    (
                        caps.get(2).map(|m| m.as_str()).unwrap_or("0").parse::<u32>().unwrap_or(0),
                        caps.get(1).map(|m| m.as_str()).unwrap_or("0").parse::<u32>().unwrap_or(0),
                    )
                } else {
                    (0, 0)
                }
            }
            Err(_) => (0, 0),
        };

        let git_dir = PathBuf::from(repo_path).join(".git");
        let rebasing = git_dir.join("rebase-merge").exists() || git_dir.join("rebase-apply").exists();
        let merging = git_dir.join("MERGE_HEAD").exists();

        let conflicts = if merging {
            Self::exec_git_async(repo_path, &["diff", "--name-only", "--diff-filter=U"])
                .await
                .map(|s| s.split('\n').filter(|l| !l.is_empty()).map(|l| l.to_string()).collect())
                .unwrap_or_default()
        } else {
            Vec::new()
        };

        Ok(serde_json::json!({
            "success": true,
            "data": {
                "branch": branch,
                "hasChanges": !changes.is_empty() || !staged_changes.is_empty(),
                "hasStagedChanges": !staged_changes.is_empty(),
                "changes": changes,
                "stagedChanges": staged_changes,
                "ahead": ahead,
                "behind": behind,
                "rebasing": rebasing,
                "merging": merging,
                "conflicts": conflicts
            }
        }))
    }

    pub fn get_log(
        &self,
        repo_path: &str,
        max_count: Option<u32>,
        skip: Option<u32>,
        path: Option<String>,
        search: Option<String>,
        author: Option<String>,
    ) -> AppResult<serde_json::Value> {
        let mut args = vec![
            "log",
            "--pretty=format:%H%n%h%n%s%n%an%n%ae%n%at%n%P%n%D",
            "--date-order",
        ];

        let max_arg = max_count.map(|count| format!("-n{}", count));
        if let Some(ref arg) = max_arg {
            args.push(arg.as_str());
        }

        let skip_arg = skip.map(|s| format!("--skip={}", s));
        if let Some(ref arg) = skip_arg {
            args.push(arg.as_str());
        }

        let path_arg = path;
        if let Some(ref p) = path_arg {
            args.push("--");
            args.push(p.as_str());
        }

        let search_arg = search;
        if let Some(ref arg) = search_arg {
            args.push("--grep");
            args.push(arg.as_str());
        }

        let author_arg = author;
        if let Some(ref arg) = author_arg {
            args.push("--author");
            args.push(arg.as_str());
        }

        let output = match Self::exec_git(repo_path, &args) {
            Ok(out) => out,
            Err(e) => {
                let err_msg = format!("{}", e);
                if err_msg.contains("does not have any commits yet") {
                    return Ok(serde_json::json!({ "success": true, "data": [] }));
                }
                return Err(e);
            }
        };
        let mut commits = Vec::new();
        let lines: Vec<&str> = output.split('\n').collect();

        let mut i = 0;
        while i < lines.len() {
            let hash = lines.get(i).map(|s| s.trim()).unwrap_or("");
            if hash.is_empty() {
                break;
            }
            i += 1;

            let short_hash = lines.get(i).unwrap_or(&"").trim();
            i += 1;
            let message = lines.get(i).unwrap_or(&"").trim();
            i += 1;
            let author_name = lines.get(i).unwrap_or(&"").trim();
            i += 1;
            let author_email = lines.get(i).unwrap_or(&"").trim();
            i += 1;
            let timestamp: i64 = lines.get(i).unwrap_or(&"0").trim().parse().unwrap_or(0);
            i += 1;
            let parent_hashes: Vec<String> = lines
                .get(i)
                .unwrap_or(&"")
                .split(' ')
                .filter(|s| !s.is_empty())
                .map(|s| s.trim().to_string())
                .collect();
            i += 1;
            let refs_str = lines.get(i).unwrap_or(&"").trim();
            i += 1;

            let refs: Vec<String> = refs_str
                .split(',')
                .map(|r| r.trim().to_string())
                .filter(|r| !r.is_empty())
                .collect();

            let title = message.split('\n').next().unwrap_or("").to_string();

            let date = chrono::DateTime::from_timestamp(timestamp, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default();

            commits.push(serde_json::json!({
                "hash": hash,
                "shortHash": short_hash,
                "message": message,
                "title": title,
                "authorName": author_name,
                "authorEmail": author_email,
                "timestamp": timestamp,
                "date": date,
                "parentHashes": parent_hashes,
                "refs": refs
            }));
        }

        Ok(serde_json::json!({
            "success": true,
            "data": commits
        }))
    }

    pub fn add(&self, repo_path: &str, filepaths: Vec<String>) -> AppResult<serde_json::Value> {
        let mut args = vec!["add", "--"];
        for fp in &filepaths {
            args.push(fp);
        }
        Self::exec_git(repo_path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn unstage(&self, repo_path: &str, filepaths: Vec<String>) -> AppResult<serde_json::Value> {
        let has_head = Self::exec_git(repo_path, &["rev-parse", "HEAD"]).is_ok();
        if has_head {
            let mut args = vec!["restore", "--staged", "--"];
            for fp in &filepaths {
                args.push(fp);
            }
            Self::exec_git(repo_path, &args)?;
        } else {
            let mut args = vec!["rm", "--cached", "--"];
            for fp in &filepaths {
                args.push(fp);
            }
            Self::exec_git(repo_path, &args)?;
        }
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn commit(
        &self,
        repo_path: &str,
        message: String,
        all: Option<bool>,
        author_name: Option<String>,
        author_email: Option<String>,
    ) -> AppResult<serde_json::Value> {
        let mut args = vec!["commit", "-m", &message];
        if all.unwrap_or(false) {
            args.push("-a");
        }
        let author_arg = author_name.as_ref().zip(author_email.as_ref()).map(|(name, email)| format!("{} <{}>", name, email));
        if let Some(ref arg) = author_arg {
            args.push("--author");
            args.push(arg.as_str());
        }
        Self::exec_git(repo_path, &args)?;

        let hash = Self::exec_git(repo_path, &["rev-parse", "HEAD"])
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        Ok(serde_json::json!({ "success": true, "data": hash }))
    }

    pub fn reset(
        &self,
        repo_path: &str,
        commit: String,
        mode: String,
    ) -> AppResult<serde_json::Value> {
        let mode_flag = match mode.as_str() {
            "soft" => "--soft",
            "hard" => "--hard",
            _ => "--mixed",
        };
        Self::exec_git(repo_path, &["reset", mode_flag, &commit])?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn restore(
        &self,
        repo_path: &str,
        filepaths: Vec<String>,
        source: Option<String>,
    ) -> AppResult<serde_json::Value> {
        let mut args = vec!["restore"];
        if let Some(ref s) = source {
            args.push("-s");
            args.push(s.as_str());
        }
        args.push("--");
        for fp in &filepaths {
            args.push(fp);
        }
        Self::exec_git(repo_path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    async fn get_batch_numstat(
        repo_path: &str,
        paths: &[String],
        staged: bool,
    ) -> std::collections::HashMap<String, (u32, u32)> {
        let mut result = std::collections::HashMap::new();
        if paths.is_empty() {
            return result;
        }

        let mut args = if staged {
            vec!["diff", "--numstat", "--staged", "--"]
        } else {
            vec!["diff", "--numstat", "--"]
        };
        let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
        args.extend(path_refs);

        match Self::exec_git_async(repo_path, &args).await {
            Ok(numstat) => {
                let re = regex::Regex::new(r"^(\d+|-)\t(\d+|-)\t(.+)$").unwrap();
                for line in numstat.lines() {
                    if let Some(caps) = re.captures(line) {
                        let add = caps.get(1).map(|m| m.as_str()).unwrap_or("0");
                        let del = caps.get(2).map(|m| m.as_str()).unwrap_or("0");
                        let path = caps.get(3).map(|m| m.as_str().to_string()).unwrap_or_default();
                        let additions = if add == "-" { 0 } else { add.parse::<u32>().unwrap_or(0) };
                        let deletions = if del == "-" { 0 } else { del.parse::<u32>().unwrap_or(0) };
                        result.insert(path, (additions, deletions));
                    }
                }
            }
            Err(_) => {}
        }

        result
    }

    fn detect_file_status(repo_path: &str, filepath: &str, _staged: bool) -> (String, bool) {
        let status_args = vec!["status", "--porcelain", "-z", "--", filepath];
        if let Ok(output) = Self::exec_git(repo_path, &status_args) {
            let entries: Vec<&str> = output.split('\0').filter(|s| !s.is_empty()).collect();
            for entry in entries {
                if entry.len() < 3 {
                    continue;
                }
                let x = entry.chars().next().unwrap_or(' ');
                let y = entry.chars().nth(1).unwrap_or(' ');
                let status = match (x, y) {
                    ('?', '?') => "untracked",
                    ('!', '!') => "ignored",
                    ('D', _) | (_, 'D') => "deleted",
                    ('A', _) | (_, 'A') => "added",
                    ('R', _) => "renamed",
                    ('C', _) => "copied",
                    _ => "modified",
                };
                return (status.to_string(), false);
            }
        }
        ("modified".to_string(), false)
    }

    pub fn get_diff(
        &self,
        repo_path: &str,
        filepath: &str,
        staged: bool,
    ) -> AppResult<serde_json::Value> {
        let (status, binary) = Self::detect_file_status(repo_path, filepath, staged);

        let mut args = vec!["diff"];
        if staged {
            args.push("--staged");
        }
        args.push("--");
        args.push(filepath);

        let output = Self::exec_git(repo_path, &args);

        let (hunks, additions, deletions) = match output {
            Ok(ref out) if !out.trim().is_empty() => Self::parse_diff_output(out),
            Ok(_) => (Vec::new(), 0u32, 0u32),
            Err(_) => (Vec::new(), 0u32, 0u32),
        };

        Ok(serde_json::json!({
            "success": true,
            "data": {
                "path": filepath,
                "status": status,
                "binary": binary,
                "hunks": hunks,
                "additions": additions,
                "deletions": deletions
            }
        }))
    }

    pub fn get_commit_file_diff(
        &self,
        repo_path: &str,
        commit_hash: &str,
        filepath: &str,
    ) -> AppResult<serde_json::Value> {
        let output = Self::exec_git(repo_path, &["show", "--format=", commit_hash, "--", filepath]);

        let (hunks, additions, deletions) = match output {
            Ok(ref out) if !out.trim().is_empty() => Self::parse_diff_output(out),
            Ok(_) => (Vec::new(), 0u32, 0u32),
            Err(_) => (Vec::new(), 0u32, 0u32),
        };

        let status_args = vec!["diff-tree", "--no-commit-id", "--name-status", "-r", commit_hash, "--", filepath];
        let status = if let Ok(status_out) = Self::exec_git(repo_path, &status_args) {
            let first_line = status_out.lines().next().unwrap_or("");
            match first_line.chars().next().unwrap_or('M') {
                'A' => "added",
                'D' => "deleted",
                'R' => "renamed",
                'C' => "copied",
                _ => "modified",
            }
        } else {
            "modified"
        };

        Ok(serde_json::json!({
            "success": true,
            "data": {
                "path": filepath,
                "status": status,
                "binary": false,
                "hunks": hunks,
                "additions": additions,
                "deletions": deletions
            }
        }))
    }

    fn parse_diff_output(output: &str) -> (Vec<serde_json::Value>, u32, u32) {
        let mut hunks = Vec::new();
        let mut additions = 0u32;
        let mut deletions = 0u32;
        let mut current_hunk: Option<serde_json::Map<String, serde_json::Value>> = None;
        let mut old_line = 0u32;
        let mut new_line = 0u32;
        let mut current_lines = Vec::new();

        let hunk_re = regex::Regex::new(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$").unwrap();

        for line in output.split('\n') {
            if let Some(caps) = hunk_re.captures(line) {
                if let Some(hunk) = current_hunk.take() {
                    let mut final_hunk = hunk;
                    final_hunk.insert("lines".to_string(), serde_json::Value::Array(current_lines.clone()));
                    hunks.push(serde_json::Value::Object(final_hunk));
                    current_lines.clear();
                }

                old_line = caps.get(1).unwrap().as_str().parse().unwrap_or(1);
                new_line = caps.get(3).unwrap().as_str().parse().unwrap_or(1);

                let old_lines: u32 = caps.get(2)
                    .map(|m| m.as_str().parse().unwrap_or(1))
                    .unwrap_or(1);
                let new_lines: u32 = caps.get(4)
                    .map(|m| m.as_str().parse().unwrap_or(1))
                    .unwrap_or(1);
                let header: &str = caps.get(5)
                    .map(|m| m.as_str().trim())
                    .unwrap_or("");

                let mut hunk = serde_json::Map::new();
                hunk.insert("oldStart".to_string(), serde_json::json!(old_line));
                hunk.insert("oldLines".to_string(), serde_json::json!(old_lines));
                hunk.insert("newStart".to_string(), serde_json::json!(new_line));
                hunk.insert("newLines".to_string(), serde_json::json!(new_lines));
                hunk.insert("header".to_string(), serde_json::json!(header));

                current_hunk = Some(hunk);
                continue;
            }

            if current_hunk.is_some() {
                if let Some(rest) = line.strip_prefix('+') {
                    current_lines.push(serde_json::json!({
                        "type": "add",
                        "newLineNumber": new_line,
                        "content": rest
                    }));
                    new_line += 1;
                    additions += 1;
                } else if let Some(rest) = line.strip_prefix('-') {
                    current_lines.push(serde_json::json!({
                        "type": "delete",
                        "oldLineNumber": old_line,
                        "content": rest
                    }));
                    old_line += 1;
                    deletions += 1;
                } else if let Some(rest) = line.strip_prefix(' ') {
                    current_lines.push(serde_json::json!({
                        "type": "context",
                        "oldLineNumber": old_line,
                        "newLineNumber": new_line,
                        "content": rest
                    }));
                    old_line += 1;
                    new_line += 1;
                }
            }
        }

        if let Some(hunk) = current_hunk.take() {
            let mut final_hunk = hunk;
            final_hunk.insert("lines".to_string(), serde_json::Value::Array(current_lines));
            hunks.push(serde_json::Value::Object(final_hunk));
        }

        (hunks, additions, deletions)
    }

    pub fn get_commit_files(
        &self,
        repo_path: &str,
        commit_hash: &str,
    ) -> AppResult<serde_json::Value> {
        let output = Self::exec_git(
            repo_path,
            &["diff-tree", "--no-commit-id", "--name-status", "-r", commit_hash],
        )?;

        let mut changes = Vec::new();
        for line in output.split('\n').filter(|l| !l.trim().is_empty()) {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() < 2 {
                continue;
            }

            let status_char = parts[0];
            let (status, short) = match status_char {
                "A" => ("added", "A"),
                "D" => ("deleted", "D"),
                "M" => ("modified", "M"),
                "R" => ("renamed", "R"),
                "C" => ("copied", "C"),
                _ => ("modified", "M"),
            };

            let path = if status_char == "R" && parts.len() >= 3 {
                parts[2].to_string()
            } else {
                parts[1].to_string()
            };

            let old_path = if status_char == "R" && parts.len() >= 3 {
                Some(parts[1].to_string())
            } else {
                None
            };

            changes.push(serde_json::json!({
                "path": path,
                "oldPath": old_path,
                "status": status,
                "statusShort": short,
                "staged": false,
                "additions": 0,
                "deletions": 0
            }));
        }

        Ok(serde_json::json!({ "success": true, "data": changes }))
    }

    pub fn get_branches(&self, repo_path: &str) -> AppResult<serde_json::Value> {
        let output = Self::exec_git(repo_path, &["branch", "-v", "--no-abbrev"])?;
        let mut branches = Vec::new();

        for line in output.split('\n') {
            let re = regex::Regex::new(r"^([* ]) (.+?)\s+([a-f0-9]+) (.+)$").expect("invalid branch regex");
            if let Some(caps) = re.captures(line) {
                let current = caps.get(1).map(|m| m.as_str()).unwrap_or(" ") == "*";
                branches.push(serde_json::json!({
                    "name": caps.get(2).map(|m| m.as_str()).unwrap_or("").trim(),
                    "current": current,
                    "remote": false,
                    "lastCommit": {
                        "hash": caps.get(3).map(|m| m.as_str()).unwrap_or(""),
                        "shortHash": caps.get(3).map(|m| m.as_str()).unwrap_or("").get(0..7).unwrap_or(""),
                        "message": caps.get(4).map(|m| m.as_str()).unwrap_or("").trim(),
                        "title": caps.get(4).map(|m| m.as_str()).unwrap_or("").trim(),
                        "authorName": "",
                        "authorEmail": "",
                        "timestamp": 0,
                        "date": "",
                        "parentHashes": [],
                        "refs": []
                    }
                }));
            }
        }

        let remote_output = Self::exec_git(repo_path, &["branch", "-r", "-v", "--no-abbrev"])?;
        for line in remote_output.split('\n') {
            let re = regex::Regex::new(r"^ {2}(.+?)\s+([a-f0-9]+) (.+)$").expect("invalid remote branch regex");
            if let Some(caps) = re.captures(line) {
                branches.push(serde_json::json!({
                    "name": caps.get(1).map(|m| m.as_str()).unwrap_or("").trim(),
                    "current": false,
                    "remote": true,
                    "lastCommit": {
                        "hash": caps.get(2).map(|m| m.as_str()).unwrap_or(""),
                        "shortHash": caps.get(2).map(|m| m.as_str()).unwrap_or("").get(0..7).unwrap_or(""),
                        "message": caps.get(3).map(|m| m.as_str()).unwrap_or("").trim(),
                        "title": caps.get(3).map(|m| m.as_str()).unwrap_or("").trim(),
                        "authorName": "",
                        "authorEmail": "",
                        "timestamp": 0,
                        "date": "",
                        "parentHashes": [],
                        "refs": []
                    }
                }));
            }
        }

        Ok(serde_json::json!({ "success": true, "data": branches }))
    }

    pub fn create_branch(
        &self,
        repo_path: &str,
        name: &str,
        start_point: Option<String>,
    ) -> AppResult<serde_json::Value> {
        let mut args = vec!["branch", name];
        if let Some(ref sp) = start_point {
            args.push(sp.as_str());
        }
        Self::exec_git(repo_path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn delete_branch(
        &self,
        repo_path: &str,
        name: &str,
        force: bool,
    ) -> AppResult<serde_json::Value> {
        let flag = if force { "-D" } else { "-d" };
        Self::exec_git(repo_path, &["branch", flag, name])?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn rename_branch(
        &self,
        repo_path: &str,
        old_name: &str,
        new_name: &str,
    ) -> AppResult<serde_json::Value> {
        Self::exec_git(repo_path, &["branch", "-m", old_name, new_name])?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn checkout(
        &self,
        repo_path: &str,
        target: String,
        create_branch: Option<bool>,
        force: Option<bool>,
        paths: Option<Vec<String>>,
    ) -> AppResult<serde_json::Value> {
        let mut args = vec!["checkout"];
        if create_branch.unwrap_or(false) {
            args.push("-b");
        }
        if force.unwrap_or(false) {
            args.push("-f");
        }
        args.push(&target);
        if let Some(ref ps) = paths {
            args.push("--");
            for p in ps {
                args.push(p);
            }
        }
        Self::exec_git(repo_path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn merge(
        &self,
        repo_path: &str,
        branch: String,
        allow_unrelated_histories: Option<bool>,
        message: Option<String>,
    ) -> AppResult<serde_json::Value> {
        let mut args = vec!["merge", &branch];
        if allow_unrelated_histories.unwrap_or(false) {
            args.push("--allow-unrelated-histories");
        }
        if let Some(ref m) = message {
            args.push("-m");
            args.push(m.as_str());
        }
        Self::exec_git(repo_path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn get_config(&self, repo_path: &str, key: &str) -> AppResult<serde_json::Value> {
        let value = Self::exec_git(repo_path, &["config", "--get", key])?;
        Ok(serde_json::json!({ "success": true, "data": value.trim() }))
    }

    pub fn check_author_identity(&self, repo_path: &str) -> AppResult<serde_json::Value> {
        let user_name = Self::exec_git(repo_path, &["config", "user.name"])
            .map(|s| s.trim().to_string())
            .ok()
            .filter(|s| !s.is_empty());
        let user_email = Self::exec_git(repo_path, &["config", "user.email"])
            .map(|s| s.trim().to_string())
            .ok()
            .filter(|s| !s.is_empty());
        let has_identity = user_name.is_some() && user_email.is_some();
        Ok(serde_json::json!({
            "success": true,
            "data": {
                "hasIdentity": has_identity,
                "userName": user_name,
                "userEmail": user_email
            }
        }))
    }

    pub fn set_config(
        &self,
        repo_path: &str,
        key: &str,
        value: &str,
        scope: Option<String>,
    ) -> AppResult<serde_json::Value> {
        let mut args = vec!["config"];
        match scope.as_deref() {
            Some("global") => args.push("--global"),
            Some("local") => args.push("--local"),
            _ => {}
        }
        args.push(key);
        args.push(value);
        Self::exec_git(repo_path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn set_mode(&self, mode: String) {
        if let Ok(mut m) = self.mode.lock() {
            *m = mode;
        }
    }

    pub fn get_mode(&self) -> String {
        self.mode.lock().map(|m| m.clone()).unwrap_or_else(|_| "auto".to_string())
    }
}

impl Default for GitService {
    fn default() -> Self {
        Self::new()
    }
}
