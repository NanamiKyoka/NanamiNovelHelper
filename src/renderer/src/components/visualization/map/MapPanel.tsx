import React, { useCallback } from 'react'
import MapList from './MapList'
import MapPreview from './MapPreview'
import { MapFullscreen } from './MapFullscreen'
import styles from './MapPanel.module.css'

type ViewMode = 'list' | 'preview' | 'editor'

function MapPanel(): JSX.Element {
  const [viewMode, setViewMode] = React.useState<ViewMode>('list')
  const [currentMapId, setCurrentMapId] = React.useState<string | null>(null)

  const handleSelectMap = useCallback((mapId: string) => {
    setCurrentMapId(mapId)
    setViewMode('preview')
  }, [])

  const handleCreateAndEdit = useCallback((mapId: string) => {
    setCurrentMapId(mapId)
    setViewMode('editor')
  }, [])

  const handleEnterEditMode = useCallback(() => {
    setViewMode('editor')
  }, [])

  const handleBackToList = useCallback(() => {
    setViewMode('list')
    setCurrentMapId(null)
  }, [])

  const handleExitEditor = useCallback(() => {
    setViewMode('preview')
  }, [])

  return (
    <div className={styles.container}>
      {viewMode === 'list' && (
        <MapList 
          onSelectMap={handleSelectMap}
          onCreateAndEdit={handleCreateAndEdit}
        />
      )}
      {viewMode === 'preview' && currentMapId && (
        <MapPreview
          mapId={currentMapId}
          onClose={handleBackToList}
          onEnterEditMode={handleEnterEditMode}
        />
      )}
      {viewMode === 'editor' && currentMapId && (
        <MapFullscreen
          mapId={currentMapId}
          onBack={handleExitEditor}
        />
      )}
    </div>
  )
}

export default MapPanel
