/**
 * 备份与恢复设置组件
 */

import { useState, useEffect } from 'react'
import {
  Form,
  Switch,
  InputNumber,
  Button,
  Table,
  Space,
  message,
  Popconfirm,
  Empty,
  Typography,
  Tooltip,
  Card
} from 'antd'
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import { useProjectStore } from '@stores/projectStore'
import type { BackupInfo } from '@shared/settings'
import dayjs from 'dayjs'
import baseStyles from './SettingsBase.module.css'

const { Text } = Typography

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function BackupSettings(): JSX.Element {
  const currentProject = useProjectStore(state => state.currentProject)
  const projectSettings = useSettingsStore(state => state.projectSettings)
  const updateBackupSettings = useSettingsStore(state => state.updateBackupSettings)
  const { createBackup, listBackups, restoreBackup, deleteBackup, exportBackup, importBackup } =
    useSettingsStore()

  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (currentProject) {
      loadBackups()
    }
  }, [currentProject])

  const loadBackups = async () => {
    setLoading(true)
    try {
      const list = await listBackups()
      setBackups(list)
    } catch (error) {
      console.error('Failed to load backups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const result = await createBackup()
      if (result) {
        message.success('备份创建成功')
        loadBackups()
      } else {
        message.error('备份创建失败')
      }
    } catch (error) {
      message.error('备份创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (filename: string) => {
    try {
      const result = await restoreBackup(filename)
      if (result) {
        message.success('备份恢复成功，部分设置需要重启应用生效')
      } else {
        message.error('备份恢复失败')
      }
    } catch (error) {
      message.error('备份恢复失败')
    }
  }

  const handleDelete = async (filename: string) => {
    try {
      const result = await deleteBackup(filename)
      if (result) {
        message.success('备份已删除')
        loadBackups()
      } else {
        message.error('删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleExport = async (filename: string) => {
    try {
      const result = await exportBackup(filename)
      if (result) {
        message.success(`备份已导出到: ${result}`)
      } else {
        message.error('导出失败')
      }
    } catch (error) {
      message.error('导出失败')
    }
  }

  const handleImport = async () => {
    try {
      const result = await importBackup()
      if (result) {
        message.success('备份导入成功')
        loadBackups()
      }
    } catch (error) {
      message.error('导入失败')
    }
  }

  const handleSettingChange = async (key: string, value: boolean | number) => {
    try {
      await updateBackupSettings({ [key]: value })
      message.success('设置已保存')
    } catch (error) {
      message.error('保存失败')
    }
  }

  const columns = [
    {
      title: '备份时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatSize(size)
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: BackupInfo) => (
        <Space size="small">
          <Popconfirm
            title="确定恢复此备份？当前未保存的更改将丢失。"
            onConfirm={() => handleRestore(record.filename)}
            okText="恢复"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<CloudDownloadOutlined />}>
              恢复
            </Button>
          </Popconfirm>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleExport(record.filename)}
          >
            导出
          </Button>
          <Popconfirm
            title="确定删除此备份？"
            onConfirm={() => handleDelete(record.filename)}
            okText="删除"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  if (!currentProject) {
    return (
      <div className={baseStyles.container}>
        <div className={baseStyles.tip}>
          <InfoCircleOutlined className={baseStyles.tipIcon} />
          <span>请先打开项目以管理备份</span>
        </div>
      </div>
    )
  }

  return (
    <div className={baseStyles.container}>
      <Card title="自动备份" className={baseStyles.card}>
        <p className={baseStyles.hint}>配置自动备份策略，保护您的项目数据安全。</p>

        <Form layout="vertical" size="small">
          <Form.Item
            label={
              <Space>
                启用自动备份
                <Tooltip title="开启后，应用会自动创建项目备份">
                  <InfoCircleOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />
                </Tooltip>
              </Space>
            }
          >
            <Switch
              checked={projectSettings?.backup?.enabled ?? true}
              onChange={checked => handleSettingChange('enabled', checked)}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                最大备份数量
                <Tooltip title="超过此数量的旧备份将被自动删除">
                  <InfoCircleOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />
                </Tooltip>
              </Space>
            }
          >
            <InputNumber
              min={1}
              max={50}
              value={projectSettings?.backup?.maxCount ?? 10}
              onChange={value => handleSettingChange('maxCount', value ?? 10)}
              style={{ width: 120 }}
              disabled={!projectSettings?.backup?.enabled}
            />
            <Text type="secondary" style={{ marginLeft: 8 }}>
              个
            </Text>
          </Form.Item>
        </Form>
      </Card>

      <Card title="手动备份" className={baseStyles.card}>
        <p className={baseStyles.hint}>手动创建或导入备份文件。</p>

        <Space wrap>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleCreateBackup}
            loading={creating}
          >
            创建备份
          </Button>
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            导入备份
          </Button>
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <span>备份列表</span>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={loadBackups}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
        className={baseStyles.card}
      >
        <p className={baseStyles.hint}>查看和管理所有备份文件。</p>

        {backups.length === 0 ? (
          <Empty description="暂无备份" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            dataSource={backups}
            columns={columns}
            rowKey="filename"
            size="small"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        )}
      </Card>
    </div>
  )
}

export default BackupSettings
