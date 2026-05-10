import { useState, useMemo, useCallback } from 'react'
import { Input, App, Modal, Button, ColorPicker } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import * as Icons from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { useSettingsStore } from '@stores/settingsStore'
import { CHUNK_TYPE_CONFIG, type ChunkType } from '@renderer/types/map'
import type { CustomChunkType } from '@shared/settings'
import styles from './ChunkGallery.module.css'

const CHUNK_CATEGORIES: Record<string, ChunkType[]> = {
  聚居地: ['city', 'village', 'castle', 'tower'],
  自然地形: [
    'forest',
    'desert',
    'mountain',
    'ocean',
    'river',
    'lake',
    'swamp',
    'grassland',
    'snowland'
  ],
  特殊地点: ['volcano', 'cave', 'dungeon', 'ruins', 'temple', 'island'],
  异世界: ['underground', 'sky']
}

const AVAILABLE_ICONS = [
  'HomeOutlined',
  'BankOutlined',
  'ShopOutlined',
  'BuildOutlined',
  'CrownOutlined',
  'CastleOutlined',
  'AimOutlined',
  'EnvironmentOutlined',
  'CompassOutlined',
  'GlobalOutlined',
  'ThunderboltOutlined',
  'FireOutlined',
  'CloudOutlined',
  'SunOutlined',
  'StarOutlined',
  'HeartOutlined',
  'DiamondOutlined',
  'GiftOutlined',
  'RocketOutlined',
  'FlagOutlined',
  'KeyOutlined',
  'LockOutlined',
  'UnlockOutlined',
  'EyeOutlined',
  'EyeInvisibleOutlined',
  'BookOutlined',
  'ReadOutlined',
  'EditOutlined',
  'DeleteOutlined',
  'SettingOutlined'
]

interface ChunkGalleryProps {
  getCenterHex?: () => { q: number; r: number } | null
}

export function ChunkGallery({ getCenterHex }: ChunkGalleryProps) {
  const { message } = App.useApp()
  const [searchText, setSearchText] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newChunkName, setNewChunkName] = useState('')
  const [newChunkIcon, setNewChunkIcon] = useState('SettingOutlined')
  const [newChunkColor, setNewChunkColor] = useState('#9e9e9e')
  const [newChunkDescription, setNewChunkDescription] = useState('')

  const addChunk = useMapStore(state => state.addChunk)
  const findNearestEmptyHex = useMapStore(state => state.findNearestEmptyHex)
  const projectSettings = useSettingsStore(state => state.projectSettings)
  const hasProject = useSettingsStore(state => state.hasProject)
  const addCustomChunkType = useSettingsStore(state => state.addCustomChunkType)
  const deleteCustomChunkType = useSettingsStore(state => state.deleteCustomChunkType)

  const customChunkTypes = useMemo(
    () => projectSettings?.customChunkTypes ?? [],
    [projectSettings?.customChunkTypes]
  )

  const filteredCategories = useMemo(() => {
    if (!searchText) return CHUNK_CATEGORIES

    const filtered: Record<string, ChunkType[]> = {}

    for (const [category, types] of Object.entries(CHUNK_CATEGORIES)) {
      const filteredTypes = types.filter(type => {
        const config = CHUNK_TYPE_CONFIG[type]
        return (
          config.label.toLowerCase().includes(searchText.toLowerCase()) ||
          type.toLowerCase().includes(searchText.toLowerCase())
        )
      })
      if (filteredTypes.length > 0) {
        filtered[category] = filteredTypes
      }
    }

    return filtered
  }, [searchText])

  const filteredCustomChunkTypes = useMemo(() => {
    if (!searchText) return customChunkTypes
    return customChunkTypes.filter(
      ct =>
        ct.name.toLowerCase().includes(searchText.toLowerCase()) ||
        ct.description.toLowerCase().includes(searchText.toLowerCase())
    )
  }, [searchText, customChunkTypes])

  const handleQuickAdd = useCallback(
    (chunkType: ChunkType) => {
      const config = CHUNK_TYPE_CONFIG[chunkType]
      const centerHex = getCenterHex?.()
      const searchOrigin = centerHex || { q: 0, r: 0 }
      const hexPosition = findNearestEmptyHex(searchOrigin)

      if (!hexPosition) {
        message.warning('没有可用的空位')
        return
      }

      addChunk({
        chunkType,
        hexPosition
      })
      message.success(`已添加${config.label}`)
    },
    [addChunk, findNearestEmptyHex, getCenterHex, message]
  )

  const handleAddCustomChunk = useCallback(
    (customType: CustomChunkType) => {
      const centerHex = getCenterHex?.()
      const searchOrigin = centerHex || { q: 0, r: 0 }
      const hexPosition = findNearestEmptyHex(searchOrigin)

      if (!hexPosition) {
        message.warning('没有可用的空位')
        return
      }

      addChunk({
        chunkType: 'custom',
        customTypeName: customType.name,
        hexPosition,
        icon: customType.icon,
        color: customType.color
      })
      message.success(`已添加${customType.name}`)
    },
    [addChunk, findNearestEmptyHex, getCenterHex, message]
  )

  const handleCreateCustomChunk = useCallback(async () => {
    if (!hasProject) {
      message.warning('请先打开项目')
      return
    }

    if (!newChunkName.trim()) {
      message.warning('请输入板块名称')
      return
    }

    try {
      const result = await addCustomChunkType({
        name: newChunkName.trim(),
        icon: newChunkIcon,
        color: newChunkColor,
        description: newChunkDescription.trim() || '自定义板块'
      })

      if (result) {
        message.success('自定义板块已创建')
        setIsCreateModalOpen(false)
        setNewChunkName('')
        setNewChunkIcon('SettingOutlined')
        setNewChunkColor('#9e9e9e')
        setNewChunkDescription('')
      } else {
        message.error('创建自定义板块失败：项目未打开')
      }
    } catch (error) {
      console.error('Failed to create custom chunk type:', error)
      message.error('创建自定义板块失败，请重试')
    }
  }, [hasProject, addCustomChunkType, message, newChunkName, newChunkIcon, newChunkColor, newChunkDescription])

  const handleDeleteCustomChunk = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这个自定义板块类型吗？',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          await deleteCustomChunkType(id)
          message.success('已删除')
        }
      })
    },
    [deleteCustomChunkType, message]
  )

  return (
    <div className={styles.chunkGallery}>
      <div className={styles.galleryHeader}>
        <h3>板块图库</h3>
        <Input
          className={styles.searchInput}
          placeholder="搜索板块类型..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <div className={styles.galleryContent}>
        <div className={styles.category}>
          <div className={styles.categoryTitle}>
            自定义板块
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalOpen(true)}
              className={styles.addButton}
              disabled={!hasProject}
              title={!hasProject ? '请先打开项目' : '创建自定义板块'}
            />
          </div>
          {filteredCustomChunkTypes.length > 0 ? (
            <div className={styles.chunkList}>
              {filteredCustomChunkTypes.map(ct => {
                const IconComponent =
                  (Icons as Record<string, React.ComponentType>)[ct.icon] ||
                  Icons.SettingOutlined

                return (
                  <div
                    key={ct.id}
                    className={styles.chunkItem}
                    onClick={() => handleAddCustomChunk(ct)}
                    title={`${ct.name}: ${ct.description}`}
                  >
                    <div className={styles.chunkItemIcon} style={{ color: ct.color }}>
                      <IconComponent />
                    </div>
                    <div className={styles.chunkItemName}>{ct.name}</div>
                    <div
                      className={styles.deleteButton}
                      onClick={e => handleDeleteCustomChunk(ct.id, e)}
                    >
                      ×
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={styles.emptyCustomHint}>
              {!hasProject ? '请先打开项目' : '点击右侧 + 按钮创建'}
            </div>
          )}
        </div>

        {Object.entries(filteredCategories).map(([category, types]) => (
          <div key={category} className={styles.category}>
            <div className={styles.categoryTitle}>{category}</div>
            <div className={styles.chunkList}>
              {types.map(type => {
                const config = CHUNK_TYPE_CONFIG[type]
                const IconComponent =
                  (Icons as Record<string, React.ComponentType>)[config.icon] ||
                  Icons.QuestionCircleOutlined

                return (
                  <div
                    key={type}
                    className={styles.chunkItem}
                    onClick={() => handleQuickAdd(type)}
                    title={`${config.label}: ${config.description}`}
                  >
                    <div className={styles.chunkItemIcon} style={{ color: config.defaultColor }}>
                      <IconComponent />
                    </div>
                    <div className={styles.chunkItemName}>{config.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal
        title="创建自定义板块"
        open={isCreateModalOpen}
        onOk={handleCreateCustomChunk}
        onCancel={() => setIsCreateModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <div className={styles.createForm}>
          <div className={styles.formItem}>
            <label>名称 *</label>
            <Input
              value={newChunkName}
              onChange={e => setNewChunkName(e.target.value)}
              placeholder="输入板块名称"
            />
          </div>
          <div className={styles.formItem}>
            <label>图标</label>
            <div className={styles.iconGrid}>
              {AVAILABLE_ICONS.map(iconName => {
                const IconComponent =
                  (Icons as Record<string, React.ComponentType>)[iconName] ||
                  Icons.QuestionCircleOutlined
                return (
                  <div
                    key={iconName}
                    className={`${styles.iconOption} ${newChunkIcon === iconName ? styles.selected : ''}`}
                    onClick={() => setNewChunkIcon(iconName)}
                  >
                    <IconComponent />
                  </div>
                )
              })}
            </div>
          </div>
          <div className={styles.formItem}>
            <label>颜色</label>
            <ColorPicker value={newChunkColor} onChange={(_, hex) => setNewChunkColor(hex)} />
          </div>
          <div className={styles.formItem}>
            <label>描述</label>
            <Input
              value={newChunkDescription}
              onChange={e => setNewChunkDescription(e.target.value)}
              placeholder="输入板块描述（可选）"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
