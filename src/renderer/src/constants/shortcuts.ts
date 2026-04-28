/**
 * 应用全局快捷键定义
 *
 * 统一定义应用级别的快捷键，与 ShortcutsSettings 组件配合使用
 */

/** 快捷键分类 */
export const SHORTCUT_CATEGORIES = {
  FILE: '文件',
  EDIT: '编辑',
  VIEW: '视图',
  PROJECT: '项目',
  FORMAT: '格式',
  TOOLS: '工具',
  HELP: '帮助'
} as const

/** 默认快捷键配置 */
export const DEFAULT_SHORTCUTS: Array<{
  id: string
  name: string
  description: string
  defaultKey: string
  category: string
}> = [
  // 文件操作
  {
    id: 'file.new',
    name: '新建文件',
    description: '创建新文件',
    defaultKey: 'Ctrl+N',
    category: SHORTCUT_CATEGORIES.FILE
  },
  {
    id: 'file.open',
    name: '打开文件',
    description: '打开现有文件',
    defaultKey: 'Ctrl+O',
    category: SHORTCUT_CATEGORIES.FILE
  },
  {
    id: 'file.save',
    name: '保存文件',
    description: '保存当前文件',
    defaultKey: 'Ctrl+S',
    category: SHORTCUT_CATEGORIES.FILE
  },
  {
    id: 'file.saveAll',
    name: '保存全部',
    description: '保存所有文件',
    defaultKey: 'Ctrl+Shift+S',
    category: SHORTCUT_CATEGORIES.FILE
  },
  {
    id: 'file.close',
    name: '关闭文件',
    description: '关闭当前文件',
    defaultKey: 'Ctrl+W',
    category: SHORTCUT_CATEGORIES.FILE
  },

  // 编辑操作
  {
    id: 'edit.undo',
    name: '撤销',
    description: '撤销上一步操作',
    defaultKey: 'Ctrl+Z',
    category: SHORTCUT_CATEGORIES.EDIT
  },
  {
    id: 'edit.redo',
    name: '重做',
    description: '重做上一步操作',
    defaultKey: 'Ctrl+Y',
    category: SHORTCUT_CATEGORIES.EDIT
  },
  {
    id: 'edit.cut',
    name: '剪切',
    description: '剪切选中内容',
    defaultKey: 'Ctrl+X',
    category: SHORTCUT_CATEGORIES.EDIT
  },
  {
    id: 'edit.copy',
    name: '复制',
    description: '复制选中内容',
    defaultKey: 'Ctrl+C',
    category: SHORTCUT_CATEGORIES.EDIT
  },
  {
    id: 'edit.paste',
    name: '粘贴',
    description: '粘贴内容',
    defaultKey: 'Ctrl+V',
    category: SHORTCUT_CATEGORIES.EDIT
  },
  {
    id: 'edit.find',
    name: '查找',
    description: '在当前文件中查找',
    defaultKey: 'Ctrl+F',
    category: SHORTCUT_CATEGORIES.EDIT
  },
  {
    id: 'edit.replace',
    name: '替换',
    description: '在当前文件中替换',
    defaultKey: 'Ctrl+H',
    category: SHORTCUT_CATEGORIES.EDIT
  },
  {
    id: 'edit.selectAll',
    name: '全选',
    description: '选中所有内容',
    defaultKey: 'Ctrl+A',
    category: SHORTCUT_CATEGORIES.EDIT
  },

  // 视图操作
  {
    id: 'view.sidebar',
    name: '切换侧边栏',
    description: '显示/隐藏侧边栏',
    defaultKey: 'Ctrl+B',
    category: SHORTCUT_CATEGORIES.VIEW
  },
  {
    id: 'view.settings',
    name: '打开设置',
    description: '打开设置页面',
    defaultKey: 'Ctrl+,',
    category: SHORTCUT_CATEGORIES.VIEW
  },
  {
    id: 'view.fullscreen',
    name: '全屏',
    description: '切换全屏模式',
    defaultKey: 'F11',
    category: SHORTCUT_CATEGORIES.VIEW
  },
  {
    id: 'view.zoomIn',
    name: '放大',
    description: '放大编辑器内容',
    defaultKey: 'Ctrl+=',
    category: SHORTCUT_CATEGORIES.VIEW
  },
  {
    id: 'view.zoomOut',
    name: '缩小',
    description: '缩小编辑器内容',
    defaultKey: 'Ctrl+-',
    category: SHORTCUT_CATEGORIES.VIEW
  },
  {
    id: 'view.zoomReset',
    name: '重置缩放',
    description: '重置为默认缩放',
    defaultKey: 'Ctrl+0',
    category: SHORTCUT_CATEGORIES.VIEW
  },

  // 项目操作
  {
    id: 'project.new',
    name: '新建项目',
    description: '创建新项目',
    defaultKey: 'Ctrl+Shift+N',
    category: SHORTCUT_CATEGORIES.PROJECT
  },
  {
    id: 'project.open',
    name: '打开项目',
    description: '打开现有项目',
    defaultKey: 'Ctrl+Shift+O',
    category: SHORTCUT_CATEGORIES.PROJECT
  },
  {
    id: 'project.close',
    name: '关闭项目',
    description: '关闭当前项目',
    defaultKey: 'Ctrl+Shift+W',
    category: SHORTCUT_CATEGORIES.PROJECT
  },

  // 格式操作
  {
    id: 'format.bold',
    name: '加粗',
    description: '将选中文字加粗',
    defaultKey: 'Ctrl+B',
    category: SHORTCUT_CATEGORIES.FORMAT
  },
  {
    id: 'format.italic',
    name: '斜体',
    description: '将选中文字设为斜体',
    defaultKey: 'Ctrl+I',
    category: SHORTCUT_CATEGORIES.FORMAT
  },
  {
    id: 'format.underline',
    name: '下划线',
    description: '为选中文字添加下划线',
    defaultKey: 'Ctrl+U',
    category: SHORTCUT_CATEGORIES.FORMAT
  },
  {
    id: 'format.heading',
    name: '标题',
    description: '切换标题级别',
    defaultKey: 'Ctrl+1',
    category: SHORTCUT_CATEGORIES.FORMAT
  },
  {
    id: 'format.heading2',
    name: '二级标题',
    description: '设置为二级标题',
    defaultKey: 'Ctrl+2',
    category: SHORTCUT_CATEGORIES.FORMAT
  },
  {
    id: 'format.heading3',
    name: '三级标题',
    description: '设置为三级标题',
    defaultKey: 'Ctrl+3',
    category: SHORTCUT_CATEGORIES.FORMAT
  },
  {
    id: 'format.code',
    name: '代码块',
    description: '插入代码块',
    defaultKey: 'Ctrl+`',
    category: SHORTCUT_CATEGORIES.FORMAT
  },
  {
    id: 'format.link',
    name: '链接',
    description: '插入链接',
    defaultKey: 'Ctrl+K',
    category: SHORTCUT_CATEGORIES.FORMAT
  },

  // 工具面板
  {
    id: 'tools.vocabulary',
    name: '词汇面板',
    description: '打开/关闭词汇面板',
    defaultKey: 'Ctrl+Shift+V',
    category: SHORTCUT_CATEGORIES.TOOLS
  },
  {
    id: 'tools.sensitive',
    name: '敏感词面板',
    description: '打开/关闭敏感词面板',
    defaultKey: 'Ctrl+Shift+S',
    category: SHORTCUT_CATEGORIES.TOOLS
  },
  {
    id: 'tools.relationship',
    name: '关系图面板',
    description: '打开/关闭关系图面板',
    defaultKey: 'Ctrl+Shift+R',
    category: SHORTCUT_CATEGORIES.TOOLS
  },
  {
    id: 'tools.timeline',
    name: '时间线面板',
    description: '打开/关闭时间线面板',
    defaultKey: 'Ctrl+Shift+T',
    category: SHORTCUT_CATEGORIES.TOOLS
  },
  {
    id: 'tools.terminal',
    name: '终端面板',
    description: '打开/关闭终端面板',
    defaultKey: 'Ctrl+`',
    category: SHORTCUT_CATEGORIES.TOOLS
  },

  // 帮助
  {
    id: 'help.shortcuts',
    name: '快捷键参考',
    description: '显示快捷键参考',
    defaultKey: 'Ctrl+/',
    category: SHORTCUT_CATEGORIES.HELP
  }
]

/** 本地存储键名 */
export const SHORTCUTS_STORAGE_KEY = 'nanami-shortcuts'

/**
 * 从本地存储加载自定义快捷键
 */
export function loadCustomShortcuts(): Record<string, string> {
  try {
    const saved = localStorage.getItem(SHORTCUTS_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as Record<string, string>
    }
  } catch (error) {
    console.error('Failed to load shortcuts:', error)
  }
  return {}
}

/**
 * 保存自定义快捷键到本地存储
 */
export function saveCustomShortcuts(customKeys: Record<string, string>): void {
  try {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(customKeys))
  } catch (error) {
    console.error('Failed to save shortcuts:', error)
  }
}

/**
 * 获取当前快捷键配置（合并默认值和自定义值）
 */
export function getShortcutsWithCustom(): Array<{
  id: string
  name: string
  description: string
  defaultKey: string
  currentKey: string
  category: string
}> {
  const customKeys = loadCustomShortcuts()

  return DEFAULT_SHORTCUTS.map(s => ({
    ...s,
    currentKey: customKeys[s.id] || s.defaultKey
  }))
}

/**
 * 检查快捷键是否被自定义
 */
export function isShortcutCustomized(id: string): boolean {
  const customKeys = loadCustomShortcuts()
  return id in customKeys
}

/**
 * 重置快捷键为默认值
 */
export function resetShortcut(id: string): void {
  const customKeys = loadCustomShortcuts()
  delete customKeys[id]
  saveCustomShortcuts(customKeys)
}

/**
 * 重置所有快捷键为默认值
 */
export function resetAllShortcuts(): void {
  localStorage.removeItem(SHORTCUTS_STORAGE_KEY)
}

export default DEFAULT_SHORTCUTS
