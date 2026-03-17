/**
 * 时间线全屏编辑器
 * 纵向时间轴布局，支持节点编辑、拖拽排序、分支管理等
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Typography,
  Button,
  Input,
  Select,
  Modal,
  App,
  Popconfirm,
  Spin,
  Tag,
  Tooltip,
  DatePicker,
  Dropdown,
  theme,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  BranchesOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TagOutlined,
  CheckOutlined,
  CopyOutlined,
  MoreOutlined,
  DragOutlined,
  MenuOutlined,
  ClockCircleOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useTimelineStore } from '@stores/timelineStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import type { TimelineNode, TimeInfo, CharacterRef, ChapterRef } from '@types/timeline'
import type { MenuProps } from 'antd'
import styles from './TimelineFullscreen.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface TimelineFullscreenProps {
  timelineId: string
  onBack: () => void
}

// 节点编辑弹窗状态
interface NodeEditState {
  visible: boolean
  node: Partial<TimelineNode> | null
  isNew: boolean
}

function TimelineFullscreen({ timelineId, onBack }: TimelineFullscreenProps): JSX.Element {
  const { token } = theme.useToken()
  const { modal, message } = App.useApp()
  const isDarkMode = token.colorBgContainer === '#141414' ||
                     token.colorBgContainer === '#1f1f1f' ||
                     token.colorTextBase === '#fff'

  const {
    currentTimeline,
    isLoading,
    loadTimeline,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    batchDeleteNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    saveThumbnail,
  } = useTimelineStore()

  const { types: vocabularyTypes, loadTypes, entries, loadEntries } = useVocabularyStore()

  // 视图状态
  const [zoom, setZoom] = useState(1)
  const contentRef = useRef<HTMLDivElement>(null)

  // 节点编辑弹窗状态
  const [nodeEdit, setNodeEdit] = useState<NodeEditState>({
    visible: false,
    node: null,
    isNew: false,
  })

  // 批量选择状态
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [isBatchMode, setIsBatchMode] = useState(false)

  // 拖拽状态
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // 初始化
  useEffect(() => {
    loadTimeline(timelineId)
    loadTypes()
  }, [timelineId, loadTimeline, loadTypes])

  // 加载词汇条目 - 只加载一次
  useEffect(() => {
    if (vocabularyTypes.length > 0) {
      vocabularyTypes.forEach((type) => {
        loadEntries(type.id)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabularyTypes.length])

  // 生成缩略图 - 使用防抖，避免频繁生成
  const generateThumbnail = useCallback(() => {
    if (!currentTimeline) return

    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 120
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 绘制背景
    ctx.fillStyle = isDarkMode ? '#1f1f1f' : '#f5f5f5'
    ctx.fillRect(0, 0, 200, 120)

    // 绘制时间线简化视图
    const nodes = currentTimeline.nodes.slice().sort((a, b) => a.order - b.order)
    const nodeCount = Math.min(nodes.length, 5)
    const spacing = 100 / (nodeCount + 1)

    ctx.strokeStyle = isDarkMode ? '#434343' : '#d9d9d9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(20, 60)
    ctx.lineTo(180, 60)
    ctx.stroke()

    nodes.slice(0, 5).forEach((node, i) => {
      const x = 20 + spacing * (i + 1) * 1.6
      ctx.beginPath()
      ctx.arc(x, 60, 4, 0, Math.PI * 2)
      ctx.fillStyle = node.color || '#1890ff'
      ctx.fill()
    })

    const dataUrl = canvas.toDataURL('image/png')
    saveThumbnail(dataUrl)
  }, [currentTimeline, isDarkMode, saveThumbnail])

  // 缩略图生成 - 延迟执行
  useEffect(() => {
    if (!currentTimeline) return
    const timer = setTimeout(generateThumbnail, 500)
    return () => clearTimeout(timer)
  }, [currentTimeline?.nodes?.length, generateThumbnail])

  // 按顺序排序节点 - 只依赖 nodes 数组
  const sortedNodes: TimelineNode[] = useMemo(() => {
    if (!currentTimeline?.nodes) return []
    return [...currentTimeline.nodes].sort((a, b) => a.order - b.order)
  }, [currentTimeline?.nodes])

  // 打开新增节点弹窗
  const handleAddNode = useCallback(() => {
    const nodes = currentTimeline?.nodes || []
    const maxOrder = nodes.length > 0 ? Math.max(...nodes.map((n) => n.order)) : -1
    setNodeEdit({
      visible: true,
      node: {
        title: '',
        description: '',
        timeInfo: {
          format: 'custom',
        },
        characters: [],
        order: maxOrder + 1,
        color: '#1890ff',
      },
      isNew: true,
    })
  }, [currentTimeline?.nodes])

  // 打开编辑节点弹窗
  const handleEditNode = useCallback((node: TimelineNode) => {
    setNodeEdit({
      visible: true,
      node: { ...node },
      isNew: false,
    })
  }, [])

  // 保存节点
  const handleSaveNode = async () => {
    if (!nodeEdit.node?.title?.trim()) {
      message.warning('请输入节点标题')
      return
    }

    if (nodeEdit.isNew) {
      await addNode({
        title: nodeEdit.node.title.trim(),
        description: nodeEdit.node.description,
        timeInfo: nodeEdit.node.timeInfo || { format: 'custom' },
        characters: nodeEdit.node.characters || [],
        chapter: nodeEdit.node.chapter,
        color: nodeEdit.node.color || '#1890ff',
        order: nodeEdit.node.order || 0,
        isBranchPoint: nodeEdit.node.isBranchPoint,
      })
    } else if (nodeEdit.node.id) {
      await updateNode(nodeEdit.node.id, nodeEdit.node as Partial<TimelineNode>)
    }

    setNodeEdit({ visible: false, node: null, isNew: false })
  }

  // 删除节点
  const handleDeleteNode = async (nodeId: string) => {
    await deleteNode(nodeId)
    setSelectedNodes((prev) => prev.filter((id) => id !== nodeId))
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedNodes.length === 0) return
    modal.confirm({
      title: `确定要删除选中的 ${selectedNodes.length} 个节点吗？`,
      content: '删除后无法恢复',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await batchDeleteNodes(selectedNodes)
        setSelectedNodes([])
        setIsBatchMode(false)
      },
    })
  }

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', nodeId)
    setDraggedNodeId(nodeId)
  }, [])

  // 拖拽经过 - 使用 ref 避免频繁状态更新
  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault()
    if (draggedNodeId !== nodeId && dropTargetId !== nodeId) {
      setDropTargetId(nodeId)
    }
  }, [draggedNodeId, dropTargetId])

  // 拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // 拖拽结束
  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId && sourceId !== targetId) {
      await moveNode(sourceId, targetId)
    }
    setDraggedNodeId(null)
    setDropTargetId(null)
  }, [moveNode])

  // 拖拽结束（取消）
  const handleDragEnd = useCallback(() => {
    setDraggedNodeId(null)
    setDropTargetId(null)
  }, [])

  // 切换批量选择模式
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode)
    setSelectedNodes([])
  }

  // 选择/取消选择节点
  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodes((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    )
  }

  // 缩放控制
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5))
  }

  const handleZoomReset = () => {
    setZoom(1)
  }

  // 格式化时间信息
  const formatTimeInfo = (timeInfo?: TimeInfo): string => {
    if (!timeInfo) return ''
    switch (timeInfo.format) {
      case 'datetime':
        return timeInfo.datetime || ''
      case 'chapter':
        return timeInfo.chapterTitle || ''
      case 'custom':
        return timeInfo.customLabel || ''
      default:
        return ''
    }
  }

  // 获取时间类型的图标
  const getTimeIcon = (format?: string) => {
    switch (format) {
      case 'datetime':
        return <CalendarOutlined />
      case 'chapter':
        return <FileTextOutlined />
      default:
        return <TagOutlined />
    }
  }

  // 获取节点操作菜单
  const getNodeMenu = (node: TimelineNode): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: () => handleEditNode(node),
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制',
      onClick: async () => {
        const newNode = {
          ...node,
          id: undefined,
          title: `${node.title} (副本)`,
          order: node.order + 1,
        }
        await addNode(newNode as Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt'>)
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'branch',
      icon: <BranchesOutlined />,
      label: '从此处分支',
      onClick: () => {
        message.info('分支功能开发中')
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () =>
        modal.confirm({
          title: '确定要删除这个节点吗？',
          content: `将删除「${node.title}」，删除后无法恢复`,
          okText: '删除',
          okButtonProps: { danger: true },
          cancelText: '取消',
          onOk: () => handleDeleteNode(node.id),
        }),
    },
  ]

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spin size="large" />
          <Text type="secondary">加载中...</Text>
        </div>
      </div>
    )
  }

  if (!currentTimeline) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Text type="secondary">时间线不存在</Text>
          <Button onClick={onBack}>返回</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 顶部工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
          <Title level={4} className={styles.title}>
            {currentTimeline.name}
          </Title>
          <span className={styles.stats}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {sortedNodes.length} 个节点
          </span>
        </div>

        <div className={styles.toolbarCenter}>
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
          </Tooltip>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.zoomControls}>
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
            <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
            <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
            <Button size="small" onClick={handleZoomReset}>
              重置
            </Button>
          </div>

          {isBatchMode ? (
            <>
              <Text type="secondary">已选 {selectedNodes.length} 项</Text>
              <Button danger onClick={handleBatchDelete} disabled={selectedNodes.length === 0}>
                删除选中
              </Button>
              <Button onClick={toggleBatchMode}>取消选择</Button>
            </>
          ) : (
            <>
              <Button icon={<MenuOutlined />} onClick={toggleBatchMode}>
                批量操作
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNode}>
                添加节点
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 时间线主体 */}
      <div className={styles.content} ref={contentRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        {sortedNodes.length === 0 ? (
          <div className={styles.emptyNodes}>
            <ClockCircleOutlined className={styles.emptyIcon} />
            <Text type="secondary">暂无节点</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNode}>
              添加第一个节点
            </Button>
          </div>
        ) : (
          <div className={styles.timeline}>
            {sortedNodes.map((node, index) => (
              <div
                key={node.id}
                className={`${styles.timelineItem} ${
                  dropTargetId === node.id ? styles.dropTarget : ''
                } ${selectedNodes.includes(node.id) ? styles.selected : ''}`}
                draggable={!isBatchMode}
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragOver={(e) => handleDragOver(e, node.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, node.id)}
                onDragEnd={handleDragEnd}
                onClick={() => isBatchMode && toggleNodeSelection(node.id)}
              >
                <div className={styles.timelineLine}>
                  <div
                    className={styles.timelineDot}
                    style={{ backgroundColor: node.color || '#1890ff' }}
                  />
                  {index < sortedNodes.length - 1 && <div className={styles.timelineConnector} />}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.nodeHeader}>
                    <div className={styles.nodeTitleRow}>
                      {!isBatchMode && <DragOutlined className={styles.dragHandle} />}
                      <Text strong className={styles.nodeTitle}>
                        {node.title}
                      </Text>
                      {node.isBranchPoint && (
                        <Tag color="blue" icon={<BranchesOutlined />}>
                          分支点
                        </Tag>
                      )}
                    </div>
                    <div className={styles.nodeActions}>
                      {!isBatchMode && (
                        <>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditNode(node)
                            }}
                          />
                          <Dropdown menu={{ items: getNodeMenu(node) }} trigger={['click']}>
                            <Button
                              type="text"
                              size="small"
                              icon={<MoreOutlined />}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Dropdown>
                        </>
                      )}
                      {isBatchMode && selectedNodes.includes(node.id) && (
                        <CheckOutlined className={styles.checkIcon} />
                      )}
                    </div>
                  </div>

                  {node.timeInfo && formatTimeInfo(node.timeInfo) && (
                    <div className={styles.nodeTime}>
                      {getTimeIcon(node.timeInfo.format)}
                      <Text type="secondary">{formatTimeInfo(node.timeInfo)}</Text>
                    </div>
                  )}

                  {node.description && (
                    <div className={styles.nodeDescription}>{node.description}</div>
                  )}

                  {node.characters && node.characters.length > 0 && (
                    <div className={styles.nodeCharacters}>
                      <UserOutlined />
                      <div className={styles.characterList}>
                        {node.characters.map((char) => (
                          <Tag key={char.id} color={char.color || 'default'}>
                            {char.name}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  {node.chapter && (
                    <div className={styles.nodeChapter}>
                      <FileTextOutlined />
                      <Text type="secondary">{node.chapter.title}</Text>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 添加节点按钮（底部） */}
            {!isBatchMode && (
              <div className={styles.addNodeButton}>
                <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddNode} block>
                  添加节点
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 节点编辑弹窗 */}
      <Modal
        title={nodeEdit.isNew ? '添加节点' : '编辑节点'}
        open={nodeEdit.visible}
        onCancel={() => setNodeEdit({ visible: false, node: null, isNew: false })}
        onOk={handleSaveNode}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <div className={styles.modalContent}>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>标题 *</label>
            <Input
              placeholder="输入节点标题"
              value={nodeEdit.node?.title || ''}
              onChange={(e) =>
                setNodeEdit((prev) => ({
                  ...prev,
                  node: { ...prev.node, title: e.target.value },
                }))
              }
              maxLength={100}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>描述</label>
            <TextArea
              placeholder="输入节点描述"
              value={nodeEdit.node?.description || ''}
              onChange={(e) =>
                setNodeEdit((prev) => ({
                  ...prev,
                  node: { ...prev.node, description: e.target.value },
                }))
              }
              rows={3}
              maxLength={500}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>时间信息</label>
            <Select
              value={nodeEdit.node?.timeInfo?.format || 'custom'}
              onChange={(value) =>
                setNodeEdit((prev) => ({
                  ...prev,
                  node: {
                    ...prev.node,
                    timeInfo: { ...prev.node?.timeInfo, format: value },
                  },
                }))
              }
              options={[
                { label: '自定义标签', value: 'custom' },
                { label: '日期时间', value: 'datetime' },
                { label: '章节引用', value: 'chapter' },
              ]}
              style={{ width: '100%', marginBottom: 8 }}
            />
            {nodeEdit.node?.timeInfo?.format === 'datetime' && (
              <DatePicker
                showTime
                value={nodeEdit.node?.timeInfo?.datetime}
                onChange={(date) =>
                  setNodeEdit((prev) => ({
                    ...prev,
                    node: {
                      ...prev.node,
                      timeInfo: {
                        ...prev.node?.timeInfo,
                        datetime: date?.toISOString(),
                      },
                    },
                  }))
                }
                style={{ width: '100%' }}
              />
            )}
            {nodeEdit.node?.timeInfo?.format === 'custom' && (
              <Input
                placeholder="输入自定义时间标签，如：第一纪元、三年前"
                value={nodeEdit.node?.timeInfo?.customLabel || ''}
                onChange={(e) =>
                  setNodeEdit((prev) => ({
                    ...prev,
                    node: {
                      ...prev.node,
                      timeInfo: {
                        ...prev.node?.timeInfo,
                        customLabel: e.target.value,
                      },
                    },
                  }))
                }
              />
            )}
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>关联角色</label>
            <Select
              mode="multiple"
              placeholder="选择关联的角色"
              value={nodeEdit.node?.characters?.map((c) => c.id) || []}
              onChange={(ids) => {
                const selectedChars = ids.map((id) => {
                  const entry = Object.values(entries).flat().find((e) => e.id === id)
                  return {
                    id,
                    name: entry?.name || '',
                    color: entry?.color,
                  } as CharacterRef
                })
                setNodeEdit((prev) => ({
                  ...prev,
                  node: { ...prev.node, characters: selectedChars },
                }))
              }}
              options={Object.values(entries)
                .flat()
                .map((e) => ({ label: e.name, value: e.id }))}
              style={{ width: '100%' }}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>节点颜色</label>
            <div className={styles.colorPicker}>
              {['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2'].map(
                (color) => (
                  <div
                    key={color}
                    className={`${styles.colorOption} ${
                      nodeEdit.node?.color === color ? styles.colorSelected : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setNodeEdit((prev) => ({
                        ...prev,
                        node: { ...prev.node, color },
                      }))
                    }
                  />
                )
              )}
            </div>
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>分支设置</label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={nodeEdit.node?.isBranchPoint || false}
                onChange={(e) =>
                  setNodeEdit((prev) => ({
                    ...prev,
                    node: { ...prev.node, isBranchPoint: e.target.checked },
                  }))
                }
              />
              <span>标记为分支点</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TimelineFullscreen
