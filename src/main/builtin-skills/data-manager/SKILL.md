---
name: 数据管理
description: 管理项目中的词汇、敏感词、关系图、组织架构图、时间线、事序图等数据。支持动态类型发现，可操作内置类型和自定义类型。
version: 1.0.0
author: NanamiNovelHelper
tags:
  - 数据管理
  - 词汇
  - 关系图
  - 时间线
  - AI工具
requiresConfirmation: false
timeout: 30000
---

# 数据管理 SKILL

这是 NanamiNovelHelper 的内置数据管理 SKILL，提供对项目数据的完整 CRUD 操作能力。

## 功能模块

### 1. 词汇管理 (Vocabulary)

管理小说设定中的词汇条目，如角色、地点、道具等。

**特点**：
- 支持动态类型发现（运行时读取 types.json5）
- 支持内置类型和自定义类型
- 支持按类型、关键词、标签查询
- 支持字段动态更新

**工具**：
- `vocabulary_query` - 查询词汇类型和条目
- `vocabulary_add` - 添加词汇类型或条目
- `vocabulary_update` - 更新词汇类型或条目
- `vocabulary_delete` - 删除词汇类型或条目

### 2. 敏感词管理 (Sensitive Words)

管理内容审核相关的敏感词。

**工具**：
- `sensitive_query` - 查询敏感词
- `sensitive_add` - 添加敏感词
- `sensitive_update` - 更新敏感词
- `sensitive_delete` - 删除敏感词

### 3. 关系图管理 (Relationship Graph)

管理角色之间的关系图。

**特点**：
- 支持图、节点、边三种实体
- 内置多种关系类型
- 支持自定义关系类型

**工具**：
- `relationship_query` - 查询关系图
- `relationship_add` - 创建图/添加节点/添加边
- `relationship_update` - 更新图/节点/边
- `relationship_delete` - 删除图/节点/边

### 4. 组织架构图管理 (Organization Graph)

管理层级结构，如组织、家族、势力等。

**特点**：
- 树形结构，支持父子关系
- 支持获取祖先、子孙节点
- 支持节点移动和折叠

**工具**：
- `organization_query` - 查询组织架构图
- `organization_add` - 创建图/添加节点
- `organization_update` - 更新图/节点/移动节点
- `organization_delete` - 删除图/节点

### 5. 时间线查询 (Timeline)

查询故事时间线（只读）。

**工具**：
- `timeline_query` - 查询时间线列表、详情、节点、分支

### 6. 事序图查询 (Sequence Chart)

查询事件序列图（只读）。

**工具**：
- `sequence_chart_query` - 查询事序图列表、详情、事件

## 使用场景

1. **AI 助手查询设定**：查询角色信息用于回答用户问题
2. **AI 助手更新设定**：根据用户指令更新词汇、关系等
3. **AI 助手分析故事**：查询时间线、事序图分析故事结构
4. **内容审核**：查询敏感词进行内容检查

## 数据存储

所有数据存储在项目的 `.novelhelper` 目录下：

```
.novelhelper/
├── vocabulary/
│   ├── types.json5        # 词汇类型定义
│   ├── default/           # 内置类型条目
│   │   └── {typeId}.json5
│   └── {typeId}.json5     # 自定义类型条目
├── sensitive-words.json5  # 敏感词
└── data/
    ├── relationships/     # 关系图
    ├── organizations/     # 组织架构图
    ├── timelines/         # 时间线
    └── sequence-charts/   # 事序图
```

## 注意事项

1. 所有工具通过标准输入接收 JSON 格式的参数和上下文
2. 工具执行结果通过标准输出返回 JSON 格式
3. 时间线和事序图仅支持查询，不支持修改
4. 删除节点时，关系图会同时删除相关边，组织架构图会同时删除子节点
