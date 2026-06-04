/**
 * 续写参数配置面板
 */

import { useState } from 'react'
import { Modal, Radio, Input, Button, Space } from 'antd'

export interface ContinueParams {
  length: 'short' | 'medium' | 'long'
  style: 'original' | 'vivid' | 'concise' | 'suspense' | 'warm'
  direction: 'natural' | 'mainPlot' | 'conflict' | 'environment' | 'dialogue'
  customPrompt: string
}

interface ContinueWritingPanelProps {
  open: boolean
  onSubmit: (params: ContinueParams) => void
  onCancel: () => void
}

const LENGTH_OPTIONS = [
  { label: '短（100-200字）', value: 'short' },
  { label: '中（300-500字）', value: 'medium' },
  { label: '长（500-800字）', value: 'long' }
]

const STYLE_OPTIONS = [
  { label: '保持原风格', value: 'original' },
  { label: '更生动', value: 'vivid' },
  { label: '更简洁', value: 'concise' },
  { label: '更悬疑', value: 'suspense' },
  { label: '更温馨', value: 'warm' }
]

const DIRECTION_OPTIONS = [
  { label: '顺其自然', value: 'natural' },
  { label: '推进主线', value: 'mainPlot' },
  { label: '增加冲突', value: 'conflict' },
  { label: '环境描写', value: 'environment' },
  { label: '对话展开', value: 'dialogue' }
]

export function ContinueWritingPanel({ open, onSubmit, onCancel }: ContinueWritingPanelProps) {
  const [length, setLength] = useState<ContinueParams['length']>('medium')
  const [style, setStyle] = useState<ContinueParams['style']>('original')
  const [direction, setDirection] = useState<ContinueParams['direction']>('natural')
  const [customPrompt, setCustomPrompt] = useState('')

  const handleSubmit = () => {
    onSubmit({ length, style, direction, customPrompt })
  }

  const handleClose = () => {
    onCancel()
    // 重置状态
    setLength('medium')
    setStyle('original')
    setDirection('natural')
    setCustomPrompt('')
  }

  return (
    <Modal
      title="续写设置"
      open={open}
      onCancel={handleClose}
      footer={(
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            开始续写
          </Button>
        </Space>
      )}
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>续写长度</div>
          <Radio.Group
            value={length}
            onChange={e => setLength(e.target.value)}
            options={LENGTH_OPTIONS}
            optionType="button"
            buttonStyle="solid"
          />
        </div>

        <div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>续写风格</div>
          <Radio.Group
            value={style}
            onChange={e => setStyle(e.target.value)}
            options={STYLE_OPTIONS}
            optionType="button"
            buttonStyle="solid"
          />
        </div>

        <div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>剧情走向</div>
          <Radio.Group
            value={direction}
            onChange={e => setDirection(e.target.value)}
            options={DIRECTION_OPTIONS}
            optionType="button"
            buttonStyle="solid"
          />
        </div>

        <div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>自定义提示词（可选）</div>
          <Input.TextArea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="输入额外要求，例如：加入一个新角色、描写天气等"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  )
}
