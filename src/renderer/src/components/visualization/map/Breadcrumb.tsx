import { GlobalOutlined, AppstoreOutlined, BlockOutlined } from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import type { ViewLevel } from '@renderer/types/map'
import styles from './Breadcrumb.module.css'

export function Breadcrumb() {
  const viewStack = useMapStore(state => state.viewStack)
  const goToLevel = useMapStore(state => state.goToLevel)
  
  const getIcon = (level: ViewLevel) => {
    switch (level.type) {
      case 'world':
        return <GlobalOutlined className={styles.breadcrumbIcon} />
      case 'chunk':
        return <AppstoreOutlined className={styles.breadcrumbIcon} />
      case 'element':
        return <BlockOutlined className={styles.breadcrumbIcon} />
    }
  }
  
  const getTypeLabel = (level: ViewLevel) => {
    switch (level.type) {
      case 'world':
        return '世界'
      case 'chunk':
        return '板块'
      case 'element':
        return '元素'
    }
  }
  
  return (
    <div className={styles.breadcrumb}>
      {viewStack.map((level, index) => (
        <div key={`${level.type}-${level.id}`} style={{ display: 'flex', alignItems: 'center' }}>
          <div
            className={`${styles.breadcrumbItem} ${index === viewStack.length - 1 ? styles.breadcrumbItemActive : ''}`}
            onClick={() => goToLevel(index)}
          >
            {getIcon(level)}
            <span>{level.name}</span>
            {level.type !== 'world' && (
              <span className={styles.levelType}>{getTypeLabel(level)}</span>
            )}
          </div>
          {index < viewStack.length - 1 && (
            <span className={styles.breadcrumbSeparator}>/</span>
          )}
        </div>
      ))}
    </div>
  )
}
