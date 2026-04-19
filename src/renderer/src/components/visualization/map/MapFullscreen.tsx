import { useCallback, useState } from 'react'
import { Button, Tooltip, Modal, App } from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  SelectOutlined,
  DragOutlined,
  LinkOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { useUIStore } from '@stores/uiStore'
import { WorldCanvas } from './WorldCanvas'
import { InnerCanvas } from './InnerCanvas'
import { ChunkGallery } from './ChunkGallery'
import { ElementGallery } from './ElementGallery'
import { Breadcrumb } from './Breadcrumb'
import type { ChunkType, Point } from '@renderer/types/map'
import styles from './MapFullscreen.module.css'

export function MapFullscreen() {
  const { message } = App.useApp()
  
  const currentMap = useMapStore(state => state.currentMap)
  const viewStack = useMapStore(state => state.viewStack)
  const tool = useMapStore(state => state.tool)
  const setTool = useMapStore(state => state.setTool)
  const canUndo = useMapStore(state => state.canUndo)
  const canRedo = useMapStore(state => state.canRedo)
  const undo = useMapStore(state => state.undo)
  const redo = useMapStore(state => state.redo)
  const saveCurrentMap = useMapStore(state => state.saveCurrentMap)
  const enterChunk = useMapStore(state => state.enterChunk)
  const enterElement = useMapStore(state => state.enterElement)
  const addChunk = useMapStore(state => state.addChunk)
  const selectedChunkId = useMapStore(state => state.selectedChunkId)
  const selectedElementId = useMapStore(state => state.selectedElementId)
  const selectedConnectionId = useMapStore(state => state.selectedConnectionId)
  const deleteChunk = useMapStore(state => state.deleteChunk)
  const deleteElement = useMapStore(state => state.deleteElement)
  const deleteConnection = useMapStore(state => state.deleteConnection)
  const exportMap = useMapStore(state => state.exportMap)
  const importMap = useMapStore(state => state.importMap)
  const snapEnabled = useMapStore(state => state.snapEnabled)
  const setSnapEnabled = useMapStore(state => state.setSnapEnabled)
  
  const exitFullscreen = useUIStore(state => state.exitFullscreen)
  
  const [showSuggestion, setShowSuggestion] = useState(false)
  
  const isWorldView = viewStack.length === 1
  const currentLevel = viewStack[viewStack.length - 1]
  
  const handleBack = useCallback(() => {
    exitFullscreen()
  }, [exitFullscreen])
  
  const handleSave = useCallback(async () => {
    await saveCurrentMap()
    message.success('地图已保存')
  }, [saveCurrentMap, message])
  
  const handleChunkDoubleClick = useCallback((chunkId: string) => {
    enterChunk(chunkId)
  }, [enterChunk])
  
  const handleElementDoubleClick = useCallback((elementId: string, elementName: string) => {
    enterElement(elementId, elementName)
  }, [enterElement])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const chunkType = e.dataTransfer.getData('chunkType') as ChunkType
    if (!chunkType) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    addChunk({
      chunkType,
      position: { x, y }
    })
  }, [addChunk])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])
  
  const handleDelete = useCallback(() => {
    if (selectedChunkId) {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除选中的板块吗？相关的连接也会被删除。',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          deleteChunk(selectedChunkId)
          message.success('板块已删除')
        }
      })
    } else if (selectedElementId) {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除选中的元素吗？',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          deleteElement(selectedElementId)
          message.success('元素已删除')
        }
      })
    } else if (selectedConnectionId) {
      deleteConnection(selectedConnectionId)
      message.success('连接已删除')
    }
  }, [selectedChunkId, selectedElementId, selectedConnectionId, deleteChunk, deleteElement, deleteConnection, message])
  
  const handleExport = useCallback(async () => {
    if (!currentMap) return
    const filePath = await exportMap(currentMap.id)
    if (filePath) {
      message.success(`已导出到: ${filePath}`)
    }
  }, [currentMap, exportMap, message])
  
  const handleImport = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = async (event) => {
        const content = event.target?.result as string
        const map = await importMap(content)
        if (map) {
          message.success(`已导入: ${map.name}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [importMap, message])
  
  return (
    <div 
      className={styles.mapFullscreen}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            className={styles.backButton}
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回
          </Button>
          <span className={styles.mapName}>{currentMap?.name || '未命名地图'}</span>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.toolGroup}>
            <Tooltip title="选择工具">
              <button
                className={`${styles.toolButton} ${tool === 'select' ? styles.toolButtonActive : ''}`}
                onClick={() => setTool('select')}
              >
                <SelectOutlined />
              </button>
            </Tooltip>
            <Tooltip title="平移工具">
              <button
                className={`${styles.toolButton} ${tool === 'pan' ? styles.toolButtonActive : ''}`}
                onClick={() => setTool('pan')}
              >
                <DragOutlined />
              </button>
            </Tooltip>
            <Tooltip title="连接工具">
              <button
                className={`${styles.toolButton} ${tool === 'connect' ? styles.toolButtonActive : ''}`}
                onClick={() => setTool('connect')}
              >
                <LinkOutlined />
              </button>
            </Tooltip>
            <Tooltip title="删除工具">
              <button
                className={`${styles.toolButton} ${tool === 'delete' ? styles.toolButtonActive : ''}`}
                onClick={() => setTool('delete')}
              >
                <DeleteOutlined />
              </button>
            </Tooltip>
          </div>
          
          <div className={styles.divider} />
          
          <Tooltip title={`吸附: ${snapEnabled ? '开启' : '关闭'}`}>
            <Button
              type={snapEnabled ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              onClick={() => setSnapEnabled(!snapEnabled)}
            />
          </Tooltip>
          
          <Tooltip title="撤销">
            <Button
              icon={<UndoOutlined />}
              disabled={!canUndo}
              onClick={undo}
            />
          </Tooltip>
          <Tooltip title="重做">
            <Button
              icon={<RedoOutlined />}
              disabled={!canRedo}
              onClick={redo}
            />
          </Tooltip>
          
          <div className={styles.divider} />
          
          <Tooltip title="导入">
            <Button
              icon={<ImportOutlined />}
              onClick={handleImport}
            />
          </Tooltip>
          <Tooltip title="导出">
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            />
          </Tooltip>
          
          <Tooltip title="删除选中">
            <Button
              icon={<DeleteOutlined />}
              danger
              disabled={!selectedChunkId && !selectedElementId && !selectedConnectionId}
              onClick={handleDelete}
            />
          </Tooltip>
          
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            保存
          </Button>
        </div>
      </div>
      
      <Breadcrumb />
      
      <div className={styles.mainArea}>
        <div className={styles.canvasArea}>
          {isWorldView ? (
            <WorldCanvas onChunkDoubleClick={handleChunkDoubleClick} />
          ) : (
            <InnerCanvas onElementDoubleClick={handleElementDoubleClick} />
          )}
        </div>
        
        {isWorldView ? (
          <ChunkGallery onChunkDrop={() => {}} />
        ) : (
          <ElementGallery />
        )}
      </div>
      
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>
            当前视图: {currentLevel.name}
          </span>
          <span className={styles.statusItem}>
            板块: {currentMap?.data.chunks.length || 0}
          </span>
          <span className={styles.statusItem}>
            连接: {currentMap?.data.connections.length || 0}
          </span>
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusItem}>
            提示: 双击板块进入内部编辑
          </span>
        </div>
      </div>
    </div>
  )
}
