import React, { useState } from 'react'
import { Spin, Tag, Button } from 'antd'
import {
  FileTextOutlined,
  EditOutlined,
  SearchOutlined,
  FolderOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons'
import type { ToolCallRecord } from '@shared/ai-assistant'
import styles from './AiAssistantPanel.module.css'

const toolIcons: Record<string, React.ReactNode> = {
  read_file: <FileTextOutlined />,
  edit: <EditOutlined />,
  write: <FileTextOutlined />,
  list_files: <FolderOutlined />,
  search_files: <SearchOutlined />
}

const toolLabels: Record<string, string> = {
  read_file: '读取文件',
  edit: '编辑文本',
  write: '写入文件',
  list_files: '列出文件',
  search_files: '搜索文件'
}

interface ToolCallCardProps {
  toolCall: ToolCallRecord
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    pending: { color: 'processing' as const, icon: <Spin size="small" />, text: '执行中...' },
    running: { color: 'processing' as const, icon: <Spin size="small" />, text: '执行中...' },
    success: { color: 'success' as const, icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, text: '成功' },
    failed: { color: 'error' as const, icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />, text: '失败' }
  }

  const config = statusConfig[toolCall.status]
  const icon = toolIcons[toolCall.toolName] || <FileTextOutlined />
  const label = toolLabels[toolCall.toolName] || toolCall.toolName

  const getParamSummary = () => {
    const params = toolCall.parameters
    if (toolCall.toolName === 'read_file' && params.path) {
      return `路径: ${params.path}`
    }
    if (toolCall.toolName === 'edit' && params.old_string) {
      const oldStr = String(params.old_string).slice(0, 30)
      return `替换: "${oldStr}${String(params.old_string).length > 30 ? '...' : ''}"`
    }
    if (toolCall.toolName === 'search_files' && params.keyword) {
      return `关键词: "${params.keyword}"`
    }
    if (toolCall.toolName === 'write' && params.path) {
      return `路径: ${params.path}`
    }
    return ''
  }

  return (
    <div className={styles.toolCallCard}>
      <div className={styles.toolCallHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.toolCallTitle}>
          {icon}
          <span className={styles.toolCallName}>{label}</span>
          {getParamSummary() && (
            <span className={styles.toolCallSummary}>{getParamSummary()}</span>
          )}
        </div>
        <div className={styles.toolCallStatus}>
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
          <Button type="text" size="small" icon={expanded ? <DownOutlined /> : <RightOutlined />} />
        </div>
      </div>
      {expanded && (
        <div className={styles.toolCallDetail}>
          <div className={styles.toolCallSection}>
            <div className={styles.toolCallSectionTitle}>参数</div>
            <pre className={styles.toolCallCode}>
              {JSON.stringify(toolCall.parameters, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div className={styles.toolCallSection}>
              <div className={styles.toolCallSectionTitle}>结果</div>
              <pre className={styles.toolCallCode}>
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.error && (
            <div className={styles.toolCallSection}>
              <div className={styles.toolCallSectionTitle} style={{ color: '#ff4d4f' }}>错误</div>
              <pre className={styles.toolCallCode} style={{ color: '#ff4d4f' }}>
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
