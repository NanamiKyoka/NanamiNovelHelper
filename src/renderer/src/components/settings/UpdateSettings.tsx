import { useState } from 'react'
import { Button, Space, Typography, App, Progress, Card, Tag } from 'antd'
import {
  CloudSyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import type { Update, DownloadEvent } from '@tauri-apps/plugin-updater'
import baseStyles from './SettingsBase.module.css'

const { Text, Paragraph } = Typography

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'up-to-date'

export function UpdateSettings(): JSX.Element {
  const { message, modal } = App.useApp()
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [update, setUpdate] = useState<Update | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [contentLength, setContentLength] = useState<number | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState('')

  const handleCheck = async () => {
    setStatus('checking')
    setErrorMessage('')
    setUpdate(null)
    setDownloadProgress(0)
    setContentLength(undefined)

    try {
      const result = await window.api.updater.check()
      if (result) {
        setUpdate(result)
        setStatus('available')
      } else {
        setStatus('up-to-date')
        message.success('当前已是最新版本')
      }
    } catch (e) {
      setStatus('error')
      setErrorMessage(e instanceof Error ? e.message : String(e))
      message.error('检查更新失败')
    }
  }

  const handleDownloadAndInstall = () => {
    if (!update) return

    modal.confirm({
      title: '更新确认',
      content: `即将下载并安装版本 ${update.version}，安装完成后应用将自动重启。确定继续吗？`,
      okText: '确定更新',
      cancelText: '取消',
      onOk: async () => {
        setStatus('downloading')
        setDownloadProgress(0)
        setContentLength(undefined)

        try {
          await window.api.updater.downloadAndInstall(update, (event: DownloadEvent) => {
            if (event.event === 'Started' && event.data.contentLength) {
              setContentLength(event.data.contentLength)
            } else if (event.event === 'Progress') {
              setDownloadProgress(prev => prev + event.data.chunkLength)
            } else if (event.event === 'Finished') {
              setStatus('downloaded')
              message.success('更新下载完成，即将重启应用...')
            }
          })
        } catch (e) {
          setStatus('error')
          setErrorMessage(e instanceof Error ? e.message : String(e))
          message.error('下载更新失败')
        }
      }
    })
  }

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const progressPercent = contentLength
    ? Math.min(Math.round((downloadProgress / contentLength) * 100), 100)
    : undefined

  const renderStatusTag = () => {
    switch (status) {
      case 'checking':
        return <Tag icon={<LoadingOutlined spin />} color="processing">检查中</Tag>
      case 'available':
        return <Tag icon={<ExclamationCircleOutlined />} color="warning">有新版本</Tag>
      case 'downloading':
        return <Tag icon={<DownloadOutlined />} color="processing">下载中</Tag>
      case 'downloaded':
        return <Tag icon={<CheckCircleOutlined />} color="success">下载完成</Tag>
      case 'up-to-date':
        return <Tag icon={<CheckCircleOutlined />} color="success">已是最新</Tag>
      case 'error':
        return <Tag icon={<ExclamationCircleOutlined />} color="error">检查失败</Tag>
      default:
        return null
    }
  }

  return (
    <div className={baseStyles.container}>
      <Card title="检查更新" className={baseStyles.card}>
        <p className={baseStyles.hint}>
          检查 GitHub 上是否有新版本可用。更新将自动下载并安装，安装完成后应用将重启。
        </p>

        <div className={baseStyles.actionItem}>
          <div className={baseStyles.actionInfo}>
            <Space>
              <Text strong>当前版本</Text>
              <Text type="secondary">{__APP_VERSION__}</Text>
              {renderStatusTag()}
            </Space>
          </div>
          <Button
            type="primary"
            icon={<CloudSyncOutlined />}
            onClick={handleCheck}
            loading={status === 'checking'}
            disabled={status === 'downloading' || status === 'downloaded'}
          >
            {status === 'checking' ? '检查中...' : '检查更新'}
          </Button>
        </div>

        {status === 'available' && update && (
          <div style={{ marginTop: 16, padding: '16px', background: 'var(--ant-color-info-bg)', borderRadius: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Text strong>新版本可用：</Text>
                <Text type="success" strong>{update.version}</Text>
              </Space>
              {update.date && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  发布日期：{new Date(update.date).toLocaleDateString('zh-CN')}
                </Text>
              )}
              {update.body && (
                <Paragraph
                  style={{ fontSize: 13, marginBottom: 12, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}
                >
                  {update.body}
                </Paragraph>
              )}
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadAndInstall}
              >
                下载并安装
              </Button>
            </Space>
          </div>
        )}

        {status === 'downloading' && (
          <div style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                正在下载更新... {formatBytes(downloadProgress)}
                {contentLength ? ` / ${formatBytes(contentLength)}` : ''}
              </Text>
              <Progress
                percent={progressPercent ?? 0}
                status={progressPercent !== undefined ? 'active' : 'active'}
                strokeColor={{ from: '#108ee9', to: '#87d068' }}
              />
            </Space>
          </div>
        )}

        {status === 'downloaded' && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--ant-color-success-bg)', borderRadius: 8 }}>
            <Space>
              <CheckCircleOutlined style={{ color: 'var(--ant-color-success)' }} />
              <Text>更新下载完成，应用将自动重启以完成安装。</Text>
            </Space>
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--ant-color-error-bg)', borderRadius: 8 }}>
            <Space>
              <ExclamationCircleOutlined style={{ color: 'var(--ant-color-error)' }} />
              <Text type="danger">{errorMessage}</Text>
            </Space>
          </div>
        )}
      </Card>
    </div>
  )
}

export default UpdateSettings
