import React from 'react'
import { Modal, Radio } from 'antd'

interface VocabularyExportModalProps {
  open: boolean
  exportFormat: 'json' | 'csv' | 'markdown'
  exportScope: 'all' | 'selected'
  selectedCount: number
  totalCount: number
  onFormatChange: (format: 'json' | 'csv' | 'markdown') => void
  onCancel: () => void
  onOk: () => void
}

const VocabularyExportModal: React.FC<VocabularyExportModalProps> = ({
  open,
  exportFormat,
  exportScope,
  selectedCount,
  totalCount,
  onFormatChange,
  onCancel,
  onOk
}) => {
  return (
    <Modal
      title="选择导出格式"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="导出"
      cancelText="取消"
    >
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>导出范围：</span>
        <strong>{exportScope === 'selected' ? `选中的 ${selectedCount} 条` : `全部 ${totalCount} 条`}</strong>
      </div>
      <Radio.Group value={exportFormat} onChange={e => onFormatChange(e.target.value)}>
        <Radio.Button value="json">JSON</Radio.Button>
        <Radio.Button value="csv">CSV</Radio.Button>
        <Radio.Button value="markdown">Markdown</Radio.Button>
      </Radio.Group>
      <div style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 12 }}>
        <div>• JSON：适合数据交换和程序处理</div>
        <div>• CSV：适合在 Excel 中查看和编辑</div>
        <div>• Markdown：适合阅读和文档记录</div>
      </div>
    </Modal>
  )
}

export default VocabularyExportModal
