/**
 * 外观设置组件
 */

import { Radio, InputNumber, Button, Divider, Space, Typography, ColorPicker } from 'antd'
import type { Color } from 'antd/es/color-picker'
import {
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useThemeStore } from '@stores/themeStore'
import { PRESET_COLORS, DEFAULT_THEME } from '@types/theme'
import styles from './AppearanceSettings.module.css'

const { Text, Title } = Typography

function AppearanceSettings(): JSX.Element {
  const { config, resolvedMode, setMode, setPrimaryColor, setFontSize, resetTheme } = useThemeStore()

  return (
    <div className={styles.container}>
      {/* 主题模式 */}
      <div className={styles.section}>
        <Title level={5}>主题模式</Title>
        <Text type="secondary">选择应用的显示主题</Text>
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
      </div>

      <Divider />

      {/* 主题色 */}
      <div className={styles.section}>
        <Title level={5}>主题色</Title>
        <Text type="secondary">选择应用的主色调</Text>
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
      </div>

      <Divider />

      {/* 字体大小 */}
      <div className={styles.section}>
        <Title level={5}>字体大小</Title>
        <Text type="secondary">调整界面字体大小</Text>
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
      </div>

      <Divider />

      {/* 重置 */}
      <div className={styles.section}>
        <Title level={5}>重置</Title>
        <Text type="secondary">恢复默认外观设置</Text>
        <div className={styles.resetOption}>
          <Button
            icon={<ReloadOutlined />}
            onClick={resetTheme}
          >
            恢复默认设置
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AppearanceSettings
