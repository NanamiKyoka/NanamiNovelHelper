import { useCallback } from 'react'
import MapList from './MapList'
import MapPreview from './MapPreview'
import { MapFullscreen } from './MapFullscreen'
import { useMapStore } from '@stores/mapStore'
import { useUIStore } from '@stores/uiStore'
import styles from './MapPanel.module.css'

function MapPanel(): JSX.Element {
  const currentMap = useMapStore(state => state.currentMap)
  const loadMap = useMapStore(state => state.loadMap)
  const fullscreenMode = useUIStore(state => state.fullscreenMode)
  const setFullscreenMode = useUIStore(state => state.setFullscreenMode)
  
  const handleSelectMap = useCallback(async (mapId: string) => {
    await loadMap(mapId)
  }, [loadMap])
  
  const handleCreateAndEdit = useCallback(async (mapId: string) => {
    await loadMap(mapId)
    setFullscreenMode('map')
  }, [loadMap, setFullscreenMode])
  
  const handleEnterEditMode = useCallback(() => {
    setFullscreenMode('map')
  }, [setFullscreenMode])
  
  const handleBackToList = useCallback(() => {
    setFullscreenMode(null)
  }, [setFullscreenMode])
  
  if (fullscreenMode === 'map' && currentMap) {
    return <MapFullscreen />
  }
  
  if (currentMap) {
    return (
      <MapPreview
        mapId={currentMap.id}
        onClose={handleBackToList}
        onEnterEditMode={handleEnterEditMode}
      />
    )
  }
  
  return (
    <div className={styles.container}>
      <MapList 
        onSelectMap={handleSelectMap}
        onCreateAndEdit={handleCreateAndEdit}
      />
    </div>
  )
}

export default MapPanel
