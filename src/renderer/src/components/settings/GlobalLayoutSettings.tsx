/**
 * 全局界面布局设置组件
 * 管理视图系统/布局等界面布局相关设置（跨项目共享）
 */

import { useMemo } from 'react'
import { Switch, App, Card } from 'antd'
import {
  InfoCircleOutlined,
  EyeOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import { useViewStore } from '@stores/viewStore'
import baseStyles from './SettingsBase.module.css'
import styles from './LayoutSettings.module.css'

function GlobalLayoutSettings(): JSX.Element {
  const { message } = App.useApp()
  const globalSettings = useSettingsStore(state => state.globalSettings)
  const setShowHiddenFiles = useSettingsStore(state => state.setShowHiddenFiles)
  const viewDefs = useViewStore(state => state.viewDefs)
  const viewConfig = useViewStore(state => state.viewConfig)

  const showHiddenFiles = useMemo(() => {
    return globalSettings.layout?.showHiddenFiles ?? false
  }, [globalSettings.layout?.showHiddenFiles])

  const handleToggleHiddenFiles = async (checked: boolean) => {
    try {
      await setShowHiddenFiles(checked)
    } catch {
      message.error('保存设置失败')
    }
  }

  const primaryViews = viewConfig.primary.map(id => viewDefs[id]).filter(Boolean)
  const secondaryViews = viewConfig.secondary.map(id => viewDefs[id]).filter(Boolean)

  return (
    <div className={baseStyles.container}>
      {/* 视图系统状态 */}
      <Card
        title={
          <span>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            视图系统
          </span>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <LeftOutlined style={{ marginRight: 6 }} />
            主侧边栏（{primaryViews.length} 个视图）
          </div>
          <div className={styles.viewList}>
            {primaryViews.map(v => (
              <span key={v.id} className={styles.viewTag}>
                {v.label}
              </span>
            ))}
            {primaryViews.length === 0 && (
              <span className={styles.viewEmpty}>暂无视图</span>
            )}
          </div>
        </div>

        <div className={styles.section} style={{ marginTop: 12 }}>
          <div className={styles.sectionTitle}>
            <RightOutlined style={{ marginRight: 6 }} />
            辅助侧边栏（{secondaryViews.length} 个视图）
          </div>
          <div className={styles.viewList}>
            {secondaryViews.map(v => (
              <span key={v.id} className={styles.viewTag}>
                {v.label}
              </span>
            ))}
            {secondaryViews.length === 0 && (
              <span className={styles.viewEmpty}>暂无视图</span>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
          提示: 在 ActivityBar 图标上右键可「移动到辅助侧边栏」，
          在辅助侧边栏 Tab 上右键可「移动到主侧边栏」。
        </div>
      </Card>

      {/* 文件显示设置 */}
      <Card
        title={
          <span>
            <EyeOutlined style={{ marginRight: 8 }} />
            文件显示
          </span>
        }
        size="small"
      >
        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <div className={styles.settingsLabel}>显示隐藏文件</div>
            <div className={styles.settingsDesc}>
              在文件树中显示以 . 开头的文件和文件夹
            </div>
          </div>
          <Switch checked={showHiddenFiles} onChange={handleToggleHiddenFiles} />
        </div>
      </Card>
    </div>
  )
}

export default GlobalLayoutSettings
