/**
 * AI写作助手类型定义
 * 主进程和渲染进程共用
 */

// ============================================
// 变量系统
// ============================================

/**
 * 变量类型枚举
 */
export type VariableType =
  | 'text' // 手动输入文本
  | 'textarea' // 多行文本
  | 'vocabulary' // 词汇条目
  | 'relationship' // 关系图节点
  | 'timeline' // 时间线事件
  | 'sequence' // 事序图事件
  | 'chapter' // 当前章节内容
  | 'selection' // 当前选中文本
  | 'select' // 单选
  | 'multiselect' // 多选
  | 'number' // 数字
  | 'boolean' // 布尔值

/**
 * 变量定义
 */
export interface VariableDefinition {
  id: string
  name: string // 变量显示名，如"主角"
  key: string // 变量键名，用于模板中 {{key}}
  type: VariableType
  required: boolean
  defaultValue?: string | string[] | number | boolean

  // 类型特定配置
  vocabularyTypeId?: string // vocabulary 类型：限制词汇类型
  graphId?: string // relationship 类型：指定关系图
  timelineId?: string // timeline 类型：指定时间线
  sequenceChartId?: string // sequence 类型：指定事序图
  options?: string[] // select/multiselect 类型：选项列表
  placeholder?: string
  description?: string // 变量描述
  order: number // 排序
}

/**
 * 变量值（运行时）
 */
export interface VariableValue {
  variableId: string
  value: string | string[] | number | boolean | null
  // 对于引用类型，存储实际的条目数据
  entryData?: Record<string, unknown>
}

// ============================================
// 提示词模板
// ============================================

/**
 * 提示词模板分类
 */
export type TemplateCategory = 'character' | 'plot' | 'worldbuilding' | 'polishing'

/**
 * 分类信息
 */
export interface CategoryInfo {
  id: TemplateCategory
  name: string
  icon: string
  description: string
}

/**
 * 提示词模板
 */
export interface PromptTemplate {
  id: string
  name: string
  description?: string
  category: TemplateCategory
  tags: string[]

  // 变量定义
  variables: VariableDefinition[]

  // 模板内容（支持 {{变量}} 插值）
  content: string

  // API 配置
  apiConfig?: TemplateApiConfig

  // 输出配置
  outputConfig?: TemplateOutputConfig

  // 元数据
  isBuiltIn: boolean // 是否内置模板
  source: 'global' | 'project' // 来源层级
  order: number
  createdAt: string
  updatedAt: string
}

/**
 * 模板 API 配置
 */
export interface TemplateApiConfig {
  provider?: 'openai' | 'anthropic' | 'custom'
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

/**
 * 模板输出配置
 */
export interface TemplateOutputConfig {
  // 输出目标：clipboard（剪贴板）、editor（编辑器）
  outputTarget: 'clipboard' | 'editor' | 'both'
  // 是否在输出前预览
  previewBeforeOutput: boolean
  // 输出格式化
  formatOutput?: boolean
}

// ============================================
// 工作流系统
// ============================================

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  id: string
  name: string
  description?: string

  // 关联的提示词模板
  templateId: string

  // 分支条件（根据上一步输出判断）
  branches?: WorkflowBranch[]

  // 默认下一步（无条件分支或条件都不满足时）
  nextStepId?: string

  // 步骤配置
  autoExecute: boolean // 是否自动执行（无需用户确认）
  saveOutput: boolean // 是否保存输出供后续步骤使用
  outputVariableName?: string // 保存输出的变量名

  // UI 配置
  order: number
}

/**
 * 工作流分支条件
 */
export interface WorkflowBranch {
  id: string
  name: string
  condition: BranchCondition
  nextStepId: string
}

/**
 * 分支条件
 */
export interface BranchCondition {
  type: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'regex' | 'exists'
  // 条件类型对应的值
  value: string
  // 引用的变量（如上一步的输出）
  variableId?: string
}

/**
 * 工作流定义
 */
export interface PromptWorkflow {
  id: string
  name: string
  description?: string
  category: TemplateCategory
  tags: string[]

  // 步骤定义（有向图）
  steps: WorkflowStep[]
  startStepId: string // 起始步骤ID

  // 全局变量（跨步骤共享）
  globalVariables: VariableDefinition[]

  // 元数据
  isBuiltIn: boolean
  source: 'global' | 'project'
  order: number
  createdAt: string
  updatedAt: string
}

// ============================================
// 执行状态
// ============================================

/**
 * 工作流执行状态
 */
export interface WorkflowExecution {
  id: string
  workflowId: string
  workflowName: string

  // 当前状态
  currentStepId: string
  status: 'running' | 'completed' | 'cancelled' | 'error'
  error?: string

  // 步骤输出（stepId -> output）
  stepOutputs: Record<string, string>

  // 用户填写的变量值
  variables: Record<string, VariableValue>

  // AI API 调用历史
  apiCallHistory: ApiCallRecord[]

  // 时间戳
  startedAt: string
  completedAt?: string
}

/**
 * API 调用记录
 */
export interface ApiCallRecord {
  id: string
  stepId: string
  templateId: string
  provider: string
  model: string
  prompt: string
  response: string
  tokensUsed?: {
    input: number
    output: number
  }
  duration: number // 毫秒
  timestamp: string
}

// ============================================
// 模板/工作流列表项（用于展示）
// ============================================

/**
 * 模板列表项
 */
export interface TemplateListItem {
  id: string
  name: string
  description?: string
  category: TemplateCategory
  tags: string[]
  variableCount: number
  isBuiltIn: boolean
  source: 'global' | 'project'
  updatedAt: string
}

/**
 * 工作流列表项
 */
export interface WorkflowListItem {
  id: string
  name: string
  description?: string
  category: TemplateCategory
  tags: string[]
  stepCount: number
  isBuiltIn: boolean
  source: 'global' | 'project'
  updatedAt: string
}

// ============================================
// 内置常量
// ============================================

/**
 * 模板分类信息
 */
export const TEMPLATE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'character',
    name: '人物塑造',
    icon: 'UserOutlined',
    description: '人物档案、性格分析、关系梳理等'
  },
  {
    id: 'plot',
    name: '情节设计',
    icon: 'BranchesOutlined',
    description: '情节冲突、高潮设计、伏笔设置等'
  },
  {
    id: 'worldbuilding',
    name: '世界观构建',
    icon: 'GlobalOutlined',
    description: '世界观设计、势力架构、魔法系统等'
  },
  {
    id: 'polishing',
    name: '润色修改',
    icon: 'EditOutlined',
    description: '文本润色、风格调整、敏感词检查等'
  }
]

/**
 * 默认 API 配置
 */
export const DEFAULT_API_CONFIG: TemplateApiConfig = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000
}

/**
 * 默认输出配置
 */
export const DEFAULT_OUTPUT_CONFIG: TemplateOutputConfig = {
  outputTarget: 'both',
  previewBeforeOutput: true,
  formatOutput: true
}

// ============================================
// 内置模板
// ============================================

/**
 * 内置提示词模板列表
 */
export function getBuiltInTemplates(): PromptTemplate[] {
  const now = new Date().toISOString()

  return [
    // ========== 人物塑造 ==========
    {
      id: 'character-profile',
      name: '人物档案生成',
      description: '根据基本信息生成详细的人物档案',
      category: 'character',
      tags: ['人物', '设定', '档案'],
      variables: [
        {
          id: 'v1',
          name: '角色',
          key: '角色',
          type: 'vocabulary',
          vocabularyTypeId: 'character',
          required: true,
          order: 0
        },
        {
          id: 'v2',
          name: '故事背景',
          key: '故事背景',
          type: 'textarea',
          required: true,
          placeholder: '简述故事的世界观和背景',
          order: 1
        }
      ],
      content: `请为以下角色生成详细的人物档案：

【基本信息】
姓名：{{角色.name}}
年龄：{{角色.age}}
性别：{{角色.gender}}

【故事背景】
{{故事背景}}

请从以下几个方面详细描述这个角色：
1. 外貌特征
2. 性格特点
3. 背景故事
4. 核心动机
5. 人际关系`,
      isBuiltIn: true,
      source: 'global',
      order: 0,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'character-dialogue',
      name: '角色对话风格',
      description: '分析并生成符合角色性格的对话风格指南',
      category: 'character',
      tags: ['人物', '对话', '风格'],
      variables: [
        {
          id: 'v1',
          name: '角色',
          key: '角色',
          type: 'vocabulary',
          vocabularyTypeId: 'character',
          required: true,
          order: 0
        }
      ],
      content: `请分析以下角色的对话风格：

【角色信息】
姓名：{{角色.name}}
性格：{{角色.personality}}
身份：{{角色.type}}

请生成：
1. 角色的说话习惯（口头禅、语气特点等）
2. 不同情境下的对话示例
3. 避免的对话方式`,
      isBuiltIn: true,
      source: 'global',
      order: 1,
      createdAt: now,
      updatedAt: now
    },

    // ========== 情节设计 ==========
    {
      id: 'plot-conflict',
      name: '情节冲突设计',
      description: '为情节设计合理的冲突和矛盾',
      category: 'plot',
      tags: ['情节', '冲突', '剧情'],
      variables: [
        {
          id: 'v1',
          name: '情节概述',
          key: '情节概述',
          type: 'textarea',
          required: true,
          placeholder: '描述当前情节的基本情况',
          order: 0
        },
        {
          id: 'v2',
          name: '相关角色',
          key: '相关角色',
          type: 'multiselect',
          options: [],
          required: false,
          order: 1
        },
        {
          id: 'v3',
          name: '冲突类型',
          key: '冲突类型',
          type: 'select',
          options: ['人物内心', '人物之间', '人物与环境', '人物与社会', '理念冲突'],
          required: true,
          order: 2
        }
      ],
      content: `请为以下情节设计冲突：

【情节概述】
{{情节概述}}

【冲突类型】
{{冲突类型}}

请设计：
1. 冲突的核心矛盾
2. 冲突的触发事件
3. 冲突的发展过程
4. 冲突的解决方式（可选）`,
      isBuiltIn: true,
      source: 'global',
      order: 0,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'plot-foreshadow',
      name: '伏笔设置',
      description: '帮助设计和埋藏剧情伏笔',
      category: 'plot',
      tags: ['情节', '伏笔', '铺垫'],
      variables: [
        {
          id: 'v1',
          name: '后续事件',
          key: '后续事件',
          type: 'textarea',
          required: true,
          placeholder: '描述后续将要发生的重要事件',
          order: 0
        },
        {
          id: 'v2',
          name: '当前章节',
          key: '当前章节',
          type: 'chapter',
          required: false,
          order: 1
        }
      ],
      content: `请为以下后续事件设计伏笔：

【后续事件】
{{后续事件}}

【当前章节内容】
{{当前章节}}

请设计：
1. 可以埋设的伏笔类型
2. 伏笔的具体内容和位置
3. 如何让伏笔自然融入剧情
4. 伏笔揭示时的效果预期`,
      isBuiltIn: true,
      source: 'global',
      order: 1,
      createdAt: now,
      updatedAt: now
    },

    // ========== 世界观构建 ==========
    {
      id: 'world-magic-system',
      name: '魔法系统设计',
      description: '设计严谨的魔法/力量体系',
      category: 'worldbuilding',
      tags: ['世界观', '魔法', '体系'],
      variables: [
        {
          id: 'v1',
          name: '世界观背景',
          key: '世界观背景',
          type: 'textarea',
          required: true,
          placeholder: '描述世界的基本设定',
          order: 0
        },
        {
          id: 'v2',
          name: '力量类型',
          key: '力量类型',
          type: 'select',
          options: ['魔法', '武功', '超能力', '科技', '其他'],
          required: true,
          order: 1
        }
      ],
      content: `请设计一套完整的{{力量类型}}系统：

【世界观背景】
{{世界观背景}}

请设计以下内容：
1. 力量的来源和本质
2. 力量的等级划分
3. 使用力量的代价和限制
4. 力量与世界观的关系
5. 常见的力量应用`,
      isBuiltIn: true,
      source: 'global',
      order: 0,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'world-faction',
      name: '势力架构设计',
      description: '设计世界中的势力分布和组织架构',
      category: 'worldbuilding',
      tags: ['世界观', '势力', '组织'],
      variables: [
        {
          id: 'v1',
          name: '世界观',
          key: '世界观',
          type: 'textarea',
          required: true,
          placeholder: '描述世界的基本情况',
          order: 0
        },
        {
          id: 'v2',
          name: '势力类型',
          key: '势力类型',
          type: 'select',
          options: ['国家', '门派', '商业联盟', '秘密组织', '其他'],
          required: true,
          order: 1
        }
      ],
      content: `请设计一套{{势力类型}}架构：

【世界观】
{{世界观}}

请设计：
1. 主要势力及其特点
2. 势力间的关系（联盟、敌对、中立）
3. 各势力的核心利益
4. 势力的优劣势`,
      isBuiltIn: true,
      source: 'global',
      order: 1,
      createdAt: now,
      updatedAt: now
    },

    // ========== 润色修改 ==========
    {
      id: 'polish-text',
      name: '文本润色',
      description: '优化文本的表达和流畅度',
      category: 'polishing',
      tags: ['润色', '修改', '优化'],
      variables: [
        {
          id: 'v1',
          name: '待润色文本',
          key: '待润色文本',
          type: 'selection',
          required: true,
          placeholder: '选中文本或粘贴需要润色的内容',
          order: 0
        },
        {
          id: 'v2',
          name: '润色方向',
          key: '润色方向',
          type: 'select',
          options: ['更生动', '更简洁', '更正式', '更轻松', '更文学化'],
          required: true,
          order: 1
        }
      ],
      content: `请对以下文本进行润色，使其{{润色方向}}：

【原文】
{{待润色文本}}

要求：
1. 保持原意不变
2. 改善表达和节奏
3. 消除冗余和不通顺的地方
4. 保持作者的风格特点`,
      isBuiltIn: true,
      source: 'global',
      order: 0,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'continue-writing',
      name: '续写',
      description: '根据上下文续写后续内容',
      category: 'polishing',
      tags: ['续写', '创作', '延伸'],
      variables: [
        {
          id: 'v1',
          name: '前文内容',
          key: '前文内容',
          type: 'selection',
          required: true,
          placeholder: '选中前文内容',
          order: 0
        },
        {
          id: 'v2',
          name: '续写长度',
          key: '续写长度',
          type: 'select',
          options: ['短（100-200字）', '中（300-500字）', '长（500-800字）'],
          required: false,
          defaultValue: '中（300-500字）',
          order: 1
        }
      ],
      content: `请根据以下前文内容续写后续内容：

【前文】
{{前文内容}}

【续写长度】
{{续写长度}}

要求：
1. 保持原有的风格和语气
2. 情节发展要自然合理
3. 注意与上下文的连贯性
4. 只输出续写的内容，不要重复前文`,
      isBuiltIn: true,
      source: 'global',
      order: 1,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'rewrite-text',
      name: '改写文本',
      description: '用不同的方式表达相同的内容',
      category: 'polishing',
      tags: ['改写', '变换', '重写'],
      variables: [
        {
          id: 'v1',
          name: '待改写文本',
          key: '待改写文本',
          type: 'selection',
          required: true,
          placeholder: '选中文本或粘贴需要改写的内容',
          order: 0
        },
        {
          id: 'v2',
          name: '改写风格',
          key: '改写风格',
          type: 'select',
          options: ['更口语化', '更书面化', '更戏剧化', '更平实', '第一人称', '第三人称'],
          required: true,
          order: 1
        }
      ],
      content: `请将以下文本改写为{{改写风格}}的风格：

【原文】
{{待改写文本}}

要求：
1. 保持核心意思不变
2. 使用不同的表达方式
3. 根据指定风格调整语言`,
      isBuiltIn: true,
      source: 'global',
      order: 2,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'expand-text',
      name: '扩充细节',
      description: '为文本增加更多细节描写',
      category: 'polishing',
      tags: ['扩充', '细节', '丰富'],
      variables: [
        {
          id: 'v1',
          name: '待扩充文本',
          key: '待扩充文本',
          type: 'selection',
          required: true,
          placeholder: '选中文本或粘贴需要扩充的内容',
          order: 0
        },
        {
          id: 'v2',
          name: '扩充方向',
          key: '扩充方向',
          type: 'multiselect',
          options: ['环境描写', '心理描写', '动作描写', '对话细节', '感官描写'],
          required: false,
          order: 1
        }
      ],
      content: `请为以下文本扩充细节：

【原文】
{{待扩充文本}}

【扩充方向】
{{扩充方向}}

要求：
1. 保持原有的情节和核心内容
2. 根据指定方向增加细节
3. 细节要自然融入，不显突兀
4. 注意节奏控制`,
      isBuiltIn: true,
      source: 'global',
      order: 3,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'summarize-text',
      name: '总结要点',
      description: '提炼文本的关键信息',
      category: 'polishing',
      tags: ['总结', '提炼', '概要'],
      variables: [
        {
          id: 'v1',
          name: '待总结文本',
          key: '待总结文本',
          type: 'selection',
          required: true,
          placeholder: '选中文本或粘贴需要总结的内容',
          order: 0
        },
        {
          id: 'v2',
          name: '输出格式',
          key: '输出格式',
          type: 'select',
          options: ['段落', '要点列表', '表格'],
          required: false,
          defaultValue: '要点列表',
          order: 1
        }
      ],
      content: `请总结以下文本的要点：

【原文】
{{待总结文本}}

【输出格式】
{{输出格式}}

要求：
1. 提取核心信息和关键点
2. 简洁明了，不遗漏重要内容
3. 按照指定格式输出`,
      isBuiltIn: true,
      source: 'global',
      order: 4,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'polish-sensitive-check',
      name: '敏感内容检查',
      description: '检查文本中的敏感内容和潜在问题',
      category: 'polishing',
      tags: ['检查', '敏感', '审核'],
      variables: [
        {
          id: 'v1',
          name: '待检查文本',
          key: '待检查文本',
          type: 'textarea',
          required: true,
          placeholder: '粘贴需要检查的文本',
          order: 0
        }
      ],
      content: `请检查以下文本的敏感内容：

【待检查文本】
{{待检查文本}}

请检查：
1. 是否有敏感词汇或表达
2. 是否有不当的价值观暗示
3. 是否有逻辑漏洞或前后矛盾
4. 是否有其他潜在问题

请列出所有发现的问题，并给出修改建议。`,
      isBuiltIn: true,
      source: 'global',
      order: 5,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'dialogue-polish',
      name: '对话润色',
      description: '优化人物对话的自然度和表现力',
      category: 'polishing',
      tags: ['对话', '润色', '人物'],
      variables: [
        {
          id: 'v1',
          name: '对话内容',
          key: '对话内容',
          type: 'selection',
          required: true,
          placeholder: '选中对话内容',
          order: 0
        },
        {
          id: 'v2',
          name: '角色信息',
          key: '角色信息',
          type: 'textarea',
          required: false,
          placeholder: '可选：描述说话角色的性格、身份等信息',
          order: 1
        }
      ],
      content: `请优化以下对话：

【对话内容】
{{对话内容}}

【角色信息】
{{角色信息}}

要求：
1. 让对话更自然、更有张力
2. 体现角色的性格特点
3. 增加必要的动作和表情描写
4. 注意对话的节奏和留白`,
      isBuiltIn: true,
      source: 'global',
      order: 6,
      createdAt: now,
      updatedAt: now
    }
  ]
}

/**
 * 内置工作流列表
 */
export function getBuiltInWorkflows(): PromptWorkflow[] {
  const now = new Date().toISOString()

  return [
    {
      id: 'character-development',
      name: '角色深度开发',
      description: '从基础信息出发，逐步完善角色的各个维度',
      category: 'character',
      tags: ['人物', '开发', '深度'],
      steps: [
        {
          id: 'step1',
          name: '生成基础档案',
          templateId: 'character-profile',
          autoExecute: false,
          saveOutput: true,
          outputVariableName: '档案',
          order: 0
        },
        {
          id: 'step2',
          name: '设计对话风格',
          templateId: 'character-dialogue',
          autoExecute: false,
          saveOutput: true,
          outputVariableName: '对话风格',
          nextStepId: 'step3',
          order: 1
        },
        {
          id: 'step3',
          name: '完成',
          templateId: '',
          autoExecute: true,
          saveOutput: false,
          order: 2
        }
      ],
      startStepId: 'step1',
      globalVariables: [
        {
          id: 'gv1',
          name: '目标角色',
          key: '目标角色',
          type: 'vocabulary',
          vocabularyTypeId: 'character',
          required: true,
          order: 0
        }
      ],
      isBuiltIn: true,
      source: 'global',
      order: 0,
      createdAt: now,
      updatedAt: now
    }
  ]
}

// ============================================
// AI API 调用
// ============================================

/**
 * AI 提供商类型
 */
export type AIProvider = 'openai' | 'anthropic' | 'custom' | 'deepseek' | 'moonshot' | 'zhipu' | string

/**
 * API 调用选项
 */
export interface AiApiCallOptions {
  provider?: string
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

/**
 * API 调用结果
 */
export interface AiApiCallResult {
  success: boolean
  content?: string
  error?: string
  tokensUsed?: {
    input: number
    output: number
  }
  duration: number // 毫秒
}

// ============================================
// Agent 事件系统
// ============================================

export type AgentEventType =
  | 'text_delta'
  | 'reasoning_delta'
  | 'tool_input_started'
  | 'tool_input_delta'
  | 'tool_input_ended'
  | 'tool_called'
  | 'tool_progress'
  | 'tool_result'
  | 'tool_error'
  | 'step_started'
  | 'step_ended'
  | 'step_failed'
  | 'error'
  | 'done'

export interface AgentEvent {
  type: AgentEventType
  sessionId: string
  timestamp: number
}

export interface TextDeltaEvent extends AgentEvent {
  type: 'text_delta'
  textId: string
  delta: string
}

export interface ReasoningDeltaEvent extends AgentEvent {
  type: 'reasoning_delta'
  reasoningId: string
  delta: string
}

export interface ToolInputStartedEvent extends AgentEvent {
  type: 'tool_input_started'
  callId: string
  toolName: string
}

export interface ToolInputDeltaEvent extends AgentEvent {
  type: 'tool_input_delta'
  callId: string
  delta: string
}

export interface ToolInputEndedEvent extends AgentEvent {
  type: 'tool_input_ended'
  callId: string
  text: string
}

export interface ToolCalledEvent extends AgentEvent {
  type: 'tool_called'
  callId: string
  toolName: string
  parameters: Record<string, unknown>
}

export interface ToolProgressEvent extends AgentEvent {
  type: 'tool_progress'
  callId: string
  toolName: string
  message: string
}

export interface ToolResultEvent extends AgentEvent {
  type: 'tool_result'
  callId: string
  toolName: string
  result: unknown
  success: boolean
}

export interface ToolErrorEvent extends AgentEvent {
  type: 'tool_error'
  callId: string
  toolName: string
  message: string
}

export interface StepStartedEvent extends AgentEvent {
  type: 'step_started'
  stepIndex: number
}

export interface StepEndedEvent extends AgentEvent {
  type: 'step_ended'
  stepIndex: number
}

export interface StepFailedEvent extends AgentEvent {
  type: 'step_failed'
  stepIndex: number
  error: string
}

export interface AgentErrorEvent extends AgentEvent {
  type: 'error'
  error: string
}

export interface AgentDoneEvent extends AgentEvent {
  type: 'done'
  tokensUsed?: {
    input: number
    output: number
  }
}

export type AnyAgentEvent =
  | TextDeltaEvent
  | ReasoningDeltaEvent
  | ToolInputStartedEvent
  | ToolInputDeltaEvent
  | ToolInputEndedEvent
  | ToolCalledEvent
  | ToolProgressEvent
  | ToolResultEvent
  | ToolErrorEvent
  | StepStartedEvent
  | StepEndedEvent
  | StepFailedEvent
  | AgentErrorEvent
  | AgentDoneEvent

// ============================================
// 工具定义
// ============================================

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required?: boolean
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown> // JSON Schema object
}

// ============================================
// AI API 流式响应
// ============================================

export interface AiApiStreamChunk {
  type: 'chunk' | 'done' | 'error'
  content?: string
  error?: string
  tokensUsed?: {
    input: number
    output: number
  }
  duration?: number
}

// ============================================
// 聊天会话
// ============================================

/**
 * 工具调用记录
 */
export interface ToolCallRecord {
  id: string
  callId: string
  toolName: string
  parameters: Record<string, unknown>
  status: 'pending' | 'running' | 'success' | 'failed'
  result?: unknown
  error?: string
  timestamp: number
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCallRecord[]
  timestamp: number
}

/**
 * Agent 会话（扩展自 ChatSession）
 */
export interface AgentSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  status: 'idle' | 'running' | 'error'
}

/**
 * 聊天会话
 */
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

/**
 * 聊天会话摘要（用于列表展示）
 */
export interface ChatSessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

/**
 * SKILL 执行上下文
 */
export interface SkillExecutionContext {
  projectPath: string
  // 其他可用的上下文数据
  currentChapter?: {
    path: string
    content: string
  }
  selectedText?: string
  // 变量值（可用于参数插值）
  variables?: Record<string, VariableValue>
}


