/**
 * 地图全屏编辑器
 * 
 * 新版：基于 PixiJS 的多边形板块编辑器
 */

import { useEffect, useCallback } from 'react'
import { Button, Typography, App } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useMapStore } from '@renderer/stores/mapStore'
import { useUIStore } from '@renderer/stores/uiStore'
import { MapCanvas } from './MapCanvas'
import { MapToolbar } from './MapToolbar'
import { MapEditPanel } from './MapEditPanel'
import styles from './MapFullscreen.module.css'

const { Title } = Typography

interface MapFullscreenProps {
  mapId: string
  onBack: () => void
}

function MapFullscreen({ mapId, onBack }: MapFullscreenProps): JSX.Element {
  const { message } = App.useApp()
  
  const currentMap = useMapStore(state => state.currentMap)
  const loadMap = useMapStore(state => state.loadMap)
  const saveCurrentMap = useMapStore(state => state.saveCurrentMap)
  const saveThumbnail = useMapStore(state => state.saveThumbnail)
  
  const setFullscreenMode = useUIStore(state => state.setFullscreenMode)
  const exitFullscreen = useUIStore(state => state.exitFullscreen)
  
  // 设置全屏模式
  useEffect(() => {
    setFullscreenMode('map')
    return () => exitFullscreen()
  }, [setFullscreenMode, exitFullscreen])
  
  // 加载地图数据
  useEffect(() => {
    loadMap(mapId)
  }, [mapId, loadMap])
  
  // 保存地图
  const handleSave = useCallback(async () => {
    try {
      await saveCurrentMap()
      message.success('保存成功')
    } catch (error) {
      message.error('保存失败')
    }
  }, [saveCurrentMap, message])
  
  return (
    <div className={styles.container}>
      {/* 顶部栏 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
          >
            返回
          </Button>
          <Title level={5} className={styles.title}>
            {currentMap?.name || '地图编辑器'}
          </Title>
        </div>
        <div className={styles.headerRight}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            保存
          </Button>
        </div>
      </div>
      
      {/* 主编辑区域 */}
      <div className={styles.mainArea}>
        {/* 左侧工具栏 */}
        <MapToolbar onSave={handleSave} />
        
        {/* 画布区域 */}
        <div className={styles.canvasArea}>
          <MapCanvas onSave={handleSave} />
        </div>
        
        {/* 右侧编辑面板 */}
        <MapEditPanel />
      </div>
      
      {/* 底部状态栏 */}
      <div className={styles.statusBar}>
        <span>
          板块: {currentMap?.data.regions.length || 0} | 
          连接: {currentMap?.data.connections.length || 0} | 
          标注: {currentMap?.data.annotations.length || 0}
        </span>
        <span>
          画布: {currentMap?.data.canvasWidth || 1920} x {currentMap?.data.canvasHeight || 1080}
        </span>
      </div>
    </div>
  )
}

export default MapFullscreen