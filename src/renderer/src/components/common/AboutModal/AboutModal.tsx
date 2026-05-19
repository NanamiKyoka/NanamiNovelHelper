import { Modal, Typography, Space, Divider, Button } from 'antd'
import { GithubOutlined, HeartFilled } from '@ant-design/icons'
import { useUIStore } from '@stores/uiStore'

const { Title, Text, Paragraph } = Typography

const APP_VERSION = '0.1.3'
const APP_NAME = 'Nanami Novel Helper'
const APP_DESCRIPTION = '面向小说创作者的专业写作辅助工具'
const GITHUB_URL = 'https://github.com/NanamiKyoka/NanamiNovelHelper'

export function AboutModal(): JSX.Element {
  const aboutModalOpen = useUIStore(state => state.aboutModalOpen)
  const closeAboutModal = useUIStore(state => state.closeAboutModal)

  const handleOpenGithub = () => {
    window.api?.shell?.openExternal?.(GITHUB_URL)
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
        <Text type="secondary">版本 {APP_VERSION}</Text>

        <Divider />

        <Paragraph style={{ marginBottom: 16 }}>{APP_DESCRIPTION}</Paragraph>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">
            提供词汇管理、关系图、时间线、组织架构等功能，帮助小说创作者更好地管理作品设定。
          </Text>
        </Space>

        <Divider />

        <Space direction="vertical" size="middle">
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
