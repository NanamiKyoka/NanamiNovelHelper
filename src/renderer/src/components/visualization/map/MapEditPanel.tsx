/**
 * 地图编辑面板
 *
 * 用于编辑选中元素的属性
 */

import { useState, useEffect } from 'react'
import { Input, Select, InputNumber, ColorPicker, Button, Divider, Empty } from 'antd'
import { DeleteOutlined, LinkOutlined } from '@ant-design/icons'
import { useMapStore } from '@renderer/stores/mapStore'
import type {
  UpdateRegionOptions,
  UpdateConnectionOptions,
  ConnectionType,
  LineStyle
} from '@renderer/types/map'
import styles from './MapEditPanel.module.css'

const { TextArea } = Input

const CONNECTION_TYPES: { value: ConnectionType; label: string }[] = [
  { value: 'land', label: '陆路' },
  { value: 'water', label: '水路' },
  { value: 'portal', label: '传送' },
  { value: 'custom', label: '自定义' }
]

const LINE_STYLES: { value: LineStyle; label: string }[] = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' }
]

export function MapEditPanel() {
  const currentMap = useMapStore(state => state.currentMap)
  const selectedRegionId = useMapStore(state => state.selectedRegionId)
  const selectedConnectionId = useMapStore(state => state.selectedConnectionId)

  const updateRegion = useMapStore(state => state.updateRegion)
  const updateConnection = useMapStore(state => state.updateConnection)
  const deleteRegion = useMapStore(state => state.deleteRegion)
  const deleteConnection = useMapStore(state => state.deleteConnection)
  const selectRegion = useMapStore(state => state.selectRegion)

  // 获取选中的元素
  const selectedRegion = currentMap?.data?.regions?.find(r => r.id === selectedRegionId)
  const selectedConnection = currentMap?.data?.connections?.find(c => c.id === selectedConnectionId)

  // 板块编辑状态
  const [regionForm, setRegionForm] = useState<{
    name: string
    description: string
    color: string
    borderColor: string
    borderWidth: number
    opacity: number
  }>({
    name: '',
    description: '',
    color: '#4a9eff',
    borderColor: '#2d7dd2',
    borderWidth: 2,
    opacity: 0.7
  })

  // 连接编辑状态
  const [connectionForm, setConnectionForm] = useState<{
    name: string
    description: string
    connectionType: ConnectionType
    customTypeName: string
    color: string
    lineWidth: number
    lineStyle: LineStyle
  }>({
    name: '',
    description: '',
    connectionType: 'land',
    customTypeName: '',
    color: '#ffffff',
    lineWidth: 2,
    lineStyle: 'solid'
  })

  // 同步板块表单
  useEffect(() => {
    if (selectedRegion) {
      setRegionForm({
        name: selectedRegion.name,
        description: selectedRegion.description,
        color: selectedRegion.color,
        borderColor: selectedRegion.borderColor,
        borderWidth: selectedRegion.borderWidth,
        opacity: selectedRegion.opacity
      })
    }
  }, [selectedRegion])

  // 同步连接表单
  useEffect(() => {
    if (selectedConnection) {
      setConnectionForm({
        name: selectedConnection.name || '',
        description: selectedConnection.description || '',
        connectionType: selectedConnection.connectionType,
        customTypeName: selectedConnection.customTypeName || '',
        color: selectedConnection.color,
        lineWidth: selectedConnection.lineWidth,
        lineStyle: selectedConnection.lineStyle
      })
    }
  }, [selectedConnection])

  // 更新板块属性
  const handleRegionChange = (key: string, value: string | number) => {
    setRegionForm(prev => ({ ...prev, [key]: value }))

    if (selectedRegionId) {
      updateRegion(selectedRegionId, { [key]: value } as UpdateRegionOptions)
    }
  }

  // 更新连接属性
  const handleConnectionChange = (key: string, value: string | number) => {
    setConnectionForm(prev => ({ ...prev, [key]: value }))

    if (selectedConnectionId) {
      updateConnection(selectedConnectionId, { [key]: value } as UpdateConnectionOptions)
    }
  }

  // 获取连接的板块名称
  const getConnectionRegionNames = () => {
    if (!selectedConnection || !currentMap?.data) return { source: '', target: '' }

    const sourceRegion = currentMap.data.regions?.find(r => r.id === selectedConnection.sourceId)
    const targetRegion = currentMap.data.regions?.find(r => r.id === selectedConnection.targetId)

    return {
      source: sourceRegion?.name || '未知',
      target: targetRegion?.name || '未知'
    }
  }

  // 渲染板块编辑面板
  if (selectedRegion) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>板块属性</h3>
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => deleteRegion(selectedRegionId!)}
          />
        </div>

        <div className={styles.content}>
          <div className={styles.field}>
            <label>名称</label>
            <Input
              value={regionForm.name}
              onChange={e => handleRegionChange('name', e.target.value)}
              placeholder="输入板块名称"
            />
          </div>

          <div className={styles.field}>
            <label>描述</label>
            <TextArea
              value={regionForm.description}
              onChange={e => handleRegionChange('description', e.target.value)}
              placeholder="输入板块描述"
              rows={3}
            />
          </div>

          <Divider>样式</Divider>

          <div className={styles.field}>
            <label>填充颜色</label>
            <ColorPicker
              value={regionForm.color}
              onChange={(_, hex) => handleRegionChange('color', hex)}
              showText
            />
          </div>

          <div className={styles.field}>
            <label>边框颜色</label>
            <ColorPicker
              value={regionForm.borderColor}
              onChange={(_, hex) => handleRegionChange('borderColor', hex)}
              showText
            />
          </div>

          <div className={styles.field}>
            <label>边框宽度</label>
            <InputNumber
              value={regionForm.borderWidth}
              onChange={v => handleRegionChange('borderWidth', v ?? 2)}
              min={0}
              max={10}
              style={{ width: '100%' }}
            />
          </div>

          <div className={styles.field}>
            <label>透明度</label>
            <InputNumber
              value={regionForm.opacity}
              onChange={v => handleRegionChange('opacity', v ?? 0.7)}
              min={0}
              max={1}
              step={0.1}
              style={{ width: '100%' }}
            />
          </div>

          <Divider>连接</Divider>

          <div className={styles.connectionsList}>
            {currentMap?.data?.connections
              ?.filter(c => c.sourceId === selectedRegionId || c.targetId === selectedRegionId)
              .map(connection => {
                const otherRegionId =
                  connection.sourceId === selectedRegionId
                    ? connection.targetId
                    : connection.sourceId
                const otherRegion = currentMap?.data?.regions?.find(r => r.id === otherRegionId)

                return (
                  <div
                    key={connection.id}
                    className={styles.connectionItem}
                    onClick={() => {
                      selectRegion(null)
                      useMapStore.getState().selectConnection(connection.id)
                    }}
                  >
                    <LinkOutlined />
                    <span>{otherRegion?.name || '未知'}</span>
                    <span className={styles.connectionType}>
                      {connection.connectionType === 'land'
                        ? '陆路'
                        : connection.connectionType === 'water'
                          ? '水路'
                          : connection.connectionType === 'portal'
                            ? '传送'
                            : connection.customTypeName || '自定义'}
                    </span>
                  </div>
                )
              })}
            {currentMap?.data?.connections?.filter(
              c => c.sourceId === selectedRegionId || c.targetId === selectedRegionId
            ).length === 0 && <div className={styles.emptyConnections}>暂无连接</div>}
          </div>
        </div>
      </div>
    )
  }

  // 渲染连接编辑面板
  if (selectedConnection) {
    const { source, target } = getConnectionRegionNames()

    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>连接属性</h3>
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => deleteConnection(selectedConnectionId!)}
          />
        </div>

        <div className={styles.content}>
          <div className={styles.connectedRegions}>
            <span
              className={styles.regionLink}
              onClick={() => {
                if (selectedConnection) {
                  useMapStore.getState().selectConnection(null)
                  selectRegion(selectedConnection.sourceId)
                }
              }}
            >
              {source}
            </span>
            <span className={styles.arrow}>→</span>
            <span
              className={styles.regionLink}
              onClick={() => {
                if (selectedConnection) {
                  useMapStore.getState().selectConnection(null)
                  selectRegion(selectedConnection.targetId)
                }
              }}
            >
              {target}
            </span>
          </div>

          <div className={styles.field}>
            <label>名称</label>
            <Input
              value={connectionForm.name}
              onChange={e => handleConnectionChange('name', e.target.value)}
              placeholder="连接名称（可选）"
            />
          </div>

          <div className={styles.field}>
            <label>描述</label>
            <TextArea
              value={connectionForm.description}
              onChange={e => handleConnectionChange('description', e.target.value)}
              placeholder="连接描述（可选）"
              rows={2}
            />
          </div>

          <Divider>类型</Divider>

          <div className={styles.field}>
            <label>连接类型</label>
            <Select
              value={connectionForm.connectionType}
              onChange={v => handleConnectionChange('connectionType', v)}
              options={CONNECTION_TYPES}
              style={{ width: '100%' }}
            />
          </div>

          {connectionForm.connectionType === 'custom' && (
            <div className={styles.field}>
              <label>自定义类型名</label>
              <Input
                value={connectionForm.customTypeName}
                onChange={e => handleConnectionChange('customTypeName', e.target.value)}
                placeholder="输入自定义类型名称"
              />
            </div>
          )}

          <Divider>样式</Divider>

          <div className={styles.field}>
            <label>颜色</label>
            <ColorPicker
              value={connectionForm.color}
              onChange={(_, hex) => handleConnectionChange('color', hex)}
              showText
            />
          </div>

          <div className={styles.field}>
            <label>线宽</label>
            <InputNumber
              value={connectionForm.lineWidth}
              onChange={v => handleConnectionChange('lineWidth', v ?? 2)}
              min={1}
              max={10}
              style={{ width: '100%' }}
            />
          </div>

          <div className={styles.field}>
            <label>线条样式</label>
            <Select
              value={connectionForm.lineStyle}
              onChange={v => handleConnectionChange('lineStyle', v)}
              options={LINE_STYLES}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    )
  }

  // 无选中元素
  return (
    <div className={styles.panel}>
      <div className={styles.empty}>
        <Empty description="选择一个板块或连接进行编辑" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    </div>
  )
}
