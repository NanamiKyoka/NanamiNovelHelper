/**
 * 编辑器设置组件
 */

import { useCallback } from 'react'
import { Form, Select, Switch, Slider, message, Checkbox, Card } from 'antd'
import { useEditorStore } from '@stores/editorStore'
import type { EditorSettings, StatusBarConfig } from '@types/editor'
import baseStyles from './SettingsBase.module.css'

const FONT_FAMILIES = [
  { value: 'PingFang SC, Microsoft YaHei, sans-serif', label: '苹方 / 微软雅黑' },
  { value: 'SimHei, sans-serif', label: '黑体' },
  { value: 'SimSun, serif', label: '宋体' },
  { value: 'KaiTi, serif', label: '楷体' },
  { value: 'Source Han Sans SC, Noto Sans CJK SC, sans-serif', label: '思源黑体' },
  { value: 'Source Han Serif SC, Noto Serif CJK SC, serif', label: '思源宋体' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'monospace', label: '等宽字体' }
]

const AUTO_SAVE_OPTIONS = [
  { value: 0, label: '禁用' },
  { value: 10000, label: '10 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '1 分钟' },
  { value: 120000, label: '2 分钟' },
  { value: 300000, label: '5 分钟' }
]

export function EditorSettings() {
  const { settings, updateSettings, statusBarConfig, updateStatusBarConfig } = useEditorStore()

  const handleSettingChange = useCallback(
    <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
      updateSettings({ [key]: value })
      message.success('设置已保存')
    },
    [updateSettings]
  )

  const handleStatusBarConfigChange = useCallback(
    <K extends keyof StatusBarConfig>(key: K, value: StatusBarConfig[K]) => {
      updateStatusBarConfig({ [key]: value })
      message.success('状态栏设置已保存')
    },
    [updateStatusBarConfig]
  )

  return (
    <div className={baseStyles.container}>
      <Card title="字体设置" className={baseStyles.card}>
        <Form layout="vertical" size="small">
          <Form.Item label="字体">
            <Select
              value={settings.fontFamily}
              onChange={value => handleSettingChange('fontFamily', value)}
              options={FONT_FAMILIES}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={`字体大小: ${settings.fontSize}px`}>
            <Slider
              min={12}
              max={28}
              value={settings.fontSize}
              onChange={value => handleSettingChange('fontSize', value)}
              marks={{ 12: '12', 14: '14', 16: '16', 18: '18', 20: '20', 24: '24', 28: '28' }}
            />
          </Form.Item>
          <Form.Item label={`行高: ${settings.lineHeight}`}>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={settings.lineHeight}
              onChange={value => handleSettingChange('lineHeight', value)}
              marks={{ 1: '1', 1.5: '1.5', 2: '2', 2.5: '2.5', 3: '3' }}
            />
          </Form.Item>
          <Form.Item label={`段落间距: ${settings.paragraphSpacing}em`}>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={settings.paragraphSpacing}
              onChange={value => handleSettingChange('paragraphSpacing', value)}
              marks={{ 0: '0', 0.5: '0.5', 1: '1', 1.5: '1.5', 2: '2' }}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card title="视图设置" className={baseStyles.card}>
        <Form layout="vertical" size="small">
          <Form.Item label="默认视图模式">
            <Select
              value={settings.viewMode}
              onChange={value => handleSettingChange('viewMode', value)}
              options={[
                { value: 'wysiwyg', label: '实时预览 (WYSIWYG)' },
                { value: 'split', label: '分栏预览' }
              ]}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="显示行号">
            <Switch
              checked={settings.showLineNumbers}
              onChange={checked => handleSettingChange('showLineNumbers', checked)}
            />
          </Form.Item>
          <Form.Item label="自动换行">
            <Switch
              checked={settings.wordWrap}
              onChange={checked => handleSettingChange('wordWrap', checked)}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card title="工具栏设置" className={baseStyles.card}>
        <Form layout="vertical" size="small">
          <Form.Item label="显示工具栏">
            <Switch
              checked={settings.showToolbar}
              onChange={checked => handleSettingChange('showToolbar', checked)}
            />
          </Form.Item>
          <Form.Item label="工具栏模式">
            <Select
              value={settings.toolbarMode}
              onChange={value => handleSettingChange('toolbarMode', value)}
              options={[
                { value: 'fixed', label: '固定工具栏' },
                { value: 'floating', label: '浮动工具栏' }
              ]}
              style={{ width: '100%' }}
              disabled={!settings.showToolbar}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card title="保存设置" className={baseStyles.card}>
        <Form layout="vertical" size="small">
          <Form.Item label="自动保存间隔">
            <Select
              value={settings.autoSaveInterval}
              onChange={value => handleSettingChange('autoSaveInterval', value)}
              options={AUTO_SAVE_OPTIONS}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card title="状态栏设置" className={baseStyles.card}>
        <Form layout="vertical" size="small">
          <Form.Item label="显示项目">
            <div className={baseStyles.checkboxGroup}>
              <Checkbox
                checked={statusBarConfig.showWordCount}
                onChange={e => handleStatusBarConfigChange('showWordCount', e.target.checked)}
              >
                字数统计
              </Checkbox>
              <Checkbox
                checked={statusBarConfig.showCharacterCount}
                onChange={e => handleStatusBarConfigChange('showCharacterCount', e.target.checked)}
              >
                字符数
              </Checkbox>
              <Checkbox
                checked={statusBarConfig.showEncoding}
                onChange={e => handleStatusBarConfigChange('showEncoding', e.target.checked)}
              >
                文件编码
              </Checkbox>
              <Checkbox
                checked={statusBarConfig.showFileType}
                onChange={e => handleStatusBarConfigChange('showFileType', e.target.checked)}
              >
                文件类型
              </Checkbox>
            </div>
          </Form.Item>
        </Form>
      </Card>

      <Card title="编辑设置" className={baseStyles.card}>
        <Form layout="vertical" size="small">
          <Form.Item label={`Tab 宽度: ${settings.tabSize} 个空格`}>
            <Slider
              min={2}
              max={8}
              value={settings.tabSize}
              onChange={value => handleSettingChange('tabSize', value)}
              marks={{ 2: '2', 4: '4', 6: '6', 8: '8' }}
            />
          </Form.Item>
          <Form.Item label="拼写检查">
            <Switch
              checked={settings.spellCheck}
              onChange={checked => handleSettingChange('spellCheck', checked)}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default EditorSettings
