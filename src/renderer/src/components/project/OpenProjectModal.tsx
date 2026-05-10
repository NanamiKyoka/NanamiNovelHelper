/**
 * 项目打开对话框
 */

import { useState, useCallback, useEffect } from 'react'
import { Modal, List, Button, Empty, App, Typography, Popconfirm, Tooltip } from 'antd'
import {
  FolderOpenOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FolderOutlined
} from '@ant-design/icons'
import { useProjectStore } from '@stores/projectStore'
import { useProjectActions } from '@hooks/useProjectActions'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text } = Typography

interface OpenProjectModalProps {
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}

function OpenProjectModal({ open, onCancel, onSuccess }: OpenProjectModalProps): JSX.Element {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [openingPath, setOpeningPath] = useState<string | null>(null)

  const recentProjects = useProjectStore(state => state.recentProjects)
  const loadRecentProjects = useProjectStore(state => state.loadRecentProjects)
  const removeRecentProject = useProjectStore(state => state.removeRecentProject)

  // 使用 useProjectActions 处理跨 Store 的项目操作
  const { openProject, browseAndOpen } = useProjectActions()

  // 加载最近项目列表
  useEffect(() => {
    if (open) {
      loadRecentProjects()
    }
  }, [open, loadRecentProjects])

  // 选择项目目录
  const handleBrowse = useCallback(async () => {
    setLoading(true)
    try {
      await browseAndOpen()
      onSuccess?.()
    } catch {
      // 错误已在 hook 中处理
    } finally {
      setLoading(false)
    }
  }, [browseAndOpen, onSuccess])

  // 打开项目
  const handleOpen = useCallback(
    async (path: string) => {
      setOpeningPath(path)
      setLoading(true)
      try {
        await openProject(path)
        message.success('项目已打开')
        onSuccess?.()
      } catch (_error) {
        // 错误已在 hook 中处理，这里仅显示提示
      } finally {
        setLoading(false)
        setOpeningPath(null)
      }
    },
    [openProject, onSuccess, message]
  )

  // 移除最近项目
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

      {recentProjects.length > 0 ? (
        <>
          <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            最近打开
          </Text>
          <List
            className="recent-project-list"
            dataSource={recentProjects}
            renderItem={item => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '12px 16px',
                  borderRadius: 4,
                  backgroundColor:
                    openingPath === item.path ? 'var(--color-primary-bg)' : 'transparent'
                }}
                onClick={() => handleOpen(item.path)}
              >
                <List.Item.Meta
                  avatar={
                    <FolderOutlined style={{ fontSize: 24, color: 'var(--color-warning)' }} />
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
                    />
                  </Popconfirm>
                </div>
              </List.Item>
            )}
          />
        </>
      ) : (
        <Empty description="暂无最近打开的项目" style={{ padding: '24px 0' }} />
      )}
    </Modal>
  )
}

export default OpenProjectModal
