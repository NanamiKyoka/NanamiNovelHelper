import { useRef, useState, useCallback, useEffect } from 'react'

interface UseCanvasInteractionOptions {
  zoom: number
  panX: number
  panY: number
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  minZoom?: number
  maxZoom?: number
}

interface UseCanvasInteractionReturn {
  containerRef: React.RefObject<HTMLDivElement>
  isPanning: boolean
  isSpacePressed: boolean
  handleWheel: (e: WheelEvent) => void
}

export function useCanvasInteraction({
  zoom,
  panX,
  panY,
  setZoom,
  setPan,
  minZoom = 0.1,
  maxZoom = 5
}: UseCanvasInteractionOptions): UseCanvasInteractionReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta))
      setZoom(newZoom)
    } else {
      setPan(panX - e.deltaX, panY - e.deltaY)
    }
  }, [zoom, panX, panY, setZoom, setPan, minZoom, maxZoom])
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setIsSpacePressed(true)
        }
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        setIsPanning(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  useEffect(() => {
    if (!isSpacePressed && isPanning) {
      setIsPanning(false)
    }
  }, [isSpacePressed, isPanning])
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSpacePressed || e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
    }
  }, [isSpacePressed, panX, panY])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y)
    }
  }, [isPanning, panStart, setPan])
  
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])
  
  const handleMouseLeave = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
    }
  }, [isPanning])
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('mousedown', handleMouseDown as unknown as EventListener)
    container.addEventListener('mousemove', handleMouseMove as unknown as EventListener)
    container.addEventListener('mouseup', handleMouseUp as unknown as EventListener)
    container.addEventListener('mouseleave', handleMouseLeave as unknown as EventListener)
    
    return () => {
      container.removeEventListener('mousedown', handleMouseDown as unknown as EventListener)
      container.removeEventListener('mousemove', handleMouseMove as unknown as EventListener)
      container.removeEventListener('mouseup', handleMouseUp as unknown as EventListener)
      container.removeEventListener('mouseleave', handleMouseLeave as unknown as EventListener)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave])
  
  return {
    containerRef,
    isPanning,
    isSpacePressed,
    handleWheel
  }
}
