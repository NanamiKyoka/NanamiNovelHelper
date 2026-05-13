import { useEffect, useCallback, useRef, useState } from 'react'
import { Button, Card, Typography, List, Tooltip, Popconfirm, Space, App, Spin } from 'antd'
import {
  PlusOutlined,
  FolderOpenOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FolderOutlined,
  BookOutlined
} from '@ant-design/icons'
import { useProjectStore } from '@stores/projectStore'
import { useProjectActions } from '@hooks/useProjectActions'
import { useUIStore } from '@stores/uiStore'
import { ProjectLoadError } from '@components/common'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import styles from './WelcomePage.module.css'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text } = Typography

const LOAD_TIMEOUT_MS = 30000

function WelcomePage(): JSX.Element {
  const { message } = App.useApp()
  const recentProjects = useProjectStore(state => state.recentProjects)
  const loadRecentProjects = useProjectStore(state => state.loadRecentProjects)
  const removeRecentProject = useProjectStore(state => state.removeRecentProject)
  const error = useProjectStore(state => state.error)
  const clearError = useProjectStore(state => state.clearError)

  const { openProject, isLoading } = useProjectActions()

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadRecentProjects()
  }, [loadRecentProjects])

  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError, message])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleQuickOpen = useCallback(
    async (path: string) => {
      setLoadError(null)
      setLoadingPath(path)

      timeoutRef.current = setTimeout(() => {
        setLoadError('加载超时：项目加载时间过长，可能是由于网络或系统资源问题。')
        setLoadingPath(null)
      }, LOAD_TIMEOUT_MS)

      try {
        await openProject(path)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      } catch (err) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        const errorMessage = err instanceof Error ? err.message : '打开项目失败'
        setLoadError(errorMessage)
        setLoadingPath(null)
      }
    },
    [openProject]
  )

  const handleRetry = useCallback(() => {
    if (loadingPath) {
      handleQuickOpen(loadingPath)
    }
  }, [loadingPath, handleQuickOpen])

  const handleOpenOther = useCallback(() => {
    setLoadError(null)
    setLoadingPath(null)
    useUIStore.getState().openOpenProjectModal()
  }, [])

  const handleGoHome = useCallback(() => {
    setLoadError(null)
    setLoadingPath(null)
  }, [])

  const handleRemove = useCallback(
    async (e: React.MouseEvent, path: string) => {
      e.stopPropagation()
      try {
        await removeRecentProject(path)
      } catch (_error) {
        // 忽略错误
      }
    },
    [removeRecentProject]
  )

  if (loadError) {
    return (
      <ProjectLoadError
        error={loadError}
        projectPath={loadingPath || undefined}
        onRetry={loadingPath ? handleRetry : undefined}
        onOpenOther={handleOpenOther}
        onGoHome={handleGoHome}
        loading={isLoading}
      />
    )
  }

  return (
    <div className={styles.welcomePage}>
      <div className={styles.content}>
        <div className={styles.header}>
          <BookOutlined className={styles.logo} />
          <Title level={2} style={{ margin: 0 }}>
            NanamiNovelHelper
          </Title>
          <Text type="secondary">像写代码一样写小说</Text>
        </div>

        <div className={styles.actions}>
          <Card
            className={styles.actionCard}
            hoverable
            onClick={() => useUIStore.getState().openCreateProjectModal()}
          >
            <div className={styles.cardContent}>
              <PlusOutlined className={styles.cardIcon} />
              <Title level={4}>新建项目</Title>
              <Text type="secondary">创建一个新的写作项目</Text>
            </div>
          </Card>

          <Card
            className={styles.actionCard}
            hoverable
            onClick={() => useUIStore.getState().openOpenProjectModal()}
          >
            <div className={styles.cardContent}>
              <FolderOpenOutlined className={styles.cardIcon} />
              <Title level={4}>打开项目</Title>
              <Text type="secondary">打开已有的写作项目</Text>
            </div>
          </Card>
        </div>

        {recentProjects.length > 0 && (
          <div className={styles.recentSection}>
            <div className={styles.recentHeader}>
              <Text strong>
                <ClockCircleOutlined style={{ marginRight: 8 }} />
                最近打开
              </Text>
              <Button
                type="link"
                size="small"
                onClick={() => useUIStore.getState().openOpenProjectModal()}
              >
                查看更多
              </Button>
            </div>
            <List
              className={styles.recentList}
              dataSource={recentProjects.slice(0, 5)}
              renderItem={item => {
                const isItemLoading = isLoading && loadingPath === item.path
                return (
                  <List.Item
                    className={`${styles.recentItem} ${isItemLoading ? styles.loading : ''}`}
                    onClick={() => !isItemLoading && handleQuickOpen(item.path)}
                  >
                    <List.Item.Meta
                      avatar={
                        isItemLoading ? (
                          <Spin size="small" />
                        ) : (
                          <FolderOutlined style={{ fontSize: 20, color: 'var(--color-warning)' }} />
                        )
                      }
                      title={item.name}
                      description={
                        <Tooltip title={item.path}>
                          <Text type="secondary" className={styles.pathText}>
                            {item.path}
                          </Text>
                        </Tooltip>
                      }
                    />
                    <Space>
                      <Text type="secondary" className={styles.timeText}>
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
                          className={styles.removeBtn}
                          disabled={isItemLoading}
                        />
                      </Popconfirm>
                    </Space>
                  </List.Item>
                )
              }}
            />
          </div>
        )}

        <div className={styles.help}>
          <Text type="secondary">提示：项目文件可以使用文本编辑器直接编辑</Text>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
