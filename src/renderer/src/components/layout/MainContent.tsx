/**
 * 主内容区域组件
 */

import { SettingsPage } from '@components/settings'
import { EditorPanel } from '@components/editor'
import styles from './MainContent.module.css'

interface MainContentProps {
  activePanel?: string
}

function MainContent({ activePanel }: MainContentProps): JSX.Element {

  // 如果是设置面板，显示设置页面
  if (activePanel === 'settings') {
    return <SettingsPage />
  }

  // 显示编辑器面板
  return (
    <div className={styles.mainContent}>
      <EditorPanel />
    </div>
  )
}

export default MainContent