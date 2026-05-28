import { useState } from 'react'
import { Modal, Typography, Space, Divider, Button, App, Tag } from 'antd'
import {
  GithubOutlined,
  HeartFilled,
  CloudSyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import { useUIStore } from '@stores/uiStore'

const { Title, Text, Paragraph } = Typography

const APP_NAME = 'Nanami Novel Helper'
const APP_DESCRIPTION = '面向小说创作者的专业写作辅助工具'
const GITHUB_URL = 'https://github.com/NanamiKyoka/NanamiNovelHelper'

type CheckStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'error'

export function AboutModal(): JSX.Element {
  const aboutModalOpen = useUIStore(state => state.aboutModalOpen)
  const closeAboutModal = useUIStore(state => state.closeAboutModal)
  const { message } = App.useApp()
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [newVersion, setNewVersion] = useState('')

  const handleOpenGithub = () => {
    window.api?.shell?.openExternal?.(GITHUB_URL)
  }

  const handleCheckUpdate = async () => {
    setCheckStatus('checking')
    try {
      const update = await window.api?.updater?.check()
      if (update) {
        setNewVersion(update.version)
        setCheckStatus('available')
      } else {
        setCheckStatus('up-to-date')
        message.success('当前已是最新版本')
      }
    } catch (_e) {
      setCheckStatus('error')
      message.error('检查更新失败')
    }
  }

  const renderUpdateStatus = () => {
    switch (checkStatus) {
      case 'checking':
        return <Tag icon={<LoadingOutlined spin />} color="processing">检查中</Tag>
      case 'available':
        return <Tag icon={<ExclamationCircleOutlined />} color="warning">新版本 {newVersion}</Tag>
      case 'up-to-date':
        return <Tag icon={<CheckCircleOutlined />} color="success">已是最新</Tag>
      case 'error':
        return <Tag icon={<ExclamationCircleOutlined />} color="error">检查失败</Tag>
      default:
        return null
    }
  }

  return (
    <Modal
      open={aboutModalOpen}
      onCancel={closeAboutModal}
      footer={null}
      width={400}
      centered
      title={null}
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          {APP_NAME}
        </Title>
        <Space>
          <Text type="secondary">版本 {__APP_VERSION__}</Text>
          {renderUpdateStatus()}
        </Space>

        <Divider />

        <Paragraph style={{ marginBottom: 16 }}>{APP_DESCRIPTION}</Paragraph>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">
            提供词汇管理、关系图、时间线、组织架构等功能，帮助小说创作者更好地管理作品设定。
          </Text>
        </Space>

        <Divider />

        <Space direction="vertical" size="middle">
          <Button
            type="link"
            icon={<CloudSyncOutlined />}
            onClick={handleCheckUpdate}
            loading={checkStatus === 'checking'}
            disabled={checkStatus === 'checking'}
          >
            {checkStatus === 'checking' ? '检查中...' : '检查更新'}
          </Button>

          <Button type="link" icon={<GithubOutlined />} onClick={handleOpenGithub}>
            访问 GitHub 仓库
          </Button>

          <Text type="secondary" style={{ fontSize: 12 }}>
            使用 <HeartFilled style={{ color: 'var(--color-error)' }} /> 开发
          </Text>

          <Text type="secondary" style={{ fontSize: 11 }}>
            许可证: MPL-2.0
          </Text>
        </Space>
      </div>
    </Modal>
  )
}

export default AboutModal
