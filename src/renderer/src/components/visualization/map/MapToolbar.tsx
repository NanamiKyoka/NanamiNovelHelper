/**
 * 地图编辑工具栏
 */

import { Button, Tooltip, Divider } from 'antd'
import { 
  SelectOutlined, 
  EditOutlined,
  LinkOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { useMapStore } from '@renderer/stores/mapStore'
import type { MapTool } from '@renderer/types/map'
import styles from './MapToolbar.module.css'

interface MapToolbarProps {
  onSave?: () => void
}

interface ToolConfig {
  key: MapTool
  icon: React.ReactNode
  label: string
  shortcut: string
}

const TOOLS: ToolConfig[] = [
  { key: 'select', icon: <SelectOutlined />, label: '选择', shortcut: 'V' },
  { key: 'draw', icon: <EditOutlined />, label: '绘制', shortcut: 'D' },
  { key: 'connect', icon: <LinkOutlined />, label: '连接', shortcut: 'C' }
]

export function MapToolbar({ onSave }: MapToolbarProps) {
  const tool = useMapStore(state => state.tool)
  const setTool = useMapStore(state => state.setTool)
  const canUndo = useMapStore(state => state.canUndo)
  const canRedo = useMapStore(state => state.canRedo)
  const undo = useMapStore(state => state.undo)
  const redo = useMapStore(state => state.redo)
  const saveCurrentMap = useMapStore(state => state.saveCurrentMap)
  
  const handleToolClick = (toolKey: MapTool) => {
    setTool(toolKey)
  }
  
  const handleSave = () => {
    saveCurrentMap()
    onSave?.()
  }
  
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolsGroup}>
        {TOOLS.map(t => (
          <Tooltip key={t.key} title={`${t.label} (${t.shortcut})`} placement="right">
            <Button
              type={tool === t.key ? 'primary' : 'text'}
              icon={t.icon}
              onClick={() => handleToolClick(t.key)}
              className={tool === t.key ? styles.activeTool : ''}
            />
          </Tooltip>
        ))}
      </div>
      
      <Divider type="horizontal" className={styles.divider} />
      
      <div className={styles.toolsGroup}>
        <Tooltip title={`撤销 (Ctrl+Z)${canUndo ? '' : ' - 无操作'}`} placement="right">
          <Button
            type="text"
            icon={<UndoOutlined />}
            onClick={undo}
            disabled={!canUndo}
          />
        </Tooltip>
        
        <Tooltip title={`重做 (Ctrl+Y)${canRedo ? '' : ' - 无操作'}`} placement="right">
          <Button
            type="text"
            icon={<RedoOutlined />}
            onClick={redo}
            disabled={!canRedo}
          />
        </Tooltip>
      </div>
      
      <Divider type="horizontal" className={styles.divider} />
      
      <div className={styles.toolsGroup}>
        <Tooltip title="保存 (Ctrl+S)" placement="right">
          <Button
            type="text"
            icon={<SaveOutlined />}
            onClick={handleSave}
          />
        </Tooltip>
      </div>
      
      <div className={styles.hint}>
        <div className={styles.hintTitle}>绘制提示</div>
        <ul className={styles.hintList}>
          <li>点击添加顶点</li>
          <li>双击完成绘制</li>
          <li>按 Enter 完成</li>
          <li>按 Esc 取消</li>
        </ul>
      </div>
    </div>
  )
}
