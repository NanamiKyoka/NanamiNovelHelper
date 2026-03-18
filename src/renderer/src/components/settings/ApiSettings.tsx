/**
 * AI/API 设置组件
 */

import { useState, useEffect } from 'react'
import { Form, Input, Button, Switch, Divider, message, Card, Typography, Alert, Space, Popconfirm } from 'antd'
import { SaveOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined, PlusOutlined } from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import styles from './ApiSettings.module.css'

const { Text, Title } = Typography

// API 配置类型
interface ApiConfig {
  id: string
  name: string
  key: string
  baseUrl?: string
  enabled: boolean
}

// 预设的 API 配置项
const PRESET_APIS: { id: string; name: string; description: string; hasBaseUrl: boolean }[] = [
  { id: 'openai', name: 'OpenAI API Key', description: '用于 GPT 系列模型调用', hasBaseUrl: true },
  { id: 'anthropic', name: 'Anthropic API Key', description: '用于 Claude 系列模型调用', hasBaseUrl: true },
  { id: 'deepseek', name: 'DeepSeek API Key', description: '用于 DeepSeek 模型调用', hasBaseUrl: true },
  { id: 'moonshot', name: 'Moonshot API Key', description: '用于 Kimi 模型调用', hasBaseUrl: true },
  { id: 'zhipu', name: '智谱 API Key', description: '用于 GLM 系列模型调用', hasBaseUrl: true },
]

export function ApiSettings(): JSX.Element {
  const { getApiKey, setApiKey, deleteApiKey } = useSettingsStore()
  const [configs, setConfigs] = useState<ApiConfig[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [form] = Form.useForm()

  // 加载已有的 API 配置
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

  // 保存 API Key
  const handleSave = async (id: string, values: { key: string; baseUrl?: string }) => {
    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      await setApiKey(id, values.key)
      if (values.baseUrl) {
        await setApiKey(`${id}_baseUrl`, values.baseUrl)
      }
      
      // 更新本地状态
      setConfigs(prev => {
        const exists = prev.find(c => c.id === id)
        if (exists) {
          return prev.map(c => c.id === id ? { ...c, key: values.key, baseUrl: values.baseUrl } : c)
        }
        const preset = PRESET_APIS.find(p => p.id === id)
        return [...prev, {
          id,
          name: preset?.name || id,
          key: values.key,
          baseUrl: values.baseUrl,
          enabled: true
        }]
      })
      
      message.success('保存成功')
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // 删除 API Key
  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(id)
      await deleteApiKey(`${id}_baseUrl`)
      setConfigs(prev => prev.filter(c => c.id !== id))
      message.success('已删除')
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 切换密钥可见性
  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // 遮蔽 API Key
  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key
    return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`
  }

  return (
    <div className={styles.container}>
      <Alert
        message="AI 功能即将推出"
        description="API 密钥功能已预留接口，相关 AI 辅助功能正在开发中。您的密钥将被安全存储在本地。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Title level={5}>API 密钥管理</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        配置 AI 服务的 API 密钥，密钥将被安全存储在本地配置中。
      </Text>

      {/* 已配置的 API */}
      {configs.map(config => (
        <Card key={config.id} size="small" className={styles.apiCard}>
          <div className={styles.cardHeader}>
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
        </Card>
      ))}

      {/* 添加新 API */}
      <Divider>添加 API 密钥</Divider>
      
      <div className={styles.addSection}>
        {PRESET_APIS.filter(preset => !configs.find(c => c.id === preset.id)).map(preset => (
          <Card
            key={preset.id}
            size="small"
            className={styles.addCard}
            hoverable
            onClick={() => {
              form.setFieldsValue({ [`${preset.id}_key`]: '' })
            }}
          >
            <div className={styles.addCardContent}>
              <Text strong>{preset.name}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{preset.description}</Text>
            </div>
          </Card>
        ))}
      </div>

      {/* API 表单 */}
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          // 查找第一个有值的 key
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
        className={styles.form}
      >
        {PRESET_APIS.filter(preset => !configs.find(c => c.id === preset.id)).map(preset => (
          <div key={preset.id} className={styles.formItem}>
            <Form.Item
              name={`${preset.id}_key`}
              label={preset.name}
              rules={[{ required: false }]}
            >
              <Input.Password
                placeholder={`输入 ${preset.name}`}
                visibilityToggle
              />
            </Form.Item>
            {preset.hasBaseUrl && (
              <Form.Item
                name={`${preset.id}_baseUrl`}
                label="自定义 Base URL（可选）"
              >
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

      <Divider />

      {/* 安全提示 */}
      <div className={styles.securityTips}>
        <Title level={5}>安全提示</Title>
        <ul>
          <li>API 密钥存储在本地配置文件中，不会上传到云端</li>
          <li>请勿与他人分享您的 API 密钥</li>
          <li>定期更换 API 密钥以提高安全性</li>
          <li>如果密钥泄露，请立即在服务商处重新生成</li>
        </ul>
      </div>
    </div>
  )
}

export default ApiSettings
