/**
 * 地图预览组件
 * 展示地图缩略图和基本信息，提供编辑入口
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Button,
  Space,
  Descriptions,
  Tag,
  Spin,
  App,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  ExportOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import styles from './MapPreview.module.css'

const { Title, Text } = Typography

interface MapPreviewProps {
  mapId: string
  onClose: () => void
  onEnterEditMode: () => void
}

function MapPreview({ mapId, onClose, onEnterEditMode }: MapPreviewProps): JSX.Element {
  const { message, modal } = App.useApp()

  const { currentMap, loadMap, deleteMap, exportMap, saveThumbnail } = useMapStore()
  const { types: vocabularyTypes } = useVocabularyStore()

  const [isExporting, setIsExporting] = useState(false)

  // 加载地图数据
  useEffect(() => {
    loadMap(mapId)
  }, [mapId, loadMap])

  // 获取本地文件 URL
  const getLocalUrl = useCallback((filePath: string): string => {
    if (!filePath) return ''
    return `file://${filePath.replace(/\\/g, '/')}`
  }, [])

  // 导出地图
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const filePath = await exportMap(mapId)
      if (filePath) {
        message.success(`已导出到: ${filePath}`)
      }
    } catch (error) {
      message.error('导出失败')
    } finally {
      setIsExporting(false)
    }
  }, [mapId, exportMap, message])

  // 删除地图
  const handleDelete = useCallback(() => {
    if (!currentMap) return

    modal.confirm({
      title: '确认删除',
      content: `确定要删除地图「${currentMap.name}」吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const success = await deleteMap(mapId)
        if (success) {
          message.success('删除成功')
          onClose()
        } else {
          message.error('删除失败')
        }
      },
    })
  }, [currentMap, mapId, deleteMap, modal, message, onClose])

  // 获取关联的词汇类型名称
  const getLinkedVocabularyNames = useCallback((): string[] => {
    if (!currentMap?.linkedVocabularyTypes) return []
    return currentMap.linkedVocabularyTypes
      .map(typeId => vocabularyTypes.find(t => t.id === typeId)?.name)
      .filter((name): name is string => !!name)
  }, [currentMap, vocabularyTypes])

  if (!currentMap) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
        <Text type="secondary">加载中...</Text>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onClose}
          >
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>{currentMap.name}</Title>
        </div>
        <div className={styles.toolbarRight}>
          <Space>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              loading={isExporting}
            >
              导出
            </Button>
            <Button
              icon={<DeleteOutlined />}
              danger
              onClick={handleDelete}
            >
              删除
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={onEnterEditMode}
            >
              编辑
            </Button>
          </Space>
        </div>
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        <div className={styles.previewContainer}>
          {/* 地图预览 */}
          <div className={styles.preview}>
            {currentMap.data?.elements?.length > 0 ? (
              <div className={styles.previewCanvas}>
                <canvas
                  width={currentMap.data.canvasWidth || 800}
                  height={currentMap.data.canvasHeight || 600}
                  style={{
                    backgroundColor: currentMap.data.backgroundColor || '#ffffff',
                  }}
                />
                {/* TODO: 渲染地图元素 */}
              </div>
            ) : (
              <div className={styles.previewEmpty}>
                <Text type="secondary">暂无内容</Text>
              </div>
            )}
          </div>

          {/* 信息面板 */}
          <div className={styles.infoPanel}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="名称">{currentMap.name}</Descriptions.Item>
              <Descriptions.Item label="描述">
                {currentMap.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="画布尺寸">
                {currentMap.data?.canvasWidth || 800} x {currentMap.data?.canvasHeight || 600}
              </Descriptions.Item>
              <Descriptions.Item label="元素数量">
                {currentMap.data?.elements?.length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="关联词汇类型">
                {getLinkedVocabularyNames().length > 0 ? (
                  <Space wrap>
                    {getLinkedVocabularyNames().map(name => (
                      <Tag key={name} color="blue">{name}</Tag>
                    ))}
                  </Space>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(currentMap.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(currentMap.updatedAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapPreview
