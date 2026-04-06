/**
 * AI 写作助手侧边栏面板
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Tabs,
  List,
  Button,
  Input,
  Empty,
  Tag,
  Space,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Dropdown,
  Modal,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  ExportOutlined,
  ImportOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  UserOutlined,
  GlobalOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MoreOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import type { TemplateListItem, WorkflowListItem, TemplateCategory } from '@shared/ai-assistant'
import TemplateEditor from './TemplateEditor'
import WorkflowEditor from './WorkflowEditor'
import DynamicSkillPanel from './DynamicSkillPanel'
import WorkflowExecutor from './WorkflowExecutor'
import styles from './AiAssistantPanel.module.css'

const { Text } = Typography

// 分类配置
const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; color: string }> = {
  character: { label: '人物塑造', color: '#1890ff' },
  plot: { label: '情节设计', color: '#52c41a' },
  worldbuilding: { label: '世界观构建', color: '#722ed1' },
  polishing: { label: '润色修改', color: '#fa8c16' },
}

// 分类图标
const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  character: <UserOutlined />,
  plot: <ThunderboltOutlined />,
  worldbuilding: <GlobalOutlined />,
  polishing: <FileTextOutlined />,
}

function AiAssistantPanel(): JSX.Element {
  const {
    templateList,
    workflowList,
    executionHistory,
    templatesLoaded,
    workflowsLoaded,
    isLoading,
    activeTab,
    loadTemplates,
    loadWorkflows,
    loadExecutionHistory,
    deleteTemplate,
    deleteWorkflow,
    deleteExecution,
    exportTemplate,
    exportWorkflow,
    importTemplate,
    importWorkflow,
    setActiveTab,
  } = useAiAssistantStore()

  const [searchText, setSearchText] = useState('')
  
  // 全屏编辑器状态
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>(undefined)
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false)
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | undefined>(undefined)
  const [showDynamicSkillPanel, setShowDynamicSkillPanel] = useState(false)
  const [showWorkflowExecutor, setShowWorkflowExecutor] = useState(false)
  const [executingWorkflowId, setExecutingWorkflowId] = useState<string | undefined>(undefined)
  const [executingTemplateId, setExecutingTemplateId] = useState<string | undefined>(undefined)

  // 加载数据
  useEffect(() => {
    if (!templatesLoaded) {
      loadTemplates()
    }
    if (!workflowsLoaded) {
      loadWorkflows()
    }
    loadExecutionHistory()
  }, [templatesLoaded, workflowsLoaded, loadTemplates, loadWorkflows, loadExecutionHistory])

  // 过滤模板列表
  const filteredTemplates = useMemo(() => {
    if (!searchText) return templateList
    const lower = searchText.toLowerCase()
    return templateList.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.description?.toLowerCase().includes(lower) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lower))
    )
  }, [templateList, searchText])

  // 过滤工作流列表
  const filteredWorkflows = useMemo(() => {
    if (!searchText) return workflowList
    const lower = searchText.toLowerCase()
    return workflowList.filter(
      (w) =>
        w.name.toLowerCase().includes(lower) ||
        w.description?.toLowerCase().includes(lower) ||
        w.tags.some((tag) => tag.toLowerCase().includes(lower))
    )
  }, [workflowList, searchText])

  // 打开模板编辑器
  const handleOpenTemplateEditor = (templateId?: string) => {
    setEditingTemplateId(templateId)
    setShowTemplateEditor(true)
  }

  // 关闭模板编辑器
  const handleCloseTemplateEditor = () => {
    setShowTemplateEditor(false)
    setEditingTemplateId(undefined)
  }

  // 打开工作流编辑器
  const handleOpenWorkflowEditor = (workflowId?: string) => {
    setEditingWorkflowId(workflowId)
    setShowWorkflowEditor(true)
  }

  // 关闭工作流编辑器
  const handleCloseWorkflowEditor = () => {
    setShowWorkflowEditor(false)
    setEditingWorkflowId(undefined)
  }

  // 打开动态 SKILL 管理面板
  const handleOpenDynamicSkillPanel = () => {
    setShowDynamicSkillPanel(true)
  }

  // 关闭动态 SKILL 管理面板
  const handleCloseDynamicSkillPanel = () => {
    setShowDynamicSkillPanel(false)
  }

  // 打开工作流执行器
  const handleOpenWorkflowExecutor = (workflowId: string) => {
    setExecutingWorkflowId(workflowId)
    setExecutingTemplateId(undefined)
    setShowWorkflowExecutor(true)
  }

  // 打开模板执行器
  const handleOpenTemplateExecutor = (templateId: string) => {
    setExecutingTemplateId(templateId)
    setExecutingWorkflowId(undefined)
    setShowWorkflowExecutor(true)
  }

  // 关闭工作流执行器
  const handleCloseWorkflowExecutor = () => {
    setShowWorkflowExecutor(false)
    setExecutingWorkflowId(undefined)
    setExecutingTemplateId(undefined)
  }

  // 处理导出模板
  const handleExportTemplate = async (id: string) => {
    try {
      const content = await exportTemplate(id)
      if (content) {
        await navigator.clipboard.writeText(content)
        message.success('模板已复制到剪贴板')
      } else {
        message.error('导出失败：模板不存在')
      }
    } catch (error) {
      console.error('导出模板失败:', error)
      message.error('导出失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 处理导出工作流
  const handleExportWorkflow = async (id: string) => {
    try {
      const content = await exportWorkflow(id)
      if (content) {
        await navigator.clipboard.writeText(content)
        message.success('工作流已复制到剪贴板')
      } else {
        message.error('导出失败：工作流不存在')
      }
    } catch (error) {
      console.error('导出工作流失败:', error)
      message.error('导出失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 处理导入
  const handleImport = async (type: 'template' | 'workflow') => {
    try {
      // 创建文件输入
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json5,.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const content = await file.text()
        if (type === 'template') {
          await importTemplate(content)
          message.success('模板导入成功')
        } else if (type === 'workflow') {
          await importWorkflow(content)
          message.success('工作流导入成功')
        }
      }
      input.click()
    } catch (error) {
      message.error('导入失败')
    }
  }

  // 渲染模板列表项
  const renderTemplateItem = (item: TemplateListItem) => {
    const categoryConfig = CATEGORY_CONFIG[item.category]
    const templateActions = [
      <Tooltip key="run" title="执行">
        <Button
          type="text"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handleOpenTemplateExecutor(item.id)}
        />
      </Tooltip>,
      <Tooltip key="edit" title="编辑">
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleOpenTemplateEditor(item.id)}
        />
      </Tooltip>,
      <Tooltip key="copy" title="复制到剪贴板">
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={() => handleExportTemplate(item.id)}
        />
      </Tooltip>,
      <Dropdown
        key="more"
        menu={{
          items: [
            {
              key: 'export',
              icon: <ExportOutlined />,
              label: '导出',
              onClick: () => handleExportTemplate(item.id),
            },
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: '删除',
              danger: true,
              onClick: () => {
                Modal.confirm({
                  title: '确认删除',
                  content: item.isBuiltIn
                    ? '确定要删除这个内置模板吗？删除后可以通过重新导入恢复。'
                    : '确定要删除这个模板吗？',
                  okText: '删除',
                  okButtonProps: { danger: true },
                  cancelText: '取消',
                  onOk: () => {
                    deleteTemplate(item.id)
                    message.success('删除成功')
                  },
                })
              },
            },
          ],
        }}
      >
        <Button type="text" size="small" icon={<MoreOutlined />} />
      </Dropdown>,
    ]

    return (
      <List.Item actions={templateActions}>
        <List.Item.Meta
          avatar={CATEGORY_ICONS[item.category]}
          title={
            <div className={styles.titleRow}>
              <Text strong className={styles.templateName}>{item.name}</Text>
              <div className={styles.tagRow}>
                <Tag color={categoryConfig.color} style={{ margin: 0 }}>
                  {categoryConfig.label}
                </Tag>
                {item.isBuiltIn && (
                  <Tag color="default" style={{ margin: 0 }}>
                    内置
                  </Tag>
                )}
                {item.source === 'project' && (
                  <Tag color="blue" style={{ margin: 0 }}>
                    项目
                  </Tag>
                )}
              </div>
            </div>
          }
          description={
            <div className={styles.itemDescription}>
              <Text type="secondary" ellipsis>
                {item.description || '暂无描述'}
              </Text>
              <div className={styles.itemMeta}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.variableCount} 个变量
                </Text>
                {item.tags.length > 0 && (
                  <div className={styles.tags}>
                    {item.tags.slice(0, 3).map((tag) => (
                      <Tag key={tag} style={{ margin: 0, fontSize: 11 }}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
          }
        />
      </List.Item>
    )
  }

  // 渲染工作流列表项
  const renderWorkflowItem = (item: WorkflowListItem) => {
    const categoryConfig = CATEGORY_CONFIG[item.category]
    const workflowActions = [
      <Tooltip key="run" title="执行">
        <Button
          type="text"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handleOpenWorkflowExecutor(item.id)}
        />
      </Tooltip>,
      <Tooltip key="edit" title="编辑">
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleOpenWorkflowEditor(item.id)}
        />
      </Tooltip>,
      <Dropdown
        key="more"
        menu={{
          items: [
            {
              key: 'export',
              icon: <ExportOutlined />,
              label: '导出',
              onClick: () => handleExportWorkflow(item.id),
            },
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: '删除',
              danger: true,
              onClick: () => {
                Modal.confirm({
                  title: '确认删除',
                  content: item.isBuiltIn
                    ? '确定要删除这个内置工作流吗？删除后可以通过重新导入恢复。'
                    : '确定要删除这个工作流吗？',
                  okText: '删除',
                  okButtonProps: { danger: true },
                  cancelText: '取消',
                  onOk: () => {
                    deleteWorkflow(item.id)
                    message.success('删除成功')
                  },
                })
              },
            },
          ],
        }}
      >
        <Button type="text" size="small" icon={<MoreOutlined />} />
      </Dropdown>,
    ]

    return (
      <List.Item actions={workflowActions}>
        <List.Item.Meta
          avatar={CATEGORY_ICONS[item.category]}
          title={
            <div className={styles.titleRow}>
              <Text strong className={styles.templateName}>{item.name}</Text>
              <div className={styles.tagRow}>
                <Tag color={categoryConfig.color} style={{ margin: 0 }}>
                  {categoryConfig.label}
                </Tag>
                {item.isBuiltIn && (
                  <Tag color="default" style={{ margin: 0 }}>
                    内置
                  </Tag>
                )}
              </div>
            </div>
          }
          description={
            <div className={styles.itemDescription}>
              <Text type="secondary" ellipsis>
                {item.description || '暂无描述'}
              </Text>
              <div className={styles.itemMeta}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.stepCount} 个步骤
                </Text>
              </div>
            </div>
          }
        />
      </List.Item>
    )
  }

  // 渲染执行历史项
  const renderHistoryItem = (item: typeof executionHistory[0]) => {
    const statusConfig = {
      running: { color: 'processing', text: '执行中' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'default', text: '已取消' },
      error: { color: 'error', text: '出错' },
    }
    const config = statusConfig[item.status]

    return (
      <List.Item
        actions={[
          <Popconfirm
            key="delete"
            title="确定删除此记录？"
            onConfirm={() => {
              deleteExecution(item.id)
              message.success('删除成功')
            }}
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>,
        ]}
      >
        <List.Item.Meta
          avatar={<HistoryOutlined />}
          title={
            <Space>
              <Text>{item.workflowName}</Text>
              <Tag color={config.color}>{config.text}</Tag>
            </Space>
          }
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(item.startedAt).toLocaleString()}
            </Text>
          }
        />
      </List.Item>
    )
  }

  // 标签页配置
  const tabItems = [
    {
      key: 'templates',
      label: (
        <Space>
          <RobotOutlined />
          提示词
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.listToolbar}>
            <Input.Search
              placeholder="搜索模板..."
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Space>
              <Button
                icon={<ImportOutlined />}
                onClick={() => handleImport('template')}
              >
                导入
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenTemplateEditor()}
              >
                新建模板
              </Button>
            </Space>
          </div>
          <List
            dataSource={filteredTemplates}
            renderItem={renderTemplateItem}
            loading={isLoading}
            locale={{
              emptyText: (
                <Empty
                  description="暂无模板"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'workflows',
      label: (
        <Space>
          <ThunderboltOutlined />
          工作流
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.listToolbar}>
            <Input.Search
              placeholder="搜索工作流..."
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Space>
              <Button
                icon={<ImportOutlined />}
                onClick={() => handleImport('workflow')}
              >
                导入
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenWorkflowEditor()}
              >
                新建工作流
              </Button>
            </Space>
          </div>
          <List
            dataSource={filteredWorkflows}
            renderItem={renderWorkflowItem}
            loading={isLoading}
            locale={{
              emptyText: (
                <Empty
                  description="暂无工作流"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <Space>
          <HistoryOutlined />
          执行历史
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          <List
            dataSource={executionHistory}
            renderItem={renderHistoryItem}
            locale={{
              emptyText: (
                <Empty
                  description="暂无执行记录"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className={styles.container}>
        {/* 动态 SKILL 管理按钮 */}
        <div className={styles.skillButtonContainer}>
          <Button
            type="dashed"
            block
            icon={<ToolOutlined />}
            onClick={handleOpenDynamicSkillPanel}
          >
            管理动态 SKILL
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as typeof activeTab)}
          items={tabItems}
          size="small"
          className={styles.tabs}
        />
      </div>

      {/* 模板编辑器全屏模态框 */}
      <Modal
        open={showTemplateEditor}
        onCancel={handleCloseTemplateEditor}
        footer={null}
        width="100%"
        style={{ top: 0, maxWidth: '100vw', paddingBottom: 0 }}
        styles={{
          body: {
            height: 'calc(100vh - 55px)',
            overflow: 'hidden',
            padding: 0,
          }
        }}
        destroyOnHidden
        title={editingTemplateId ? '编辑模板' : '新建模板'}
      >
        <TemplateEditor
          templateId={editingTemplateId}
          onBack={handleCloseTemplateEditor}
        />
      </Modal>

      {/* 工作流编辑器全屏模态框 */}
      <Modal
        open={showWorkflowEditor}
        onCancel={handleCloseWorkflowEditor}
        footer={null}
        width="100%"
        style={{ top: 0, maxWidth: '100vw', paddingBottom: 0 }}
        styles={{
          body: {
            height: 'calc(100vh - 55px)',
            overflow: 'hidden',
            padding: 0,
          }
        }}
        destroyOnHidden
        title={editingWorkflowId ? '编辑工作流' : '新建工作流'}
      >
        <WorkflowEditor
          workflowId={editingWorkflowId}
          onBack={handleCloseWorkflowEditor}
        />
      </Modal>

      {/* 动态 SKILL 管理面板 */}
      <Modal
        open={showDynamicSkillPanel}
        onCancel={handleCloseDynamicSkillPanel}
        footer={null}
        width="100%"
        style={{ top: 0, maxWidth: '100vw', paddingBottom: 0 }}
        styles={{
          body: {
            height: 'calc(100vh - 55px)',
            overflow: 'hidden',
            padding: 0,
          }
        }}
        destroyOnHidden
        title="动态 SKILL 管理"
      >
        <DynamicSkillPanel
          onBack={handleCloseDynamicSkillPanel}
        />
      </Modal>

      {/* 工作流执行器模态框 */}
      <WorkflowExecutor
        open={showWorkflowExecutor}
        workflowId={executingWorkflowId}
        templateId={executingTemplateId}
        onClose={handleCloseWorkflowExecutor}
      />
    </>
  )
}

export default AiAssistantPanel