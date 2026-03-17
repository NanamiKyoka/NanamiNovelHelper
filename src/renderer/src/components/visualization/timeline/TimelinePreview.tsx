/**
 * 时间线预览组件
 * 以只读模式展示时间线，可进入编辑模式
 */

import { useState, useEffect, useCallback } from 'react'
import { Typography, Button, Spin, App, Tag, Empty, Tooltip } from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  ClockCircleOutlined,
  BranchesOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { useTimelineStore } from '@stores/timelineStore'
import type { TimelineNode, TimeInfo, CharacterRef } from '@types/timeline'
import styles from './TimelinePreview.module.css'

const { Text, Title } = Typography

interface TimelinePreviewProps {
  timelineId: string
  onClose: () => void
  onEnterEditMode: () => void
}

function TimelinePreview({
  timelineId,
  onClose,
  onEnterEditMode,
}: TimelinePreviewProps): JSX.Element {
  const { message } = App.useApp()

  const { currentTimeline, isLoading, loadTimeline } = useTimelineStore()

  // 加载时间线数据
  useEffect(() => {
    loadTimeline(timelineId)
  }, [timelineId, loadTimeline])

  // 格式化时间信息
  const formatTimeInfo = (timeInfo: TimeInfo): string => {
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
  const getTimeIcon = (format: string) => {
    switch (format) {
      case 'datetime':
        return <CalendarOutlined />
      case 'chapter':
        return <FileTextOutlined />
      default:
        return <TagOutlined />
    }
  }

  // 按顺序排序节点
  const sortedNodes: TimelineNode[] = currentTimeline
    ? [...currentTimeline.nodes].sort((a, b) => a.order - b.order)
    : []

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spin />
        </div>
      </div>
    )
  }

  if (!currentTimeline) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <Empty description="时间线不存在" />
          <Button onClick={onClose}>返回列表</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onClose}>
            返回
          </Button>
          <div className={styles.title}>
            <Title level={5} style={{ margin: 0 }}>
              {currentTimeline.name}
            </Title>
            {currentTimeline.branchInfo.type === 'branch' && (
              <Tag color="blue" icon={<BranchesOutlined />}>
                分支
              </Tag>
            )}
          </div>
        </div>
        <Button type="primary" icon={<EditOutlined />} onClick={onEnterEditMode}>
          编辑
        </Button>
      </div>

      {/* 描述 */}
      {currentTimeline.description && (
        <div className={styles.description}>{currentTimeline.description}</div>
      )}

      {/* 时间线主体 */}
      <div className={styles.content}>
        {sortedNodes.length === 0 ? (
          <div className={styles.emptyNodes}>
            <ClockCircleOutlined className={styles.emptyIcon} />
            <Text type="secondary">暂无节点，点击编辑添加</Text>
          </div>
        ) : (
          <div className={styles.timeline}>
            {sortedNodes.map((node, index) => (
              <div key={node.id} className={styles.timelineItem}>
                <div className={styles.timelineLine}>
                  <div className={styles.timelineDot} style={{ backgroundColor: node.color || '#1890ff' }} />
                  {index < sortedNodes.length - 1 && <div className={styles.timelineConnector} />}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.nodeHeader}>
                    <Text strong className={styles.nodeTitle}>
                      {node.title}
                    </Text>
                    {node.timeInfo && (
                      <div className={styles.nodeTime}>
                        {getTimeIcon(node.timeInfo.format)}
                        <Text type="secondary">{formatTimeInfo(node.timeInfo)}</Text>
                      </div>
                    )}
                  </div>

                  {node.description && (
                    <div className={styles.nodeDescription}>{node.description}</div>
                  )}

                  {/* 关联角色 */}
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

                  {/* 关联章节 */}
                  {node.chapter && (
                    <div className={styles.nodeChapter}>
                      <FileTextOutlined />
                      <Text type="secondary">{node.chapter.title}</Text>
                    </div>
                  )}

                  {/* 分支标记 */}
                  {node.isBranchPoint && node.branchedTimelineIds && node.branchedTimelineIds.length > 0 && (
                    <div className={styles.branchMark}>
                      <BranchesOutlined />
                      <Text type="secondary">此处有 {node.branchedTimelineIds.length} 个分支</Text>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TimelinePreview
