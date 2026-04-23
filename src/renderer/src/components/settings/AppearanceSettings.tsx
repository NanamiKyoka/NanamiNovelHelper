/**
 * 外观设置组件
 */

import { Radio, InputNumber, Button, Space, Typography, ColorPicker, Card } from 'antd'
import type { Color } from 'antd/es/color-picker'
import {
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useThemeStore } from '@stores/themeStore'
import { PRESET_COLORS, DEFAULT_THEME } from '@types/theme'
import baseStyles from './SettingsBase.module.css'
import styles from './AppearanceSettings.module.css'

const { Text } = Typography

function AppearanceSettings(): JSX.Element {
  const { config, resolvedMode, setMode, setPrimaryColor, setFontSize, resetTheme } = useThemeStore()

  return (
    <div className={baseStyles.container}>
      <Card title="主题模式" className={baseStyles.card}>
        <div className={styles.modeOptions}>
          <Radio.Group
            value={config.mode}
            onChange={(e) => setMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="light">
              <SunOutlined /> 浅色
            </Radio.Button>
            <Radio.Button value="dark">
              <MoonOutlined /> 深色
            </Radio.Button>
            <Radio.Button value="system">
              <DesktopOutlined /> 跟随系统
            </Radio.Button>
          </Radio.Group>
          {config.mode === 'system' && (
            <Text type="secondary" className={styles.systemHint}>
              当前系统主题：{resolvedMode === 'dark' ? '深色' : '浅色'}
            </Text>
          )}
        </div>
      </Card>

      <Card title="主题色" className={baseStyles.card}>
        <div className={styles.colorOptions}>
          {PRESET_COLORS.map((color) => (
            <div
              key={color.value}
              className={`${styles.colorItem} ${config.primaryColor === color.value ? styles.active : ''}`}
              style={{ backgroundColor: color.value }}
              onClick={() => setPrimaryColor(color.value)}
              title={color.name}
            >
              {config.primaryColor === color.value && (
                <span className={styles.checkMark}>✓</span>
              )}
            </div>
          ))}
        </div>
        <div className={styles.customColor}>
          <Text type="secondary">自定义颜色：</Text>
          <ColorPicker
            value={config.primaryColor}
            onChange={(color: Color) => setPrimaryColor(color.toHexString())}
            showText
            format="hex"
          />
        </div>
      </Card>

      <Card title="字体大小" className={baseStyles.card}>
        <div className={styles.fontSizeOption}>
          <Space.Compact>
            <InputNumber
              min={12}
              max={24}
              value={config.fontSize}
              onChange={(value) => setFontSize(value || DEFAULT_THEME.fontSize)}
              style={{ width: 80 }}
            />
            <span className={styles.inputSuffix}>px</span>
          </Space.Compact>
        </div>
      </Card>

      <Card title="重置" className={baseStyles.card}>
        <Button
          icon={<ReloadOutlined />}
          onClick={resetTheme}
        >
          恢复默认设置
        </Button>
      </Card>
    </div>
  )
}

export default AppearanceSettings
