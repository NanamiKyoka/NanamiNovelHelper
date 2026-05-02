/**
 * AI/API 设置组件
 */

import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Button,
  message,
  Card,
  Typography,
  Popconfirm,
  Tag,
  Space,
  Divider,
  Radio,
  Tooltip,
  Alert
} from 'antd'
import {
  SaveOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ApiOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import baseStyles from './SettingsBase.module.css'
import styles from './ApiSettings.module.css'

const { Text } = Typography

type ApiFormat = 'openai' | 'anthropic'

interface ApiConfig {
  id: string
  name: string
  key: string
  baseUrl?: string
  enabled: boolean
}

interface PresetProvider {
  id: string
  name: string
  description: string
  officialBaseUrl: string
  apiFormat: ApiFormat
  baseUrlPlaceholder: string
}

const PRESET_PROVIDERS: PresetProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-5 等模型',
    officialBaseUrl: 'https://api.openai.com/v1',
    apiFormat: 'openai',
    baseUrlPlaceholder: 'https://api.openai.com/v1'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 4.6 等模型',
    officialBaseUrl: 'https://api.anthropic.com/v1',
    apiFormat: 'anthropic',
    baseUrlPlaceholder: 'https://api.anthropic.com/v1'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek-V4-pro 等模型',
    officialBaseUrl: 'https://api.deepseek.com',
    apiFormat: 'openai',
    baseUrlPlaceholder: 'https://api.deepseek.com'
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    description: 'Kimi 智能助手模型',
    officialBaseUrl: 'https://api.moonshot.cn/v1',
    apiFormat: 'openai',
    baseUrlPlaceholder: 'https://api.moonshot.cn/v1'
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    description: 'GLM-5.1 等模型',
    officialBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiFormat: 'openai',
    baseUrlPlaceholder: 'https://open.bigmodel.cn/api/paas/v4'
  }
]

const validateBaseUrl = (url: string, format: ApiFormat): { valid: boolean; error?: string } => {
  if (!url) {
    return { valid: true }
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'URL 必须以 http:// 或 https:// 开头' }
    }
    if (!parsed.hostname) {
      return { valid: false, error: 'URL 必须包含有效的域名' }
    }

    if (format === 'anthropic') {
      if (!url.includes('/v1') && !url.endsWith('/messages')) {
        return { valid: false, error: 'Anthropic API URL 通常包含 /v1 路径' }
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'URL 格式无效，请输入有效的 URL' }
  }
}

const getUrlFormatExample = (format: ApiFormat): string => {
  if (format === 'openai') {
    return '示例: https://api.example.com/v1'
  }
  return '示例: https://api.example.com/v1'
}

export function ApiSettings(): JSX.Element {
  const { getApiKey, setApiKey, deleteApiKey } = useSettingsStore()
  const [configs, setConfigs] = useState<ApiConfig[]>([])
  const [, setLoading] = useState<Record<string, boolean>>({})
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [testStates, setTestStates] = useState<Record<string, 'idle' | 'testing' | 'success' | 'fail'>>({})
  const [form] = Form.useForm()
  const [customForm] = Form.useForm()
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customConfigs, setCustomConfigs] = useState<ApiConfig[]>([])

  useEffect(() => {
    const loadConfigs = async () => {
      const loadedConfigs: ApiConfig[] = []
      const loadedCustomConfigs: ApiConfig[] = []

      for (const preset of PRESET_PROVIDERS) {
        const key = await getApiKey(preset.id)
        if (key) {
          const baseUrl = await getApiKey(`${preset.id}_baseUrl`)
          loadedConfigs.push({
            id: preset.id,
            name: preset.name,
            key: key,
            baseUrl: baseUrl || preset.officialBaseUrl,
            enabled: true
          })
        }
      }

      const customKeys = await getApiKey('custom_providers')
      if (customKeys) {
        try {
          const customList = JSON.parse(customKeys)
          for (const custom of customList) {
            const key = await getApiKey(custom.id)
            if (key) {
              const baseUrl = await getApiKey(`${custom.id}_baseUrl`)
              loadedCustomConfigs.push({
                id: custom.id,
                name: custom.name,
                key: key,
                baseUrl: baseUrl,
                enabled: true
              })
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      setConfigs(loadedConfigs)
      setCustomConfigs(loadedCustomConfigs)
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
        const preset = PRESET_PROVIDERS.find(p => p.id === id)
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

  const handleSaveCustom = async (values: { name: string; key: string; baseUrl: string; apiFormat: ApiFormat }) => {
    const customId = `custom_${Date.now()}`
    setLoading(prev => ({ ...prev, [customId]: true }))

    try {
      await setApiKey(customId, values.key)
      await setApiKey(`${customId}_baseUrl`, values.baseUrl)
      await setApiKey(`${customId}_format`, values.apiFormat)

      const newCustomConfig: ApiConfig = {
        id: customId,
        name: values.name,
        key: values.key,
        baseUrl: values.baseUrl,
        enabled: true
      }

      const customList = [...customConfigs, newCustomConfig]
      setCustomConfigs(customList)

      await setApiKey('custom_providers', JSON.stringify(customList.map(c => ({ id: c.id, name: c.name }))))

      customForm.resetFields()
      setShowCustomForm(false)
      message.success('自定义 API 配置已保存')
    } catch (_error) {
      message.error('保存失败')
    } finally {
      setLoading(prev => ({ ...prev, [customId]: false }))
    }
  }

  const handleDeleteCustom = async (id: string) => {
    try {
      await deleteApiKey(id)
      await deleteApiKey(`${id}_baseUrl`)
      await deleteApiKey(`${id}_format`)

      const newCustomConfigs = customConfigs.filter(c => c.id !== id)
      setCustomConfigs(newCustomConfigs)

      await setApiKey('custom_providers', JSON.stringify(newCustomConfigs.map(c => ({ id: c.id, name: c.name }))))

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

  const handleTestConnection = async (id: string) => {
    setTestStates(prev => ({ ...prev, [id]: 'testing' }))
    try {
      const result = await window.electron.aiAssistant.testApiConnection(id)
      if (result.success) {
        setTestStates(prev => ({ ...prev, [id]: 'success' }))
        message.success(`${PRESET_PROVIDERS.find(p => p.id === id)?.name || id} 连接成功`)
      } else {
        setTestStates(prev => ({ ...prev, [id]: 'fail' }))
        message.error(`连接失败: ${result.error || '未知错误'}`)
      }
    } catch (err) {
      setTestStates(prev => ({ ...prev, [id]: 'fail' }))
      message.error(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const renderApiItem = (config: ApiConfig, preset?: PresetProvider, isCustom = false) => {
    const displayName = preset?.name || config.name
    const description = preset?.description || '自定义 API 配置'
    const officialBaseUrl = preset?.officialBaseUrl

    return (
      <div key={config.id} className={styles.apiItem}>
        <div className={styles.apiItemHeader}>
          <div>
            <Space>
              <Text strong>{displayName}</Text>
              {isCustom && <Tag color="blue">自定义</Tag>}
            </Space>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {description}
            </Text>
          </div>
          <Popconfirm
            title="确定删除此 API 密钥？"
            onConfirm={() => isCustom ? handleDeleteCustom(config.id) : handleDelete(config.id)}
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
        {config.baseUrl && (
          <div className={styles.baseUrlDisplay}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Base URL: {config.baseUrl}
              {officialBaseUrl && config.baseUrl !== officialBaseUrl && (
                <Tag color="orange" style={{ marginLeft: 8 }}>自定义</Tag>
              )}
              {officialBaseUrl && config.baseUrl === officialBaseUrl && (
                <Tag color="green" style={{ marginLeft: 8 }}>官方</Tag>
              )}
            </Text>
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <Space>
            <Button
              size="small"
              icon={
                testStates[config.id] === 'testing' ? (
                  <LoadingOutlined />
                ) : testStates[config.id] === 'success' ? (
                  <CheckCircleOutlined />
                ) : testStates[config.id] === 'fail' ? (
                  <CloseCircleOutlined />
                ) : (
                  <ApiOutlined />
                )
              }
              onClick={() => handleTestConnection(config.id)}
              loading={testStates[config.id] === 'testing'}
              disabled={testStates[config.id] === 'testing'}
            >
              测试连接
            </Button>
            {testStates[config.id] === 'success' && <Tag color="success">连接正常</Tag>}
            {testStates[config.id] === 'fail' && <Tag color="error">连接失败</Tag>}
          </Space>
        </div>
      </div>
    )
  }

  return (
    <div className={baseStyles.container}>
      <Card title="内置 AI 服务提供商" className={baseStyles.card}>
        <p className={baseStyles.hint}>
          选择主流 AI 服务提供商，系统已预置官方 API 地址。您也可以自定义 Base URL 以使用代理或私有部署。
        </p>

        {configs.length === 0 ? (
          <Text type="secondary">暂无已配置的内置 API 密钥</Text>
        ) : (
          configs.map(config => {
            const preset = PRESET_PROVIDERS.find(p => p.id === config.id)
            return renderApiItem(config, preset)
          })
        )}
      </Card>

      <Card title="添加内置提供商" className={baseStyles.card}>
        <p className={baseStyles.hint}>选择要添加的 API 服务并输入密钥。</p>

        <Form
          form={form}
          layout="vertical"
          onFinish={values => {
            for (const preset of PRESET_PROVIDERS) {
              const keyField = `${preset.id}_key`
              const baseUrlField = `${preset.id}_baseUrl`
              if (values[keyField]) {
                const customBaseUrl = values[baseUrlField]
                handleSave(preset.id, {
                  key: values[keyField],
                  baseUrl: customBaseUrl || preset.officialBaseUrl
                })
                form.resetFields([keyField, baseUrlField])
                break
              }
            }
          }}
        >
          {PRESET_PROVIDERS.filter(preset => !configs.find(c => c.id === preset.id)).map(preset => (
            <div key={preset.id} className={styles.formItem}>
              <div className={styles.providerHeader}>
                <Text strong>{preset.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{preset.description}</Text>
              </div>
              <Form.Item
                name={`${preset.id}_key`}
                label="API Key"
                rules={[{ required: false }]}
              >
                <Input.Password placeholder={`输入 ${preset.name} API Key`} visibilityToggle />
              </Form.Item>
              <Form.Item
                name={`${preset.id}_baseUrl`}
                label={
                  <Space>
                    <span>Base URL</span>
                    <Tooltip title={`官方地址: ${preset.officialBaseUrl}，留空则使用官方地址`}>
                      <QuestionCircleOutlined style={{ color: 'var(--ant-color-text-secondary)' }} />
                    </Tooltip>
                  </Space>
                }
                rules={[
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve()
                      const result = validateBaseUrl(value, preset.apiFormat)
                      if (result.valid) return Promise.resolve()
                      return Promise.reject(new Error(result.error))
                    }
                  }
                ]}
              >
                <Input placeholder={preset.baseUrlPlaceholder} />
              </Form.Item>
              <div className={styles.officialUrlHint}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  官方地址: {preset.officialBaseUrl}
                </Text>
              </div>
            </div>
          ))}

          {PRESET_PROVIDERS.filter(preset => !configs.find(c => c.id === preset.id)).length > 0 && (
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                保存
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>

      <Divider />

      <Card
        title={
          <Space>
            <GlobalOutlined />
            <span>自定义 API 配置</span>
          </Space>
        }
        className={baseStyles.card}
      >
        <p className={baseStyles.hint}>
          配置兼容 OpenAI 或 Anthropic API 格式的第三方服务。适用于私有部署、代理服务或其他兼容服务。
        </p>

        {customConfigs.length > 0 && (
          <div className={styles.customConfigList}>
            {customConfigs.map(config => renderApiItem(config, undefined, true))}
          </div>
        )}

        {!showCustomForm ? (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setShowCustomForm(true)}
            style={{ width: '100%' }}
          >
            添加自定义 API 配置
          </Button>
        ) : (
          <Form
            form={customForm}
            layout="vertical"
            onFinish={handleSaveCustom}
            initialValues={{ apiFormat: 'openai' }}
          >
            <Alert
              message="格式说明"
              description={
                <div>
                  <p style={{ margin: '4px 0' }}>
                    <strong>OpenAI 兼容格式:</strong> 适用于大多数第三方服务，端点通常为 /v1/chat/completions
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Anthropic 格式:</strong> 适用于 Claude 兼容服务，端点通常为 /v1/messages
                  </p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="name"
              label="配置名称"
              rules={[{ required: true, message: '请输入配置名称' }]}
            >
              <Input placeholder="例如: 本地 Ollama、Azure OpenAI" />
            </Form.Item>

            <Form.Item
              name="apiFormat"
              label="API 格式"
              rules={[{ required: true, message: '请选择 API 格式' }]}
            >
              <Radio.Group>
                <Radio.Button value="openai">OpenAI 兼容</Radio.Button>
                <Radio.Button value="anthropic">Anthropic 兼容</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="baseUrl"
              label="Base URL"
              rules={[
                { required: true, message: '请输入 Base URL' },
                {
                  validator: (_, value) => {
                    const format = customForm.getFieldValue('apiFormat')
                    const result = validateBaseUrl(value, format)
                    if (result.valid) return Promise.resolve()
                    return Promise.reject(new Error(result.error))
                  }
                }
              ]}
              extra={getUrlFormatExample(customForm.getFieldValue('apiFormat'))}
            >
              <Input placeholder="https://api.example.com/v1" />
            </Form.Item>

            <Form.Item
              name="key"
              label="API Key"
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input.Password placeholder="输入 API Key" visibilityToggle />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  保存
                </Button>
                <Button onClick={() => {
                  setShowCustomForm(false)
                  customForm.resetFields()
                }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
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
