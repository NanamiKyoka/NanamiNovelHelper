/**
 * 多版本续写结果展示面板
 */

import { Modal, Tabs, Button, Space, Spin } from 'antd'
import { useState } from 'react'

interface MultiVersionPanelProps {
  open: boolean
  versions: string[]
  isLoading: boolean
  onSelect: (index: number) => void
  onRegenerate: () => void
  onCancel: () => void
}

export function MultiVersionPanel({
  open,
  versions,
  isLoading,
  onSelect,
  onRegenerate,
  onCancel
}: MultiVersionPanelProps) {
  const [activeKey, setActiveKey] = useState('0')

  const items = [
    { key: '0', label: '版本 1' },
    { key: '1', label: '版本 2' },
    { key: '2', label: '版本 3' }
  ].map((item, index) => ({
    key: item.key,
    label: item.label,
    children: (
      <div
        style={{
          maxHeight: 360,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          padding: 12,
          background: 'var(--ant-color-bg-layout)',
          borderRadius: 6,
          fontSize: 14,
          lineHeight: 1.8,
          minHeight: 200
        }}
      >
        {isLoading && index >= versions.length ? (
          <Spin tip="生成中...">
            <div style={{ minHeight: 200 }} />
          </Spin>
        ) : (
          versions[index] || '暂无内容'
        )}
      </div>
    )
  }))

  const handleApply = () => {
    onSelect(parseInt(activeKey, 10))
  }

  return (
    <Modal
      title="多版本续写"
      open={open}
      onCancel={onCancel}
      width={800}
      footer={(
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button onClick={onRegenerate} loading={isLoading}>
            重新生成
          </Button>
          <Button type="primary" onClick={handleApply} disabled={isLoading || versions.length === 0}>
            应用选中版本
          </Button>
        </Space>
      )}
    >
      <Tabs activeKey={activeKey} onChange={setActiveKey} items={items} />
    </Modal>
  )
}
