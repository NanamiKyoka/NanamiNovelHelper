use crate::error::{AppError, AppResult};
use crate::services::project_state;
use crate::utils::{ensure_dir, generate_id, generate_timestamp, read_json5_file, write_json5_file};
use base64::Engine;
use std::fs;
use std::path::PathBuf;

pub struct GraphService;

impl GraphService {
    pub fn new() -> Self {
        Self
    }

    fn get_data_dir(project_path: &str, sub_dir: &str) -> PathBuf {
        project_state::get_data_dir(project_path).join(sub_dir)
    }

    fn get_item_path(project_path: &str, sub_dir: &str, id: &str) -> PathBuf {
        Self::get_data_dir(project_path, sub_dir).join(format!("{}.json5", id))
    }

    fn get_thumbnails_dir(project_path: &str, sub_dir: &str) -> PathBuf {
        Self::get_data_dir(project_path, sub_dir).join("thumbnails")
    }

    fn get_project_path() -> AppResult<String> {
        project_state::get_project_path().ok_or(AppError::ProjectNotOpen)
    }

    pub fn get_list(&self, sub_dir: &str) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let data_dir = Self::get_data_dir(&project_path, sub_dir);
        if !data_dir.exists() {
            return Ok(vec![]);
        }
        let mut items = Vec::new();
        let entries = fs::read_dir(&data_dir).map_err(|e| {
            AppError::OperationFailed(format!("读取目录失败: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                AppError::OperationFailed(format!("读取目录条目失败: {}", e))
            })?;
            let path = entry.path();
            if path.extension().map(|e| e == "json5").unwrap_or(false) {
                if let Ok(item) = read_json5_file::<serde_json::Value>(&path) {
                    items.push(item);
                }
            }
        }

        items.sort_by(|a, b| {
            let order_a = a.get("order").and_then(|v| v.as_i64()).unwrap_or(0);
            let order_b = b.get("order").and_then(|v| v.as_i64()).unwrap_or(0);
            order_a.cmp(&order_b)
        });

        Ok(items)
    }

    pub fn get(&self, sub_dir: &str, id: &str) -> AppResult<Option<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(None);
        }
        match read_json5_file::<serde_json::Value>(&path) {
            Ok(mut item) => {
                if let Some(obj) = item.as_object_mut() {
                    if !obj.contains_key("nodes") {
                        obj.insert("nodes".to_string(), serde_json::Value::Array(vec![]));
                    }
                    if !obj.contains_key("edges") {
                        obj.insert("edges".to_string(), serde_json::Value::Array(vec![]));
                    }
                }
                Ok(Some(item))
            }
            Err(_) => Ok(None),
        }
    }

    pub fn create(&self, sub_dir: &str, data: serde_json::Value) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let id = generate_id();
        let now = generate_timestamp();

        let list = self.get_list(sub_dir)?;
        let order = list.len() as i32;

        let mut item = data;
        if let Some(obj) = item.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
            obj.insert("createdAt".to_string(), serde_json::Value::String(now.clone()));
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));
            obj.insert("order".to_string(), serde_json::Value::Number(order.into()));
            if !obj.contains_key("nodes") {
                obj.insert("nodes".to_string(), serde_json::Value::Array(vec![]));
            }
            if !obj.contains_key("edges") {
                obj.insert("edges".to_string(), serde_json::Value::Array(vec![]));
            }
            if !obj.contains_key("nodeCount") {
                obj.insert("nodeCount".to_string(), serde_json::Value::Number(0.into()));
            }
            if !obj.contains_key("edgeCount") {
                obj.insert("edgeCount".to_string(), serde_json::Value::Number(0.into()));
            }
        }

        let path = Self::get_item_path(&project_path, sub_dir, &id);
        write_json5_file(&path, &item)?;
        Ok(item)
    }

    pub fn update(&self, sub_dir: &str, id: &str, updates: serde_json::Value) -> AppResult<Option<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(None);
        }

        let mut item: serde_json::Value = read_json5_file(&path).map_err(|_| {
            AppError::OperationFailed(format!("解析文件失败: {}", id))
        })?;

        let now = generate_timestamp();
        merge_json_value(&mut item, updates);
        if let Some(obj) = item.as_object_mut() {
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));
        }

        write_json5_file(&path, &item)?;
        Ok(Some(item))
    }

    pub fn delete(&self, sub_dir: &str, id: &str) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(false);
        }
        fs::remove_file(&path).map_err(|e| {
            AppError::OperationFailed(format!("删除失败: {}", e))
        })?;

        let thumb_dir = Self::get_thumbnails_dir(&project_path, sub_dir);
        let thumb_path = thumb_dir.join(format!("{}.png", id));
        let _ = fs::remove_file(thumb_path);

        Ok(true)
    }

    pub fn save_thumbnail(&self, sub_dir: &str, id: &str, data_url: String) -> AppResult<Option<String>> {
        let project_path = Self::get_project_path()?;
        let thumb_dir = Self::get_thumbnails_dir(&project_path, sub_dir);
        ensure_dir(&thumb_dir)?;

        let base64_data = if data_url.starts_with("data:image/png;base64,") {
            &data_url["data:image/png;base64,".len()..]
        } else if data_url.starts_with("data:image/") {
            if let Some(idx) = data_url.find(";base64,") {
                &data_url[idx + ";base64,".len()..]
            } else {
                return Err(AppError::InvalidParam("无效的 data URL 格式".to_string()));
            }
        } else {
            return Err(AppError::InvalidParam("无效的 data URL 格式".to_string()));
        };

        let image_data = base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .map_err(|e| AppError::OperationFailed(format!("Base64 解码失败: {}", e)))?;

        let thumb_path = thumb_dir.join(format!("{}.png", id));
        fs::write(&thumb_path, image_data).map_err(|e| {
            AppError::OperationFailed(format!("保存缩略图失败: {}", e))
        })?;

        let item_path = Self::get_item_path(&project_path, sub_dir, id);
        if item_path.exists() {
            if let Ok(mut item) = read_json5_file::<serde_json::Value>(&item_path) {
                if let Some(obj) = item.as_object_mut() {
                    obj.insert("thumbnail".to_string(), serde_json::Value::String(thumb_path.to_string_lossy().to_string()));
                }
                let _ = write_json5_file(&item_path, &item);
            }
        }

        Ok(Some(thumb_path.to_string_lossy().to_string()))
    }

    pub fn get_thumbnail_path(&self, sub_dir: &str, id: &str) -> AppResult<Option<String>> {
        let project_path = Self::get_project_path()?;
        let thumb_path = Self::get_thumbnails_dir(&project_path, sub_dir).join(format!("{}.png", id));
        if thumb_path.exists() {
            Ok(Some(thumb_path.to_string_lossy().to_string()))
        } else {
            Ok(None)
        }
    }

    pub fn export_item(&self, sub_dir: &str, id: &str) -> AppResult<Option<String>> {
        let item = self.get(sub_dir, id)?;
        match item {
            Some(val) => {
                let json5_str = json5::to_string(&val).unwrap_or_else(|_| serde_json::to_string_pretty(&val).unwrap_or_default());
                Ok(Some(json5_str))
            }
            None => Ok(None),
        }
    }

    pub fn import_item(&self, sub_dir: &str, json_content: String) -> AppResult<Option<serde_json::Value>> {
        let parsed: serde_json::Value = json5::from_str(&json_content).map_err(|e| {
            AppError::InvalidParam(format!("JSON5 解析失败: {}", e))
        })?;

        let new_id = generate_id();
        let now = generate_timestamp();

        let mut item = parsed;
        if let Some(obj) = item.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(new_id.clone()));
            obj.insert("createdAt".to_string(), serde_json::Value::String(now.clone()));
            obj.insert("updatedAt".to_string(), serde_json::Value::String(now));
            obj.remove("thumbnail");
        }

        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, &new_id);
        write_json5_file(&path, &item)?;
        Ok(Some(item))
    }

    pub fn reorder(&self, sub_dir: &str, ids: Vec<String>) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        for (index, id) in ids.iter().enumerate() {
            let path = Self::get_item_path(&project_path, sub_dir, id);
            if path.exists() {
                if let Ok(mut item) = read_json5_file::<serde_json::Value>(&path) {
                    if let Some(obj) = item.as_object_mut() {
                        obj.insert("order".to_string(), serde_json::Value::Number((index as i32).into()));
                    }
                    let _ = write_json5_file(&path, &item);
                }
            }
        }
        Ok(true)
    }

    pub fn batch_delete_nodes(&self, sub_dir: &str, id: &str, node_ids: Vec<String>) -> AppResult<u64> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Err(AppError::FileNotFound(id.to_string()));
        }
        let mut item = read_json5_file::<serde_json::Value>(&path)?;
        let mut deleted = 0u64;
        if let Some(nodes) = item.get_mut("nodes").and_then(|n| n.as_array_mut()) {
            let before = nodes.len();
            nodes.retain(|n| {
                n.get("id").and_then(|v| v.as_str()).map(|s| !node_ids.iter().any(|nid| nid == s)).unwrap_or(true)
            });
            deleted = (before - nodes.len()) as u64;
            for (i, node) in nodes.iter_mut().enumerate() {
                if let Some(obj) = node.as_object_mut() {
                    obj.insert("order".to_string(), serde_json::Value::Number((i as i32).into()));
                }
            }
        }
        if let Some(obj) = item.as_object_mut() {
            obj.insert("updatedAt".to_string(), serde_json::Value::String(generate_timestamp()));
        }
        write_json5_file(&path, &item)?;
        Ok(deleted)
    }

    pub fn move_node(&self, sub_dir: &str, id: &str, node_id: &str, new_order: i32) -> AppResult<Option<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(None);
        }
        let mut item = read_json5_file::<serde_json::Value>(&path)?;
        if let Some(nodes) = item.get_mut("nodes").and_then(|n| n.as_array_mut()) {
            let pos = nodes.iter().position(|n| n.get("id").and_then(|v| v.as_str()) == Some(node_id));
            if let Some(pos) = pos {
                let node = nodes.remove(pos);
                let insert_pos = (new_order as usize).min(nodes.len());
                nodes.insert(insert_pos, node);
                for (i, n) in nodes.iter_mut().enumerate() {
                    if let Some(obj) = n.as_object_mut() {
                        obj.insert("order".to_string(), serde_json::Value::Number((i as i32).into()));
                    }
                }
            }
        }
        if let Some(obj) = item.as_object_mut() {
            obj.insert("updatedAt".to_string(), serde_json::Value::String(generate_timestamp()));
        }
        write_json5_file(&path, &item)?;
        Ok(item.get("nodes").cloned())
    }

    pub fn batch_move_nodes(&self, sub_dir: &str, id: &str, node_ids: Vec<String>, target_order: i32) -> AppResult<Option<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(None);
        }
        let mut item = read_json5_file::<serde_json::Value>(&path)?;
        if let Some(nodes) = item.get_mut("nodes").and_then(|n| n.as_array_mut()) {
            let mut moved: Vec<serde_json::Value> = Vec::new();
            let ids_set: Vec<&str> = node_ids.iter().map(|s| s.as_str()).collect();
            let mut remaining: Vec<serde_json::Value> = Vec::new();
            for n in nodes.drain(..) {
                if n.get("id").and_then(|v| v.as_str()).map(|s| ids_set.contains(&s)).unwrap_or(false) {
                    moved.push(n);
                } else {
                    remaining.push(n);
                }
            }
            let insert_pos = (target_order as usize).min(remaining.len());
            let mut result = remaining;
            result.splice(insert_pos..insert_pos, moved);
            *nodes = result;
            for (i, n) in nodes.iter_mut().enumerate() {
                if let Some(obj) = n.as_object_mut() {
                    obj.insert("order".to_string(), serde_json::Value::Number((i as i32).into()));
                }
            }
        }
        if let Some(obj) = item.as_object_mut() {
            obj.insert("updatedAt".to_string(), serde_json::Value::String(generate_timestamp()));
        }
        write_json5_file(&path, &item)?;
        Ok(item.get("nodes").cloned())
    }

    pub fn create_branch(&self, parent_timeline_id: &str, branch_from_node_id: &str, name: Option<String>) -> AppResult<serde_json::Value> {
        let project_path = Self::get_project_path()?;
        let parent_path = Self::get_item_path(&project_path, "timelines", parent_timeline_id);
        if !parent_path.exists() {
            return Err(AppError::FileNotFound(parent_timeline_id.to_string()));
        }
        let parent = read_json5_file::<serde_json::Value>(&parent_path)?;
        let parent_nodes = parent.get("nodes").and_then(|n| n.as_array()).cloned().unwrap_or_default();
        let branch_point = parent_nodes.iter().position(|n| n.get("id").and_then(|v| v.as_str()) == Some(branch_from_node_id));
        let branch_nodes = if let Some(pos) = branch_point {
            parent_nodes[..=pos].to_vec()
        } else {
            parent_nodes.clone()
        };
        let branch_id = generate_id();
        let branch_name = name.unwrap_or_else(|| format!("{}-分支", parent.get("name").and_then(|v| v.as_str()).unwrap_or("时间线")));
        let branch = serde_json::json!({
            "id": branch_id,
            "name": branch_name,
            "nodes": branch_nodes,
            "nodeCount": branch_nodes.len(),
            "parentTimelineId": parent_timeline_id,
            "branchFromNodeId": branch_from_node_id,
            "isBranch": true,
            "createdAt": generate_timestamp(),
            "updatedAt": generate_timestamp(),
            "order": 0
        });
        let branch_path = Self::get_item_path(&project_path, "timelines", &branch_id);
        write_json5_file(&branch_path, &branch)?;
        Ok(branch)
    }

    pub fn merge_branch(&self, branch_timeline_id: &str, target_timeline_id: &str, target_node_id: Option<String>) -> AppResult<bool> {
        let project_path = Self::get_project_path()?;
        let branch_path = Self::get_item_path(&project_path, "timelines", branch_timeline_id);
        let target_path = Self::get_item_path(&project_path, "timelines", target_timeline_id);
        if !branch_path.exists() || !target_path.exists() {
            return Ok(false);
        }
        let branch = read_json5_file::<serde_json::Value>(&branch_path)?;
        let mut target = read_json5_file::<serde_json::Value>(&target_path)?;
        let branch_nodes = branch.get("nodes").and_then(|n| n.as_array()).cloned().unwrap_or_default();
        if let Some(target_nodes) = target.get_mut("nodes").and_then(|n| n.as_array_mut()) {
            if let Some(ref nid) = target_node_id {
                let pos = target_nodes.iter().position(|n| n.get("id").and_then(|v| v.as_str()) == Some(nid.as_str()));
                if let Some(pos) = pos {
                    let start_order = target_nodes.len();
                    for (i, node) in branch_nodes.into_iter().enumerate() {
                        let mut n = node;
                        if let Some(obj) = n.as_object_mut() {
                            obj.insert("order".to_string(), serde_json::Value::Number(((start_order + i) as i32).into()));
                        }
                        target_nodes.insert(pos + 1 + i, n);
                    }
                }
            } else {
                let start_order = target_nodes.len();
                for (i, node) in branch_nodes.into_iter().enumerate() {
                    let mut n = node;
                    if let Some(obj) = n.as_object_mut() {
                        obj.insert("order".to_string(), serde_json::Value::Number(((start_order + i) as i32).into()));
                    }
                    target_nodes.push(n);
                }
            }
        }
        if let Some(obj) = target.as_object_mut() {
            if let Some(nodes) = obj.get("nodes").and_then(|n| n.as_array()) {
                obj.insert("nodeCount".to_string(), serde_json::Value::Number((nodes.len() as i32).into()));
            }
            obj.insert("updatedAt".to_string(), serde_json::Value::String(generate_timestamp()));
        }
        write_json5_file(&target_path, &target)?;
        Ok(true)
    }

    pub fn get_branches(&self, parent_timeline_id: &str) -> AppResult<Vec<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let dir = Self::get_data_dir(&project_path, "timelines");
        if !dir.exists() {
            return Ok(Vec::new());
        }
        let mut branches = Vec::new();
        for entry in fs::read_dir(&dir).map_err(|e| AppError::OperationFailed(format!("读取目录失败: {}", e)))? {
            let entry = entry.map_err(|e| AppError::OperationFailed(format!("读取条目失败: {}", e)))?;
            let path = entry.path();
            if path.extension().map(|e| e == "json5").unwrap_or(false) {
                if let Ok(item) = read_json5_file::<serde_json::Value>(&path) {
                    if item.get("parentTimelineId").and_then(|v| v.as_str()) == Some(parent_timeline_id) {
                        branches.push(item);
                    }
                }
            }
        }
        Ok(branches)
    }

    pub fn get_branch_source_node(&self, timeline_id: &str) -> AppResult<Option<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, "timelines", timeline_id);
        if !path.exists() {
            return Ok(None);
        }
        let item = read_json5_file::<serde_json::Value>(&path)?;
        let branch_from_node_id = item.get("branchFromNodeId").and_then(|v| v.as_str());
        if let Some(node_id) = branch_from_node_id {
            if let Some(nodes) = item.get("nodes").and_then(|n| n.as_array()) {
                return Ok(nodes.iter().find(|n| n.get("id").and_then(|v| v.as_str()) == Some(node_id)).cloned());
            }
        }
        Ok(None)
    }

    pub fn update_event_time(&self, chart_id: &str, event_id: &str, cell_start: i64, cell_end: i64) -> AppResult<Option<serde_json::Value>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, "sequence-charts", chart_id);
        if !path.exists() {
            return Ok(None);
        }
        let mut item = read_json5_file::<serde_json::Value>(&path)?;
        if let Some(events) = item.get_mut("events").and_then(|e| e.as_array_mut()) {
            for event in events.iter_mut() {
                if event.get("id").and_then(|v| v.as_str()) == Some(event_id) {
                    if let Some(time_info) = event.get_mut("timeInfo").and_then(|t| t.as_object_mut()) {
                        time_info.insert("cellStart".to_string(), serde_json::Value::Number(cell_start.into()));
                        time_info.insert("cellEnd".to_string(), serde_json::Value::Number(cell_end.into()));
                    }
                    break;
                }
            }
        }
        if let Some(obj) = item.as_object_mut() {
            obj.insert("updatedAt".to_string(), serde_json::Value::String(generate_timestamp()));
        }
        write_json5_file(&path, &item)?;
        Ok(item.get("events").and_then(|e| e.as_array()).and_then(|a| a.iter().find(|e| e.get("id").and_then(|v| v.as_str()) == Some(event_id)).cloned()))
    }

    pub fn export_markdown(&self, sub_dir: &str, id: &str) -> AppResult<Option<String>> {
        let project_path = Self::get_project_path()?;
        let path = Self::get_item_path(&project_path, sub_dir, id);
        if !path.exists() {
            return Ok(None);
        }
        let item = read_json5_file::<serde_json::Value>(&path)?;
        let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("未命名");
        let mut md = format!("# {}\n\n", name);
        if sub_dir == "timelines" {
            if let Some(nodes) = item.get("nodes").and_then(|n| n.as_array()) {
                for node in nodes {
                    let node_name = node.get("name").and_then(|v| v.as_str()).unwrap_or("未命名节点");
                    let node_desc = node.get("description").and_then(|v| v.as_str()).unwrap_or("");
                    md.push_str(&format!("## {}\n\n{}\n\n", node_name, node_desc));
                }
            }
        } else if sub_dir == "sequence-charts" {
            if let Some(events) = item.get("events").and_then(|e| e.as_array()) {
                for event in events {
                    let event_name = event.get("name").and_then(|v| v.as_str()).unwrap_or("未命名事件");
                    let event_desc = event.get("description").and_then(|v| v.as_str()).unwrap_or("");
                    md.push_str(&format!("### {}\n\n{}\n\n", event_name, event_desc));
                }
            }
        }
        Ok(Some(md))
    }
}

impl Default for GraphService {
    fn default() -> Self {
        Self::new()
    }
}

fn merge_json_value(base: &mut serde_json::Value, overlay: serde_json::Value) {
    match (base, overlay) {
        (serde_json::Value::Object(base_map), serde_json::Value::Object(mut overlay_map)) => {
            if let Some(push_ops) = overlay_map.get("$push") {
                if let serde_json::Value::Object(push_map) = push_ops {
                    for (key, value) in push_map {
                        if let Some(serde_json::Value::Array(arr)) = base_map.get_mut(key) {
                            arr.push(value.clone());
                        } else {
                            base_map.insert(key.clone(), serde_json::Value::Array(vec![value.clone()]));
                        }
                    }
                }
                let _ = overlay_map.remove("$push");
            }
            if let Some(pull_ops) = overlay_map.get("$pull") {
                if let serde_json::Value::Object(pull_map) = pull_ops {
                    for (key, condition) in pull_map {
                        if let Some(serde_json::Value::Array(arr)) = base_map.get_mut(key) {
                            if let serde_json::Value::Object(cond_obj) = condition {
                                if let Some(id_val) = cond_obj.get("id").and_then(|v| v.as_str()) {
                                    arr.retain(|item| {
                                        item.get("id").and_then(|v| v.as_str()) != Some(id_val)
                                    });
                                }
                            }
                        }
                    }
                }
                let _ = overlay_map.remove("$pull");
            }
            for (key, value) in overlay_map {
                if key == "$push" || key == "$pull" {
                    continue;
                }
                if let Some(base_value) = base_map.get_mut(&key) {
                    if let serde_json::Value::Array(arr) = base_value {
                        if let serde_json::Value::Object(update_map) = &value {
                            update_array_items_by_id(arr, update_map);
                        } else {
                            *base_value = value;
                        }
                    } else {
                        merge_json_value(base_value, value);
                    }
                } else {
                    base_map.insert(key, value);
                }
            }
        }
        (base, overlay) => {
            *base = overlay;
        }
    }
}

fn update_array_items_by_id(arr: &mut Vec<serde_json::Value>, update_map: &serde_json::Map<String, serde_json::Value>) {
    for (item_id, updates) in update_map {
        if let Some(item) = arr.iter_mut().find(|i| i.get("id").and_then(|v| v.as_str()) == Some(item_id.as_str())) {
            merge_json_value(item, updates.clone());
        }
    }
}
