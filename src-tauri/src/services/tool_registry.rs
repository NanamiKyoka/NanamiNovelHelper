use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};

// 工具 trait - 所有工具必须实现
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn parameters_schema(&self) -> serde_json::Value;
    fn execute(
        &self,
        params: serde_json::Value,
    ) -> Pin<Box<dyn Future<Output = ToolResult> + Send + '_>>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value, // JSON Schema
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ai_agent 使用的工具调用描述
#[derive(Debug, Clone)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: String,
}

// ai_agent 使用的工具执行结果
#[derive(Debug, Clone)]
pub struct ToolExecutionResult {
    pub success: bool,
    pub data: serde_json::Value,
    pub error: Option<String>,
}

// 工具注册表
pub struct ToolRegistry {
    tools: Arc<Mutex<HashMap<String, Arc<dyn Tool>>>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        let registry = Self {
            tools: Arc::new(Mutex::new(HashMap::new())),
        };
        registry.register_default_tools();
        registry
    }

    fn register_default_tools(&self) {
        let _ = self.register(Arc::new(crate::services::tools::read_file::ReadFileTool::new()));
        let _ = self.register(Arc::new(crate::services::tools::list_files::ListFilesTool::new()));
        let _ = self.register(Arc::new(
            crate::services::tools::search_files::SearchFilesTool::new(),
        ));
        let _ = self.register(Arc::new(crate::services::tools::edit::EditTool::new()));
        let _ = self.register(Arc::new(crate::services::tools::write::WriteTool::new()));
    }

    pub fn register(&self, tool: Arc<dyn Tool>) -> AppResult<()> {
        let mut tools = self.tools.lock().map_err(|_| {
            AppError::OperationFailed("工具注册表锁获取失败".to_string())
        })?;
        let name = tool.name().to_string();
        if tools.contains_key(&name) {
            return Err(AppError::InvalidParam(format!(
                "工具 '{}' 已注册",
                name
            )))
        }
        tools.insert(name, tool);
        Ok(())
    }

    pub fn unregister(&self, name: &str) -> Option<Arc<dyn Tool>> {
        self.tools.lock().ok()?.remove(name)
    }

    pub fn get(&self, name: &str) -> Option<Arc<dyn Tool>> {
        self.tools.lock().ok()?.get(name).cloned()
    }

    pub fn list(&self) -> Vec<ToolDefinition> {
        let Ok(tools) = self.tools.lock() else {
            return vec![]
        };
        tools
            .values()
            .map(|t| ToolDefinition {
                name: t.name().to_string(),
                description: t.description().to_string(),
                parameters: t.parameters_schema(),
            })
            .collect()
    }

    // 供 ai_agent 使用：转换为 LLM 可用的 tools 格式
    pub fn list_tools_for_llm(&self) -> Vec<serde_json::Value> {
        self.list()
            .into_iter()
            .map(|def| {
                serde_json::json!({
                    "type": "function",
                    "function": {
                        "name": def.name,
                        "description": def.description,
                        "parameters": def.parameters
                    }
                })
            })
            .collect()
    }

    // 供 ai_agent 使用：同步执行工具调用
    pub fn execute(&self, call: &ToolCall) -> ToolExecutionResult {
        let tool = match self.get(&call.name) {
            Some(t) => t,
            None => {
                return ToolExecutionResult {
                    success: false,
                    data: serde_json::Value::Null,
                    error: Some(format!("工具 '{}' 未找到", call.name)),
                }
            }
        };

        let params = match serde_json::from_str(&call.arguments) {
            Ok(p) => p,
            Err(e) => {
                return ToolExecutionResult {
                    success: false,
                    data: serde_json::Value::Null,
                    error: Some(format!("参数解析失败: {}", e)),
                }
            }
        };

        let result = match tokio::runtime::Handle::try_current() {
            Ok(handle) => tokio::task::block_in_place(|| handle.block_on(tool.execute(params))),
            Err(_) => {
                return ToolExecutionResult {
                    success: false,
                    data: serde_json::Value::Null,
                    error: Some("无法在当前上下文中执行异步工具".to_string()),
                }
            }
        };

        ToolExecutionResult {
            success: result.success,
            data: result.result.unwrap_or(serde_json::Value::Null),
            error: result.error,
        }
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}
