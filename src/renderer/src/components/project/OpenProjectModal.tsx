import { useState, useCallback, useEffect, useRef } from 'react'
import { Modal, List, Button, Empty, App, Typography, Popconfirm, Tooltip, Spin, Alert } from 'antd'
import {
  FolderOpenOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useProjectStore } from '@stores/projectStore'
import { useProjectActions } from '@hooks/useProjectActions'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text } = Typography

const LOAD_TIMEOUT_MS = 30000

interface OpenProjectModalProps {
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}

function OpenProjectModal({ open, onCancel, onSuccess }: OpenProjectModalProps): JSX.Element {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [openingPath, setOpeningPath] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<{ path: string; error: string } | null>(null)

  const recentProjects = useProjectStore(state => state.recentProjects)
  const loadRecentProjects = useProjectStore(state => state.loadRecentProjects)
  const removeRecentProject = useProjectStore(state => state.removeRecentProject)

  const { openProject, browseAndOpen } = useProjectActions()

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open) {
      loadRecentProjects()
      setLoadError(null)
    }
  }, [open, loadRecentProjects])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleBrowse = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      await browseAndOpen()
      onSuccess?.()
    } catch {
      // 错误已在 hook 中处理
    } finally {
      setLoading(false)
    }
  }, [browseAndOpen, onSuccess])

  const handleOpen = useCallback(
    async (path: string) => {
      setOpeningPath(path)
      setLoading(true)
      setLoadError(null)

      timeoutRef.current = setTimeout(() => {
        setLoadError({ path, error: '加载超时：项目加载时间过长' })
        setLoading(false)
        setOpeningPath(null)
      }, LOAD_TIMEOUT_MS)

      try {
        await openProject(path)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        message.success('项目已打开')
        onSuccess?.()
      } catch (err) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        const errorMessage = err instanceof Error ? err.message : '打开项目失败'
        setLoadError({ path, error: errorMessage })
      } finally {
        setLoading(false)
        setOpeningPath(null)
      }
    },
    [openProject, onSuccess, message]
  )

  const handleRetry = useCallback(() => {
    if (loadError) {
      handleOpen(loadError.path)
    }
  }, [loadError, handleOpen])

  const handleRemove = useCallback(
    async (e: React.MouseEvent, path: string) => {
      e.stopPropagation()
      try {
        await removeRecentProject(path)
        message.success('已从列表中移除')
      } catch (_error) {
        message.error('移除失败')
      }
    },
    [removeRecentProject, message]
  )

  return (
    <Modal
      title="打开项目"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={520}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<FolderOpenOutlined />}
          onClick={handleBrowse}
          loading={loading}
          block
        >
          浏览项目目录...
        </Button>
      </div>

      {loadError && (
        <Alert
          type="error"
          message={loadError.error}
          showIcon
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRetry}>
              重试
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {recentProjects.length > 0 ? (
        <>
          <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            最近打开
          </Text>
          <List
            className="recent-project-list"
            dataSource={recentProjects}
            renderItem={item => {
              const isItemLoading = loading && openingPath === item.path
              const isItemError = loadError?.path === item.path
              return (
                <List.Item
                  style={{
                    cursor: isItemLoading ? 'wait' : 'pointer',
                    padding: '12px 16px',
                    borderRadius: 4,
                    backgroundColor: isItemLoading
                      ? 'var(--color-primary-bg)'
                      : isItemError
                        ? 'var(--color-error-bg)'
                        : 'transparent',
                    opacity: isItemLoading ? 0.6 : 1
                  }}
                  onClick={() => !isItemLoading && handleOpen(item.path)}
                >
                  <List.Item.Meta
                    avatar={
                      isItemLoading ? (
                        <Spin size="small" />
                      ) : (
                        <FolderOutlined style={{ fontSize: 24, color: 'var(--color-warning)' }} />
                      )
                    }
                    title={item.name}
                    description={
                      <Tooltip title={item.path}>
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 12,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 300
                          }}
                        >
                          {item.path}
                        </Text>
                      </Tooltip>
                    }
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.lastOpenedAt).fromNow()}
                    </Text>
                    <Popconfirm
                      title="从列表中移除？"
                      description="此操作不会删除项目文件"
                      onConfirm={e => handleRemove(e as React.MouseEvent, item.path)}
                      onCancel={e => e?.stopPropagation()}
                      okText="移除"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={e => e.stopPropagation()}
                        danger
                        disabled={isItemLoading}
                      />
                    </Popconfirm>
                  </div>
                </List.Item>
              )
            }}
          />
        </>
      ) : (
        <Empty description="暂无最近打开的项目" style={{ padding: '24px 0' }} />
      )}
    </Modal>
  )
}

export default OpenProjectModal
