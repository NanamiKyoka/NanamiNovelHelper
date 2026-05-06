use crate::error::{AppError, AppResult};
use crate::services::project_state;
use std::path::PathBuf;
use std::process::Command;

pub struct GitService;

impl GitService {
    pub fn new() -> Self {
        Self
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    fn exec_git(cwd: &str, args: &[&str]) -> AppResult<String> {
        let output = Command::new("git")
            .args(args)
            .current_dir(cwd)
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
        Command::new("git")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub fn is_repo(&self, repo_path: &str) -> AppResult<bool> {
        match Self::exec_git(repo_path, &["rev-parse", "--git-dir"]) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub fn init(&self, path: String, default_branch: Option<String>) -> AppResult<serde_json::Value> {
        let mut args = vec!["init"];
        let mut branch_arg = String::new();
        if let Some(ref branch) = default_branch {
            branch_arg = format!("-b {}", branch);
            args.push("-b");
            args.push(branch);
        }
        Self::exec_git(&path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn get_status(&self, repo_path: &str) -> AppResult<serde_json::Value> {
        let branch = Self::exec_git(repo_path, &["branch", "--show-current"])
            .map(|s| s.trim().to_string())
            .ok();

        let status_output = Self::exec_git(repo_path, &["status", "--porcelain=v1", "-uall"])?;
        let mut changes: Vec<serde_json::Value> = Vec::new();
        let mut staged_changes: Vec<serde_json::Value> = Vec::new();

        for entry in status_output.split('\0').filter(|s| !s.is_empty()) {
            if entry.len() < 3 {
                continue;
            }

            let status_code = &entry[0..2];
            let file_path = &entry[3..];
            let mut old_path: Option<String> = None;

            let (status, short) = match status_code {
                " M" | "M " | "MM" => ("modified", "M"),
                " A" | "A " | "AM" => ("added", "A"),
                " D" | "D " => ("deleted", "D"),
                "R " => ("renamed", "R"),
                "C " => ("copied", "C"),
                "??" => ("untracked", "?"),
                "!!" => ("ignored", "!"),
                _ => continue,
            };

            let staged = !status_code.starts_with(' ') && !status_code.starts_with('?');

            let (additions, deletions) = if !file_path.is_empty() {
                let numstat_args = if staged {
                    vec!["diff", "--numstat", "--staged", "--", file_path]
                } else {
                    vec!["diff", "--numstat", "--", file_path]
                };
                match Self::exec_git(repo_path, &numstat_args) {
                    Ok(numstat) => {
                        let re = regex::Regex::new(r"^(\d+|-)\t(\d+|-)").unwrap();
                        if let Some(caps) = re.captures(numstat.trim()) {
                            let add = caps.get(1).map(|m| m.as_str()).unwrap_or("0");
                            let del = caps.get(2).map(|m| m.as_str()).unwrap_or("0");
                            (
                                if add == "-" { 0 } else { add.parse::<u32>().unwrap_or(0) },
                                if del == "-" { 0 } else { del.parse::<u32>().unwrap_or(0) },
                            )
                        } else {
                            (0, 0)
                        }
                    }
                    Err(_) => (0, 0),
                }
            } else {
                (0, 0)
            };

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

        let (ahead, behind) = match Self::exec_git(
            repo_path,
            &["rev-list", "--left-right", "@{upstream}...HEAD", "--count"],
        ) {
            Ok(output) => {
                let re = regex::Regex::new(r"^(\d+)\s+(\d+)$").unwrap();
                if let Some(caps) = re.captures(output.trim()) {
                    (
                        caps.get(2).unwrap().as_str().parse::<u32>().unwrap_or(0),
                        caps.get(1).unwrap().as_str().parse::<u32>().unwrap_or(0),
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
            Self::exec_git(repo_path, &["diff", "--name-only", "--diff-filter=U"])
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

        let mut max_arg = String::new();
        if let Some(count) = max_count {
            max_arg = format!("-n{}", count);
            args.push(&max_arg);
        }

        let mut skip_arg = String::new();
        if let Some(s) = skip {
            skip_arg = format!("--skip={}", s);
            args.push(&skip_arg);
        }

        let mut path_arg = String::new();
        if let Some(ref p) = path {
            path_arg = p.clone();
            args.push("--");
            args.push(&path_arg);
        }

        let mut search_arg = String::new();
        if let Some(ref s) = search {
            search_arg = s.clone();
            args.push("--grep");
            args.push(&search_arg);
        }

        let mut author_arg = String::new();
        if let Some(ref a) = author {
            author_arg = a.clone();
            args.push("--author");
            args.push(&author_arg);
        }

        let output = Self::exec_git(repo_path, &args)?;
        let mut commits = Vec::new();
        let lines: Vec<&str> = output.split('\n').collect();

        let mut i = 0;
        while i < lines.len() {
            let hash = lines.get(i).map(|s| s.trim()).unwrap_or("");
            if hash.is_empty() {
                i += 1;
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
        let mut args = vec!["restore", "--staged", "--"];
        for fp in &filepaths {
            args.push(fp);
        }
        Self::exec_git(repo_path, &args)?;
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
        let mut author_arg = String::new();
        if let (Some(name), Some(email)) = (&author_name, &author_email) {
            author_arg = format!("{} <{}>", name, email);
            args.push("--author");
            args.push(&author_arg);
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
        let mut source_arg = String::new();
        if let Some(ref s) = source {
            source_arg = s.clone();
            args.push("-s");
            args.push(&source_arg);
        }
        args.push("--");
        for fp in &filepaths {
            args.push(fp);
        }
        Self::exec_git(repo_path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn get_diff(
        &self,
        repo_path: &str,
        filepath: &str,
        staged: bool,
    ) -> AppResult<serde_json::Value> {
        let mut args = vec!["diff"];
        if staged {
            args.push("--staged");
        }
        args.push("--");
        args.push(filepath);

        let output = Self::exec_git(repo_path, &args)?;
        let (hunks, additions, deletions) = Self::parse_diff_output(&output);

        Ok(serde_json::json!({
            "success": true,
            "data": {
                "path": filepath,
                "status": "modified",
                "binary": false,
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
        let output = Self::exec_git(repo_path, &["show", "--format=", commit_hash, "--", filepath])?;
        let (hunks, additions, deletions) = Self::parse_diff_output(&output);

        Ok(serde_json::json!({
            "success": true,
            "data": {
                "path": filepath,
                "status": "modified",
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

                let mut hunk = serde_json::Map::new();
                hunk.insert("oldStart".to_string(), serde_json::json!(old_line));
                hunk.insert("oldLines".to_string(), serde_json::json!(caps.get(2).unwrap().as_str().parse::<u32>().unwrap_or(1)));
                hunk.insert("newStart".to_string(), serde_json::json!(new_line));
                hunk.insert("newLines".to_string(), serde_json::json!(caps.get(4).unwrap().as_str().parse::<u32>().unwrap_or(1)));
                hunk.insert("header".to_string(), serde_json::json!(caps.get(5).unwrap().as_str().trim()));

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
            let re = regex::Regex::new(r"^([* ]) (.+?)\s+([a-f0-9]+) (.+)$").unwrap();
            if let Some(caps) = re.captures(line) {
                let current = caps.get(1).unwrap().as_str() == "*";
                branches.push(serde_json::json!({
                    "name": caps.get(2).unwrap().as_str().trim(),
                    "current": current,
                    "remote": false,
                    "lastCommit": {
                        "hash": caps.get(3).unwrap().as_str(),
                        "shortHash": caps.get(3).unwrap().as_str().get(0..7).unwrap_or(""),
                        "message": caps.get(4).unwrap().as_str().trim(),
                        "title": caps.get(4).unwrap().as_str().trim(),
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
            let re = regex::Regex::new(r"^ {2}(.+?)\s+([a-f0-9]+) (.+)$").unwrap();
            if let Some(caps) = re.captures(line) {
                branches.push(serde_json::json!({
                    "name": caps.get(1).unwrap().as_str().trim(),
                    "current": false,
                    "remote": true,
                    "lastCommit": {
                        "hash": caps.get(2).unwrap().as_str(),
                        "shortHash": caps.get(2).unwrap().as_str().get(0..7).unwrap_or(""),
                        "message": caps.get(3).unwrap().as_str().trim(),
                        "title": caps.get(3).unwrap().as_str().trim(),
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
        let mut sp_arg = String::new();
        if let Some(ref sp) = start_point {
            sp_arg = sp.clone();
            args.push(&sp_arg);
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
        let mut msg_arg = String::new();
        if let Some(ref m) = message {
            msg_arg = m.clone();
            args.push("-m");
            args.push(&msg_arg);
        }
        Self::exec_git(repo_path, &args)?;
        Ok(serde_json::json!({ "success": true }))
    }

    pub fn get_config(&self, repo_path: &str, key: &str) -> AppResult<serde_json::Value> {
        let value = Self::exec_git(repo_path, &["config", "--get", key])?;
        Ok(serde_json::json!({ "success": true, "data": value.trim() }))
    }

    pub fn set_config(
        &self,
        repo_path: &str,
        key: &str,
        value: &str,
    ) -> AppResult<serde_json::Value> {
        Self::exec_git(repo_path, &["config", key, value])?;
        Ok(serde_json::json!({ "success": true }))
    }
}

impl Default for GitService {
    fn default() -> Self {
        Self::new()
    }
}
