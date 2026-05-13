/**
 * Git 面板主组件
 */

import { useEffect, useState } from 'react'
import { Button, Input, Tabs, Modal, App, Empty, Spin, Typography, Form, Radio } from 'antd'
import {
  BranchesOutlined,
  PlusOutlined,
  SyncOutlined,
  SettingOutlined,
  CheckOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useGitStore } from '@stores/gitStore'
import { useProjectStore } from '@stores/projectStore'
import ChangesList from './ChangesList'
import CommitHistory from './CommitHistory'
import BranchManager from './BranchManager'
import styles from './GitPanel.module.css'

const { TextArea } = Input
const { Text } = Typography

interface AuthorIdentityForm {
  name: string
  email: string
  scope: 'global' | 'local'
}

function GitPanel(): JSX.Element {
  const { message } = App.useApp()
  const {
    initialized,
    isRepo,
    loading,
    error,
    repository,
    viewMode,
    setViewMode,
    init,
    refresh,
    commit
  } = useGitStore()

  const { currentProject, currentProjectPath } = useProjectStore()
  const [commitMessage, setCommitMessage] = useState('')
  const [committing, setCommitting] = useState(false)
  const [showInitModal, setShowInitModal] = useState(false)
  const [initing, setIniting] = useState(false)
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [identityForm] = Form.useForm<AuthorIdentityForm>()
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [identityFromCommit, setIdentityFromCommit] = useState(false)

  // 兜底初始化：项目打开时 git 可能尚未初始化完成
  useEffect(() => {
    if (currentProjectPath && !initialized && !loading) {
      init()
    }
  }, [currentProjectPath, initialized, loading, init])

  // 初始化仓库
  const handleInitRepo = async () => {
    if (!currentProjectPath) return

    setIniting(true)
    try {
      const result = await window.api.git.init({
        path: currentProjectPath,
        defaultBranch: 'main',
        initialCommit: '初始化项目'
      })
      if (result.success) {
        message.success('Git 仓库初始化成功')
        setShowInitModal(false)
        init()
      } else {
        message.error(result.error || '初始化失败')
      }
    } catch (err) {
      message.error(String(err))
    } finally {
      setIniting(false)
    }
  }

  const doCommit = async (msg: string) => {
    setCommitting(true)
    try {
      const success = await commit({ message: msg })
      if (success) {
        message.success('提交成功')
        setCommitMessage('')
      }
    } finally {
      setCommitting(false)
    }
  }

  const handleSaveIdentity = async () => {
    try {
      const values = await identityForm.validateFields()
      if (!currentProjectPath) return

      setSavingIdentity(true)
      const scope = values.scope

      await window.api.git.configSet(currentProjectPath, 'user.name', values.name, scope)
      await window.api.git.configSet(currentProjectPath, 'user.email', values.email, scope)

      message.success('身份信息配置成功')
      setShowIdentityModal(false)

      if (identityFromCommit) {
        await doCommit(commitMessage.trim())
      }
    } catch (err) {
      if (err instanceof Error) {
        message.error(`配置失败: ${err.message}`)
      }
    } finally {
      setSavingIdentity(false)
      setIdentityFromCommit(false)
    }
  }

  // 提交
  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      message.warning('请输入提交消息')
      return
    }

    if (!repository?.hasStagedChanges) {
      message.warning('没有已暂存的更改，请先暂存要提交的文件')
      return
    }

    if (!currentProjectPath) return

    try {
      const result = await window.api.git.checkAuthorIdentity(currentProjectPath)
      if (result.success && result.data && !result.data.hasIdentity) {
        identityForm.setFieldsValue({
          name: result.data.userName || '',
          email: result.data.userEmail || '',
          scope: 'global'
        })
        setIdentityFromCommit(true)
        setShowIdentityModal(true)
        return
      }
    } catch {
      // 检查失败时继续提交，让 git commit 自身报错
    }

    await doCommit(commitMessage.trim())
  }

  // 刷新
  const handleOpenIdentityModal = async () => {
    if (!currentProjectPath) return

    try {
      const result = await window.api.git.checkAuthorIdentity(currentProjectPath)
      if (result.success && result.data) {
        identityForm.setFieldsValue({
          name: result.data.userName || '',
          email: result.data.userEmail || '',
          scope: 'global'
        })
      } else {
        identityForm.setFieldsValue({ name: '', email: '', scope: 'global' })
      }
    } catch {
      identityForm.setFieldsValue({ name: '', email: '', scope: 'global' })
    }

    setShowIdentityModal(true)
  }

  const handleRefresh = () => {
    refresh()
  }

  // 加载中
  if (loading && !initialized) {
    return (
      <div className={styles.loading}>
        <Spin tip="加载中..." />
      </div>
    )
  }

  // 没有打开项目
  if (!currentProject) {
    return (
      <div className={styles.empty}>
        <Empty description="请先打开项目" />
      </div>
    )
  }

  // 不是 Git 仓库
  if (!isRepo) {
    return (
      <div className={styles.empty}>
        <Empty description="当前项目不是 Git 仓库" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowInitModal(true)}>
            初始化仓库
          </Button>
        </Empty>

        <Modal
          title="初始化 Git 仓库"
          open={showInitModal}
          onOk={handleInitRepo}
          onCancel={() => setShowInitModal(false)}
          confirmLoading={initing}
          okText="初始化"
          cancelText="取消"
        >
          <p>将在项目目录下初始化 Git 仓库：</p>
          <Text code>{currentProjectPath}</Text>
          <p style={{ marginTop: 16 }}>这将创建一个初始提交。</p>
        </Modal>
      </div>
    )
  }

  // 计算变更数量
  const changesCount = repository?.changes?.length || 0
  const stagedCount = repository?.stagedChanges?.length || 0
  const totalChanges = changesCount + stagedCount

  return (
    <div className={styles.panel}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.branchInfo}>
          <BranchesOutlined />
          <Text className={styles.branchName}>{repository?.branch || 'HEAD'}</Text>
        </div>
        <div className={styles.actions}>
          <Button
            size="small"
            icon={<SyncOutlined spin={loading} />}
            onClick={handleRefresh}
            loading={loading}
            title="刷新"
          />
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={handleOpenIdentityModal}
            title="Git 设置"
          />
        </div>
      </div>

      {/* 错误提示条 */}
      {error && (
        <div className={styles.errorBar}>
          <Text type="danger" style={{ flex: 1, fontSize: 12 }}>{error}</Text>
          <Button size="small" type="link" onClick={() => useGitStore.getState().setError(null)}>
            关闭
          </Button>
        </div>
      )}

      {/* 提交区域 */}
      {viewMode === 'changes' && (
        <div className={styles.commitArea}>
          <TextArea
            placeholder="提交消息..."
            value={commitMessage}
            onChange={e => setCommitMessage(e.target.value)}
            rows={3}
            className={styles.commitInput}
          />
          <div className={styles.commitActions}>
            <Text type="secondary">
              {stagedCount > 0 ? `${stagedCount} 个文件已暂存` : '没有文件暂存'}
            </Text>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleCommit}
              loading={committing}
              disabled={stagedCount === 0 || !commitMessage.trim()}
            >
              提交
            </Button>
          </div>
        </div>
      )}

      {/* 标签页切换 */}
      <Tabs
        activeKey={viewMode}
        onChange={key => setViewMode(key as typeof viewMode)}
        className={styles.tabs}
        items={[
          {
            key: 'changes',
            label: (
              <span>
                变更
                {totalChanges > 0 && <span className={styles.badge}>{totalChanges}</span>}
              </span>
            ),
            children: <ChangesList />
          },
          {
            key: 'history',
            label: '历史',
            children: <CommitHistory />
          },
          {
            key: 'branches',
            label: '分支',
            children: <BranchManager />
          }
        ]}
      />

      <Modal
        title={
          <span>
            <UserOutlined style={{ marginRight: 8 }} />
            配置 Git 身份信息
          </span>
        }
        open={showIdentityModal}
        onOk={handleSaveIdentity}
        onCancel={() => setShowIdentityModal(false)}
        confirmLoading={savingIdentity}
        okText={identityFromCommit ? '保存并提交' : '保存'}
        cancelText="取消"
      >
        <p style={{ marginBottom: 16, color: 'var(--ant-color-text-secondary)' }}>
          {identityFromCommit
            ? '提交需要配置 Git 用户名和邮箱，请填写以下信息：'
            : '配置当前仓库的 Git 用户名和邮箱信息：'}
        </p>
        <Form form={identityForm} layout="vertical" autoComplete="off">
          <Form.Item
            name="name"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入 Git 用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入 Git 邮箱" />
          </Form.Item>
          <Form.Item name="scope" label="配置范围">
            <Radio.Group>
              <Radio value="global">全局配置（所有仓库生效）</Radio>
              <Radio value="local">仅当前仓库</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GitPanel
