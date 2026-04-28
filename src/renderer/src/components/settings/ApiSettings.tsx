/**
 * AI/API 设置组件
 */

import { useState, useEffect } from 'react'
import { Form, Input, Button, message, Card, Typography, Alert, Popconfirm } from 'antd'
import { SaveOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import baseStyles from './SettingsBase.module.css'
import styles from './ApiSettings.module.css'

const { Text } = Typography

interface ApiConfig {
  id: string
  name: string
  key: string
  baseUrl?: string
  enabled: boolean
}

const PRESET_APIS: { id: string; name: string; description: string; hasBaseUrl: boolean }[] = [
  { id: 'openai', name: 'OpenAI API Key', description: '用于 GPT 系列模型调用', hasBaseUrl: true },
  {
    id: 'anthropic',
    name: 'Anthropic API Key',
    description: '用于 Claude 系列模型调用',
    hasBaseUrl: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API Key',
    description: '用于 DeepSeek 模型调用',
    hasBaseUrl: true
  },
  { id: 'moonshot', name: 'Moonshot API Key', description: '用于 Kimi 模型调用', hasBaseUrl: true },
  { id: 'zhipu', name: '智谱 API Key', description: '用于 GLM 系列模型调用', hasBaseUrl: true }
]

export function ApiSettings(): JSX.Element {
  const { getApiKey, setApiKey, deleteApiKey } = useSettingsStore()
  const [configs, setConfigs] = useState<ApiConfig[]>([])
  const [, setLoading] = useState<Record<string, boolean>>({})
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [form] = Form.useForm()

  useEffect(() => {
    const loadConfigs = async () => {
      const loadedConfigs: ApiConfig[] = []

      for (const preset of PRESET_APIS) {
        const key = await getApiKey(preset.id)
        if (key) {
          loadedConfigs.push({
            id: preset.id,
            name: preset.name,
            key: key,
            enabled: true
          })
        }
      }

      setConfigs(loadedConfigs)
    }

    loadConfigs()
  }, [getApiKey])

  const handleSave = async (id: string, values: { key: string; baseUrl?: string }) => {
    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      await setApiKey(id, values.key)
      if (values.baseUrl) {
        await setApiKey(`${id}_baseUrl`, values.baseUrl)
      }

      setConfigs(prev => {
        const exists = prev.find(c => c.id === id)
        if (exists) {
          return prev.map(c =>
            c.id === id ? { ...c, key: values.key, baseUrl: values.baseUrl } : c
          )
        }
        const preset = PRESET_APIS.find(p => p.id === id)
        return [
          ...prev,
          {
            id,
            name: preset?.name || id,
            key: values.key,
            baseUrl: values.baseUrl,
            enabled: true
          }
        ]
      })

      message.success('保存成功')
    } catch (_error) {
      message.error('保存失败')
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(id)
      await deleteApiKey(`${id}_baseUrl`)
      setConfigs(prev => prev.filter(c => c.id !== id))
      message.success('已删除')
    } catch (_error) {
      message.error('删除失败')
    }
  }

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key
    return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`
  }

  return (
    <div className={baseStyles.container}>
      <Alert
        message="AI 功能即将推出"
        description="API 密钥功能已预留接口，相关 AI 辅助功能正在开发中。您的密钥将被安全存储在本地。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card title="API 密钥管理" className={baseStyles.card}>
        <p className={baseStyles.hint}>配置 AI 服务的 API 密钥，密钥将被安全存储在本地配置中。</p>

        {configs.length === 0 ? (
          <Text type="secondary">暂无已配置的 API 密钥</Text>
        ) : (
          configs.map(config => (
            <div key={config.id} className={styles.apiItem}>
              <div className={styles.apiItemHeader}>
                <div>
                  <Text strong>{config.name}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {PRESET_APIS.find(p => p.id === config.id)?.description}
                  </Text>
                </div>
                <Popconfirm
                  title="确定删除此 API 密钥？"
                  onConfirm={() => handleDelete(config.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
              <div className={styles.keyDisplay}>
                <Text code className={styles.keyText}>
                  {visibleKeys[config.id] ? config.key : maskKey(config.key)}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={visibleKeys[config.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => toggleKeyVisibility(config.id)}
                />
              </div>
            </div>
          ))
        )}
      </Card>

      <Card title="添加 API 密钥" className={baseStyles.card}>
        <p className={baseStyles.hint}>选择要添加的 API 服务并输入密钥。</p>

        <Form
          form={form}
          layout="vertical"
          onFinish={values => {
            for (const preset of PRESET_APIS) {
              const keyField = `${preset.id}_key`
              const baseUrlField = `${preset.id}_baseUrl`
              if (values[keyField]) {
                handleSave(preset.id, {
                  key: values[keyField],
                  baseUrl: values[baseUrlField]
                })
                form.resetFields([keyField, baseUrlField])
                break
              }
            }
          }}
        >
          {PRESET_APIS.filter(preset => !configs.find(c => c.id === preset.id)).map(preset => (
            <div key={preset.id} className={styles.formItem}>
              <Form.Item
                name={`${preset.id}_key`}
                label={preset.name}
                rules={[{ required: false }]}
              >
                <Input.Password placeholder={`输入 ${preset.name}`} visibilityToggle />
              </Form.Item>
              {preset.hasBaseUrl && (
                <Form.Item name={`${preset.id}_baseUrl`} label="自定义 Base URL（可选）">
                  <Input placeholder="https://api.openai.com/v1" />
                </Form.Item>
              )}
            </div>
          ))}

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="安全提示" className={baseStyles.card}>
        <ul className={styles.securityTips}>
          <li>API 密钥存储在本地配置文件中，不会上传到云端</li>
          <li>请勿与他人分享您的 API 密钥</li>
          <li>定期更换 API 密钥以提高安全性</li>
          <li>如果密钥泄露，请立即在服务商处重新生成</li>
        </ul>
      </Card>
    </div>
  )
}

export default ApiSettings
