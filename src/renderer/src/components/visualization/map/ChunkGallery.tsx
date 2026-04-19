import { useState, useMemo } from 'react'
import { Input, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import * as Icons from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { CHUNK_TYPE_CONFIG, type ChunkType } from '@renderer/types/map'
import styles from './ChunkGallery.module.css'

const CHUNK_CATEGORIES: Record<string, ChunkType[]> = {
  '聚居地': ['city', 'village', 'castle', 'tower'],
  '自然地形': ['forest', 'desert', 'mountain', 'ocean', 'river', 'lake', 'swamp', 'grassland', 'snowland'],
  '特殊地点': ['volcano', 'cave', 'dungeon', 'ruins', 'temple', 'island'],
  '异世界': ['underground', 'sky'],
  '其他': ['custom']
}

interface ChunkGalleryProps {
  onChunkDrop: (chunkType: ChunkType, hexPosition: { q: number; r: number }) => void
}

export function ChunkGallery({ onChunkDrop }: ChunkGalleryProps) {
  const [searchText, setSearchText] = useState('')
  
  const addChunk = useMapStore(state => state.addChunk)
  const findNearestEmptyHex = useMapStore(state => state.findNearestEmptyHex)
  
  const filteredCategories = useMemo(() => {
    if (!searchText) return CHUNK_CATEGORIES
    
    const filtered: Record<string, ChunkType[]> = {}
    
    for (const [category, types] of Object.entries(CHUNK_CATEGORIES)) {
      const filteredTypes = types.filter(type => {
        const config = CHUNK_TYPE_CONFIG[type]
        return config.label.toLowerCase().includes(searchText.toLowerCase()) ||
               type.toLowerCase().includes(searchText.toLowerCase())
      })
      if (filteredTypes.length > 0) {
        filtered[category] = filteredTypes
      }
    }
    
    return filtered
  }, [searchText])
  
  const handleDragStart = (e: React.DragEvent, chunkType: ChunkType) => {
    e.dataTransfer.setData('chunkType', chunkType)
    e.dataTransfer.effectAllowed = 'copy'
  }
  
  const handleQuickAdd = (chunkType: ChunkType) => {
    const config = CHUNK_TYPE_CONFIG[chunkType]
    const hexPosition = findNearestEmptyHex({ q: 0, r: 0 })
    
    if (!hexPosition) {
      message.warning('没有可用的空位')
      return
    }
    
    addChunk({
      chunkType,
      hexPosition
    })
    message.success(`已添加${config.label}`)
  }
  
  return (
    <div className={styles.chunkGallery}>
      <div className={styles.galleryHeader}>
        <h3>板块图库</h3>
        <Input
          className={styles.searchInput}
          placeholder="搜索板块类型..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>
      
      <div className={styles.galleryContent}>
        {Object.entries(filteredCategories).map(([category, types]) => (
          <div key={category} className={styles.category}>
            <div className={styles.categoryTitle}>{category}</div>
            <div className={styles.chunkList}>
              {types.map(type => {
                const config = CHUNK_TYPE_CONFIG[type]
                const IconComponent = (Icons as Record<string, React.ComponentType>)[config.icon] || Icons.QuestionCircleOutlined
                
                return (
                  <div
                    key={type}
                    className={styles.chunkItem}
                    draggable
                    onDragStart={(e) => handleDragStart(e, type)}
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
    </div>
  )
}
