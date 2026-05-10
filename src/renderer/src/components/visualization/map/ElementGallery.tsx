import { useState, useMemo, useCallback } from 'react'
import { Input, App } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import * as Icons from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { ELEMENT_TYPE_CONFIG, type ElementType } from '@renderer/types/map'
import styles from './ElementGallery.module.css'

const ELEMENT_CATEGORIES: Record<string, ElementType[]> = {
  建筑: ['building', 'shop', 'house', 'inn', 'tavern', 'temple', 'gate'],
  自然: ['tree', 'rock', 'water', 'road', 'bridge'],
  角色: ['npc', 'monster'],
  物品: ['treasure', 'trap', 'portal', 'landmark'],
  其他: ['custom']
}

export function ElementGallery() {
  const { message } = App.useApp()
  const [searchText, setSearchText] = useState('')

  const viewStack = useMapStore(state => state.viewStack)
  const addElement = useMapStore(state => state.addElement)
  const findNearestEmptyHexForElement = useMapStore(state => state.findNearestEmptyHexForElement)

  const currentLevel = viewStack[viewStack.length - 1]
  const parentChunkId = viewStack.find(v => v.type === 'chunk')?.id
  const parentElementId = currentLevel.type === 'element' ? currentLevel.id : null

  const filteredCategories = useMemo(() => {
    if (!searchText) return ELEMENT_CATEGORIES

    const filtered: Record<string, ElementType[]> = {}

    for (const [category, types] of Object.entries(ELEMENT_CATEGORIES)) {
      const filteredTypes = types.filter(type => {
        const config = ELEMENT_TYPE_CONFIG[type]
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

  const handleAddElement = useCallback(
    (elementType: ElementType) => {
      if (!parentChunkId) {
        message.warning('无法确定父级板块')
        return
      }

      const config = ELEMENT_TYPE_CONFIG[elementType]

      const hexPosition = findNearestEmptyHexForElement(parentChunkId, parentElementId)

      if (!hexPosition) {
        message.warning('没有可用的空位')
        return
      }

      addElement(parentChunkId, parentElementId, {
        elementType,
        hexPosition
      })

      message.success(`已添加${config.label}`)
    },
    [parentChunkId, parentElementId, addElement, findNearestEmptyHexForElement, message]
  )

  return (
    <div className={styles.elementGallery}>
      <div className={styles.galleryHeader}>
        <h3>元素图库</h3>
        <Input
          className={styles.searchInput}
          placeholder="搜索元素类型..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <div className={styles.galleryContent}>
        {Object.entries(filteredCategories).map(([category, types]) => (
          <div key={category} className={styles.category}>
            <div className={styles.categoryTitle}>{category}</div>
            <div className={styles.elementList}>
              {types.map(type => {
                const config = ELEMENT_TYPE_CONFIG[type]
                const IconComponent =
                  (Icons as Record<string, React.ComponentType>)[config.icon] ||
                  Icons.QuestionCircleOutlined

                return (
                  <div
                    key={type}
                    className={`${styles.elementItem} ${config.canHaveChildren ? styles.canHaveChildren : ''}`}
                    onClick={() => handleAddElement(type)}
                    title={`${config.label}: ${config.description}${config.canHaveChildren ? ' (可包含子元素)' : ''}`}
                  >
                    <div className={styles.elementItemIcon} style={{ color: config.defaultColor }}>
                      <IconComponent />
                    </div>
                    <div className={styles.elementItemName}>{config.label}</div>
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
