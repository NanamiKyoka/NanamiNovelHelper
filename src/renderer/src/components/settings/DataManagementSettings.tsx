/**
 * 数据管理设置组件
 */

import { useState } from 'react'
import {
  Card,
  Button,
  Divider,
  Modal,
  message,
  Typography,
  Space,
  Alert,
  Popconfirm
} from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons'
import JSON5 from 'json5'
import { useSettingsStore } from '@stores/settingsStore'
import styles from './DataManagementSettings.module.css'

const { Text, Title, Paragraph } = Typography

export function DataManagementSettings(): JSX.Element {
  const { resetGlobalSettings, globalSettings } = useSettingsStore()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  // 导出设置
  const handleExport = async () => {
    setExporting(true)
    try {
      // 创建导出数据
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings: globalSettings
      }
      
      // 创建下载（使用 JSON5 格式）
      const blob = new Blob([JSON5.stringify(exportData, null, 2)], { type: 'application/json5' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nanami-settings-${new Date().toISOString().slice(0, 10)}.json5`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      message.success('设置已导出')
    } catch (error) {
      message.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  // 导入设置
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json5,.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setImporting(true)
      try {
        const text = await file.text()
        const data = JSON5.parse(text)
        
        // 验证数据格式
        if (!data.settings) {
          throw new Error('Invalid settings file')
        }
        
        // 确认导入
        Modal.confirm({
          title: '确认导入设置',
          content: (
            <div>
              <p>即将导入以下设置：</p>
              <ul>
                <li>导出时间: {data.exportedAt ? new Date(data.exportedAt).toLocaleString() : '未知'}</li>
                <li>版本: {data.version || '未知'}</li>
              </ul>
              <p style={{ color: 'var(--color-error)' }}>注意：当前设置将被覆盖！</p>
            </div>
          ),
          onOk: async () => {
            try {
              await window.electron.settings.global.update(data.settings)
              message.success('设置已导入，部分设置需要重启应用生效')
            } catch (error) {
              message.error('导入失败')
            }
          }
        })
      } catch (error) {
        message.error('无效的设置文件')
      } finally {
        setImporting(false)
      }
    }
    
    input.click()
  }

  // 重置全局设置
  const handleReset = async () => {
    try {
      await resetGlobalSettings()
      message.success('设置已重置为默认值')
    } catch (error) {
      message.error('重置失败')
    }
  }

  // 清除缓存
  const handleClearCache = () => {
    Modal.confirm({
      title: '清除缓存',
      content: '确定要清除应用缓存吗？这不会影响您的项目和设置。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 清除 localStorage
          localStorage.clear()
          // 清除 sessionStorage
          sessionStorage.clear()
          message.success('缓存已清除，建议重启应用')
        } catch (error) {
          message.error('清除缓存失败')
        }
      }
    })
  }

  return (
    <div className={styles.container}>
      <Alert
        message="数据管理功能"
        description="您可以在此导出或导入应用设置，方便备份或在不同设备间迁移配置。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 导入导出 */}
      <Card title="设置导入/导出" className={styles.card}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className={styles.actionItem}>
            <div className={styles.actionInfo}>
              <Text strong>导出设置</Text>
              <br />
              <Text type="secondary">将当前应用设置导出为 JSON5 文件</Text>
            </div>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
            >
              导出
            </Button>
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <div className={styles.actionItem}>
            <div className={styles.actionInfo}>
              <Text strong>导入设置</Text>
              <br />
              <Text type="secondary">从 JSON5 文件导入设置（将覆盖当前设置）</Text>
            </div>
            <Button
              icon={<UploadOutlined />}
              onClick={handleImport}
              loading={importing}
            >
              导入
            </Button>
          </div>
        </Space>
      </Card>

      {/* 重置 */}
      <Card title="重置" className={styles.card}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className={styles.actionItem}>
            <div className={styles.actionInfo}>
              <Text strong>重置所有设置</Text>
              <br />
              <Text type="secondary">将所有设置恢复为默认值</Text>
            </div>
            <Popconfirm
              title="确定要重置所有设置吗？"
              description="此操作不可撤销。"
              onConfirm={handleReset}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<ReloadOutlined />}>
                重置
              </Button>
            </Popconfirm>
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <div className={styles.actionItem}>
            <div className={styles.actionInfo}>
              <Text strong>清除缓存</Text>
              <br />
              <Text type="secondary">清除应用缓存数据，不影响项目和设置</Text>
            </div>
            <Button
              icon={<DeleteOutlined />}
              onClick={handleClearCache}
            >
              清除
            </Button>
          </div>
        </Space>
      </Card>

      {/* 存储位置 */}
      <Card title="数据存储位置" className={styles.card}>
        <div className={styles.storageInfo}>
          <div className={styles.storageItem}>
            <Text type="secondary">全局设置：</Text>
            <Text code>用户目录/AppData/Roaming/nanami-novel-helper</Text>
          </div>
          <div className={styles.storageItem}>
            <Text type="secondary">项目设置：</Text>
            <Text code>项目目录/.novelhelper/settings.json5</Text>
          </div>
          <div className={styles.storageItem}>
            <Text type="secondary">备份文件：</Text>
            <Text code>项目目录/.novelhelper/backups/</Text>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default DataManagementSettings
