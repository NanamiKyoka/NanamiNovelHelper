use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub cover: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl Project {
    pub fn new(name: String, path: String) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            path,
            description: None,
            author: None,
            cover: None,
            tags: Vec::new(),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProject {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub cover: Option<String>,
    #[serde(rename = "lastOpenedAt")]
    pub last_opened_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInitData {
    pub project: Option<Project>,
    pub settings: Option<serde_json::Value>,
    #[serde(rename = "vocabularyTypes")]
    pub vocabulary_types: Vec<serde_json::Value>,
    #[serde(rename = "vocabularyEntries")]
    pub vocabulary_entries: Vec<serde_json::Value>,
    #[serde(rename = "sensitiveWords")]
    pub sensitive_words: Vec<serde_json::Value>,
    #[serde(rename = "highlightConfig")]
    pub highlight_config: Option<serde_json::Value>,
    #[serde(rename = "relationshipGraphs")]
    pub relationship_graphs: Vec<serde_json::Value>,
    pub timelines: Vec<serde_json::Value>,
    #[serde(rename = "sequenceCharts")]
    pub sequence_charts: Vec<serde_json::Value>,
    #[serde(rename = "organizationGraphs")]
    pub organization_graphs: Vec<serde_json::Value>,
    pub maps: Vec<serde_json::Value>,
    #[serde(rename = "fileTree")]
    pub file_tree: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseEntity {
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabularyType {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub name: String,
    pub color: String,
    #[serde(rename = "isBuiltIn", default)]
    pub is_built_in: bool,
    pub order: i32,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabularyEntry {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub name: String,
    #[serde(rename = "typeId")]
    pub type_id: String,
    #[serde(rename = "typeName")]
    pub type_name: String,
    pub order: i32,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(rename = "linkedFilePath", default)]
    pub linked_file_path: Option<String>,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensitiveWord {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub name: String,
    pub order: i32,
    #[serde(default)]
    pub level: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HighlightConfig {
    #[serde(rename = "typeOverrides", default)]
    pub type_overrides: Vec<serde_json::Value>,
    #[serde(rename = "entryOverrides", default)]
    pub entry_overrides: Vec<serde_json::Value>,
    #[serde(default)]
    pub scope: serde_json::Value,
    #[serde(default)]
    pub match_config: serde_json::Value,
    #[serde(default)]
    pub style: serde_json::Value,
    #[serde(default)]
    pub performance: serde_json::Value,
    #[serde(default)]
    pub hover_card: serde_json::Value,
    #[serde(default)]
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipNode {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub label: String,
    #[serde(rename = "typeId", default)]
    pub type_id: Option<String>,
    #[serde(rename = "typeName", default)]
    pub type_name: Option<String>,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipEdge {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub source: String,
    pub target: String,
    #[serde(rename = "relationTypeId", default)]
    pub relation_type_id: Option<String>,
    #[serde(rename = "relationTypeName", default)]
    pub relation_type_name: Option<String>,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationType {
    pub id: String,
    pub name: String,
    #[serde(rename = "isBuiltIn", default)]
    pub is_built_in: bool,
    pub order: i32,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipGraph {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    #[serde(rename = "linkedVocabularyTypes", default)]
    pub linked_vocabulary_types: Vec<String>,
    #[serde(rename = "customRelationTypes", default)]
    pub custom_relation_types: Vec<RelationType>,
    #[serde(rename = "nodeStyle", default = "default_node_style")]
    pub node_style: String,
    pub nodes: Vec<RelationshipNode>,
    pub edges: Vec<RelationshipEdge>,
    #[serde(rename = "nodeCount", default)]
    pub node_count: i32,
    #[serde(rename = "edgeCount", default)]
    pub edge_count: i32,
    #[serde(default)]
    pub order: i32,
    #[serde(rename = "viewState", default)]
    pub view_state: Option<serde_json::Value>,
}

fn default_node_style() -> String {
    "circle".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineNode {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub label: String,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub branch: Option<serde_json::Value>,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default)]
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timeline {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    pub nodes: Vec<TimelineNode>,
    #[serde(rename = "nodeCount", default)]
    pub node_count: i32,
    #[serde(default)]
    pub order: i32,
    #[serde(rename = "viewState", default)]
    pub view_state: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationNode {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub label: String,
    #[serde(rename = "parentId", default)]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationGraph {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    pub nodes: Vec<OrganizationNode>,
    #[serde(rename = "nodeCount", default)]
    pub node_count: i32,
    #[serde(default)]
    pub order: i32,
    #[serde(rename = "viewState", default)]
    pub view_state: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceEvent {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub label: String,
    #[serde(rename = "typeId", default)]
    pub type_id: Option<String>,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceChart {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    pub events: Vec<SequenceEvent>,
    #[serde(rename = "eventCount", default)]
    pub event_count: i32,
    #[serde(default)]
    pub order: i32,
    #[serde(rename = "viewState", default)]
    pub view_state: Option<serde_json::Value>,
    #[serde(rename = "axisConfig", default)]
    pub axis_config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapData {
    #[serde(flatten)]
    pub base: BaseEntity,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    #[serde(default)]
    pub chunks: Vec<serde_json::Value>,
    #[serde(default)]
    pub elements: Vec<serde_json::Value>,
    #[serde(default)]
    pub connections: Vec<serde_json::Value>,
    #[serde(default)]
    pub order: i32,
    #[serde(rename = "viewState", default)]
    pub view_state: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub key: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(default)]
    pub extension: Option<String>,
    #[serde(default)]
    pub size: u64,
    #[serde(rename = "modifiedAt", default)]
    pub modified_at: Option<String>,
    #[serde(default)]
    pub children: Option<Vec<FileNode>>,
}
