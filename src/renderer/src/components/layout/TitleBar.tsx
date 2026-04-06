import { useState, useEffect } from 'react'
import { MinusOutlined, FullscreenOutlined, FullscreenExitOutlined, CloseOutlined } from '@ant-design/icons'
import MenuBar from './MenuBar'
import styles from './TitleBar.module.css'

function TitleBar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // 监听最大化状态变化
    window.electron?.window?.onMaximizeChange?.((maximized) => {
      setIsMaximized(maximized)
    })

    // 初始状态
    window.electron?.window?.isMaximized?.().then((maximized) => {
      setIsMaximized(maximized)
    })

    return () => {
      window.electron?.window?.removeMaximizeListener?.()
    }
  }, [])

  const handleMinimize = () => {
    window.electron?.window?.minimize?.()
  }

  const handleMaximize = () => {
    window.electron?.window?.maximize?.()
  }

  const handleClose = () => {
    window.electron?.window?.close?.()
  }

  return (
    <div className={styles.titleBar}>
      {/* 左侧：菜单栏 */}
      <MenuBar />

      {/* 中间：拖拽区域 */}
      <div className={styles.dragRegion} style={{ flex: 1 }} />

      {/* 右侧：窗口控制按钮 */}
      <div className={styles.windowControls}>
        <button 
          className={`${styles.controlButton} ${styles.minimize}`}
          onClick={handleMinimize}
          title="最小化"
          aria-label="最小化窗口"
        >
          <MinusOutlined />
        </button>
        <button 
          className={`${styles.controlButton} ${styles.maximize}`}
          onClick={handleMaximize}
          title={isMaximized ? "还原" : "最大化"}
          aria-label={isMaximized ? "还原窗口" : "最大化窗口"}
        >
          {isMaximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        </button>
        <button 
          className={`${styles.controlButton} ${styles.close}`}
          onClick={handleClose}
          title="关闭"
          aria-label="关闭窗口"
        >
          <CloseOutlined />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
