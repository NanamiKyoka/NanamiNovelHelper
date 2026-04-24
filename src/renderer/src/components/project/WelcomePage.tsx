/**
 * 欢迎页面
 * 当没有打开项目时显示
 */

import { useEffect, useCallback } from 'react'
import { Button, Card, Typography, List, Tooltip, Popconfirm, Space, message } from 'antd'
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
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import styles from './WelcomePage.module.css'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text } = Typography

function WelcomePage(): JSX.Element {
  const recentProjects = useProjectStore((state) => state.recentProjects)
  const loadRecentProjects = useProjectStore((state) => state.loadRecentProjects)
  const removeRecentProject = useProjectStore((state) => state.removeRecentProject)
  const error = useProjectStore((state) => state.error)
  const clearError = useProjectStore((state) => state.clearError)
  
  // 使用 useProjectActions 处理跨 Store 的项目操作
  const { openProject } = useProjectActions()

  // 加载最近项目列表
  useEffect(() => {
    loadRecentProjects()
  }, [loadRecentProjects])

  // 错误提示
  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError])

  // 快速打开最近项目
  const handleQuickOpen = useCallback(async (path: string) => {
    try {
      await openProject(path)
    } catch (error) {
      // 错误已在 store 中处理
    }
  }, [openProject])

  // 移除最近项目
  const handleRemove = useCallback(async (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    try {
      await removeRecentProject(path)
    } catch (error) {
      // 忽略错误
    }
  }, [removeRecentProject])

  return (
    <div className={styles.welcomePage}>
      <div className={styles.content}>
        {/* Logo 和标题 */}
        <div className={styles.header}>
          <BookOutlined className={styles.logo} />
          <Title level={2} style={{ margin: 0 }}>
            NanamiNovelHelper
          </Title>
          <Text type="secondary">
            像写代码一样写小说
          </Text>
        </div>

        {/* 操作卡片 */}
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

        {/* 最近项目 */}
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
              renderItem={(item) => (
                <List.Item
                  className={styles.recentItem}
                  onClick={() => handleQuickOpen(item.path)}
                >
                  <List.Item.Meta
                    avatar={<FolderOutlined style={{ fontSize: 20, color: 'var(--color-warning)' }} />}
                    title={item.name}
                    description={
                      <Tooltip title={item.path}>
                        <Text 
                          type="secondary" 
                          className={styles.pathText}
                        >
                          {item.path}
                        </Text>
                      </Tooltip>
                    }
                  />
                  <Space>
                    <Text type="secondary" className={styles.timeText}>
                      {dayjs(item.lastOpened).fromNow()}
                    </Text>
                    <Popconfirm
                      title="从列表中移除？"
                      description="此操作不会删除项目文件"
                      onConfirm={(e) => handleRemove(e as React.MouseEvent, item.path)}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="移除"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        danger
                        className={styles.removeBtn}
                      />
                    </Popconfirm>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* 帮助提示 */}
        <div className={styles.help}>
          <Text type="secondary">
            提示：项目文件可以使用文本编辑器直接编辑
          </Text>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
