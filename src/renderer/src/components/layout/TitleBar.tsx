import { useEffect, useState } from 'react'
import {
  MinusOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CloseOutlined,
  DoubleRightOutlined
} from '@ant-design/icons'
import { useViewStore } from '@stores/viewStore'
import MenuBar from './MenuBar'
import styles from './TitleBar.module.css'

function TitleBar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // 监听最大化状态变化
    window.api?.window?.onMaximizeChange?.(maximized => {
      setIsMaximized(maximized)
    })

    // 初始状态
    window.api?.window?.isMaximized?.().then(maximized => {
      setIsMaximized(maximized)
    })

    return () => {
      window.api?.window?.removeMaximizeListener?.()
    }
  }, [])

  const handleMinimize = () => {
    window.api?.window?.minimize?.()
  }

  const handleMaximize = () => {
    window.api?.window?.maximize?.()
  }

  const handleClose = () => {
    window.api?.window?.close?.()
  }
  const toggleSecondary = useViewStore(s => s.toggleSecondary)

  return (
    <div className={styles.titleBar}>
      <MenuBar />
      <div className={styles.dragRegion} style={{ flex: 1 }} />
      <div className={styles.titleActions}>
        <button
          className={styles.toggleBtn}
          onClick={() => toggleSecondary()}
          title="切换辅助侧边栏"
          aria-label="切换辅助侧边栏"
          type="button"
        >
          <DoubleRightOutlined />
        </button>
      </div>
      <div className={styles.windowControls}>
        <button className={`${styles.controlButton} ${styles.minimize}`} onClick={handleMinimize} title="最小化" aria-label="最小化窗口">
          <MinusOutlined />
        </button>
        <button className={`${styles.controlButton} ${styles.maximize}`} onClick={handleMaximize} title={isMaximized ? '还原' : '最大化'} aria-label={isMaximized ? '还原窗口' : '最大化窗口'}>
          {isMaximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        </button>
        <button className={`${styles.controlButton} ${styles.close}`} onClick={handleClose} title="关闭" aria-label="关闭窗口">
          <CloseOutlined />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
