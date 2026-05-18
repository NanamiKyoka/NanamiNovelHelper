import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Popover,
  Button,
  Radio,
  Input,
  Select,
  App,
  Tooltip,
  Tabs,
  Typography,
  Switch,
  Divider
} from 'antd'
import {
  ReloadOutlined,
  CopyOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  RobotOutlined
} from '@ant-design/icons'
import { generateNames, getRandomSurname, copyToClipboard } from '@utils/randomName'
import { NAME_TYPES, type NameType } from '@constants/names'
import { useSettingsStore } from '@stores/settingsStore'
import styles from './RandomNamePanel.module.css'

const { Text } = Typography

interface RandomNamePanelProps {
  children: React.ReactNode
  onNameSelect?: (name: string) => void
}

// 类型分类配置
const CATEGORY_CONFIG = {
  person: {
    icon: <UserOutlined />,
    label: '人物'
  },
  entity: {
    icon: <EnvironmentOutlined />,
    label: '势力'
  },
  item: {
    icon: <ToolOutlined />,
    label: '物品'
  }
}

// AI 名字生成提示词
const AI_NAME_PROMPTS: Record<string, string> = {
  cn: `你是一个专业的中文起名专家。请生成{{count}}个中文名字，要求：
- 性别：{{gender}}
- 风格：{{style}}
{{#surname}}- 姓氏：{{surname}}{{/surname}}
{{#charCount}}- 名字字数：{{charCount}}字{{/charCount}}

请直接返回名字列表，每行一个，不要添加序号或其他说明。重要：所有名字必须使用中文汉字。`,
  jp: `你是一个专业的日文起名专家。请生成{{count}}个日文名字，要求：
- 性别：{{gender}}
- 风格：{{style}}

请直接返回名字列表，每行一个，不要添加序号或其他说明。格式：姓氏 + 名字。`,
  en: `You are a professional English name generator. Please generate {{count}} English names:
- Gender: {{gender}}
- Style: {{style}}

Return only the names, one per line, without numbers or explanations.`,
  fantasy: `你是一个专业的奇幻小说起名专家。请生成{{count}}个奇幻风格的名字，要求：
- 风格：{{style}}
- 用途：人物名

请直接返回名字列表，每行一个，不要添加序号或其他说明。`,
  martial: `你是一个专业的武侠小说起名专家。请生成{{count}}个武侠风格的名字，要求：
- 性别：{{gender}}
- 风格：江湖侠客

请直接返回名字列表，每行一个，不要添加序号或其他说明。`,
  xianxia: `你是一个专业的仙侠小说起名专家。请生成{{count}}个仙侠风格的名字，要求：
- 性别：{{gender}}
- 风格：飘逸出尘

请直接返回名字列表，每行一个，不要添加序号或其他说明。`,
  place: `你是一个专业的地名起名专家。请生成{{count}}个地名，要求：
- 类型：{{style}}
- 用途：小说中的地点

请直接返回名字列表，每行一个，不要添加序号或其他说明。`,
  organization: `你是一个专业的组织名称起名专家。请生成{{count}}个组织名称，要求：
- 类型：{{style}}
- 用途：小说中的门派、组织

请直接返回名字列表，每行一个，不要添加序号或其他说明。`,
  item: `你是一个专业的物品名称起名专家。请生成{{count}}个物品名称，要求：
- 类型：{{style}}
- 用途：小说中的武器、宝物

请直接返回名字列表，每行一个，不要添加序号或其他说明。`
}

const AI_PROVIDER_IDS = ['openai', 'anthropic', 'deepseek', 'moonshot', 'zhipu', 'custom']

function RandomNamePanel({ children, onNameSelect }: RandomNamePanelProps): JSX.Element {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('cn')
  const [gender, setGender] = useState<'male' | 'female' | 'random'>('random')
  const [charCount, setCharCount] = useState<2 | 3 | 'random'>('random')
  const [surname, setSurname] = useState<string>('')
  const [middleChar, setMiddleChar] = useState<string>('')
  const [suffix, setSuffix] = useState<string>('')
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // AI 相关状态
  const [useAi, setUseAi] = useState(false)
  const [aiStyle, setAiStyle] = useState<string>('古风')
  const [aiProvider, setAiProvider] = useState<string>('')
  const [configuredProviders, setConfiguredProviders] = useState<{ id: string; name: string }[]>([])

  // 当前选中的类型配置
  const currentTypeConfig = useMemo(() => {
    return NAME_TYPES.find(t => t.value === selectedType)
  }, [selectedType])

  // 是否为人名类型
  const isPersonType = useMemo(() => {
    return currentTypeConfig?.category === 'person'
  }, [currentTypeConfig])

  const getApiKey = useSettingsStore(s => s.getApiKey)
  const providerInitialized = useRef(false)

  const discoverProviders = useCallback(async () => {
    const providers: { id: string; name: string }[] = []
    const nameMap: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      deepseek: 'DeepSeek',
      moonshot: 'Moonshot',
      zhipu: '智谱AI',
      custom: '自定义'
    }
    for (const id of AI_PROVIDER_IDS) {
      const key = await getApiKey(id)
      if (key) {
        providers.push({ id, name: nameMap[id] || id })
      }
    }
    const customKeys = await getApiKey('custom_providers')
    if (customKeys) {
      try {
        const customList = JSON.parse(customKeys)
        for (const custom of customList) {
          const key = await getApiKey(custom.id)
          if (key) {
            providers.push({ id: custom.id, name: custom.name })
          }
        }
      } catch {
        // ignore
      }
    }
    setConfiguredProviders(providers)
    if (providers.length > 0 && !providerInitialized.current) {
      setAiProvider(providers[0].id)
      providerInitialized.current = true
    }
  }, [getApiKey])

  useEffect(() => {
    discoverProviders()
  }, [discoverProviders])

  // AI 生成名字
  const generateNamesWithAi = useCallback(async () => {
    const promptTemplate = AI_NAME_PROMPTS[selectedType] || AI_NAME_PROMPTS.cn

    // 构建提示词
    let prompt = promptTemplate
      .replace('{{count}}', '24')
      .replace('{{gender}}', gender === 'random' ? '不限' : gender === 'male' ? '男' : '女')
      .replace('{{style}}', aiStyle)

    if (surname) {
      prompt = prompt.replace('{{surname}}', surname)
    } else {
      prompt = prompt
        .replace('{{#surname}}', '')
        .replace('{{/surname}}', '')
        .replace('{{surname}}', '')
    }

    if (charCount !== 'random') {
      prompt = prompt.replace('{{charCount}}', String(charCount))
    } else {
      prompt = prompt
        .replace('{{#charCount}}', '')
        .replace('{{/charCount}}', '')
        .replace('{{charCount}}', '')
    }

    try {
      const result = await window.api.aiAssistant.callApi(prompt, {
        provider: aiProvider,
        systemPrompt:
          '你是一个专业的起名助手。请按照用户的要求生成名字。重要：只输出名字列表，每行一个，不要添加任何解释或序号。',
        temperature: 0.8,
        maxTokens: 1000
      })

      if (result.success && result.content) {
        // 解析返回的名字列表
        const nameList = result.content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#') && !line.startsWith('【'))
          .slice(0, 24)

        if (nameList.length > 0) {
          return nameList
        }
      }

      // AI 失败，回退到本地生成
      return null
    } catch {
      return null
    }
  }, [selectedType, gender, aiStyle, surname, charCount, aiProvider])

  // 生成名字
  const handleGenerate = useCallback(async () => {
    setLoading(true)

    if (useAi) {
      if (!aiProvider) {
        message.warning('请先在设置中配置 API 提供商')
        setLoading(false)
        return
      }

      try {
        const aiNames = await generateNamesWithAi()
        if (aiNames && aiNames.length > 0) {
          setNames(aiNames)
          setLoading(false)
          return
        }
        message.warning('AI 生成失败，已切换到本地生成')
      } catch {
        message.warning('AI 服务暂时不可用，已切换到本地生成')
      }
    }

    // 本地生成
    setTimeout(() => {
      const options = {
        type: selectedType,
        count: 24,
        surname: surname || undefined,
        gender: gender === 'random' ? undefined : (gender as 'male' | 'female'),
        charCount: charCount === 'random' ? undefined : charCount,
        middleChar: middleChar || undefined,
        suffix: suffix || undefined
      }

      const result = generateNames(options)
      setNames(result)
      setLoading(false)
    }, 100)
  }, [useAi, generateNamesWithAi, selectedType, surname, gender, charCount, middleChar, suffix, message, aiProvider])

  // 随机姓氏
  const handleRandomSurname = useCallback(() => {
    const type = selectedType === 'jp' ? 'jp' : selectedType === 'en' ? 'en' : 'cn'
    const isCompound = selectedType === 'cn' && Math.random() < 0.2
    const newSurname = getRandomSurname(type, isCompound)
    setSurname(newSurname)
  }, [selectedType])

  // 复制名字
  const handleCopyName = useCallback(
    async (name: string) => {
      const success = await copyToClipboard(name)
      if (success) {
        message.success(`已复制: ${name}`)
        onNameSelect?.(name)
      } else {
        message.error('复制失败')
      }
    },
    [onNameSelect, message]
  )

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen)
      if (newOpen) {
        discoverProviders()
        if (names.length === 0) {
          setTimeout(handleGenerate, 100)
        }
      }
    },
    [names.length, handleGenerate, discoverProviders]
  )

  // 类型选项按分类分组
  const typeOptions = useMemo(() => {
    const groups: Record<string, NameType[]> = {
      person: [],
      entity: [],
      item: []
    }

    NAME_TYPES.forEach(type => {
      groups[type.category].push(type)
    })

    return groups
  }, [])

  // 配置面板内容
  const configContent = (
    <div className={styles.configPanel}>
      {/* 类型选择 */}
      <div className={styles.configSection}>
        <div className={styles.sectionLabel}>类型</div>
        <Tabs
          size="small"
          items={Object.entries(typeOptions).map(([category, types]) => ({
            key: category,
            label: (
              <span className={styles.tabLabel}>
                {CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG].icon}
                {CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG].label}
              </span>
            ),
            children: (
              <div className={styles.typeGrid}>
                {types.map(type => (
                  <Button
                    key={type.value}
                    size="small"
                    type={selectedType === type.value ? 'primary' : 'default'}
                    onClick={() => setSelectedType(type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            )
          }))}
        />
      </div>

      {/* 人名特有配置 */}
      {isPersonType && (
        <>
          <div className={styles.configSection}>
            <div className={styles.sectionLabel}>姓氏</div>
            <div className={styles.surnameInput}>
              <Input
                placeholder="留空随机"
                value={surname}
                onChange={e => setSurname(e.target.value)}
                allowClear
              />
              {selectedType === 'cn' && (
                <Button size="small" onClick={handleRandomSurname}>
                  随机
                </Button>
              )}
            </div>
          </div>

          <div className={styles.configSection}>
            <div className={styles.sectionLabel}>性别</div>
            <Radio.Group
              value={gender}
              onChange={e => setGender(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="random">随机</Radio.Button>
              <Radio.Button value="male">男</Radio.Button>
              <Radio.Button value="female">女</Radio.Button>
            </Radio.Group>
          </div>

          {selectedType === 'cn' && (
            <>
              <div className={styles.configSection}>
                <div className={styles.sectionLabel}>名字字数</div>
                <Radio.Group
                  value={charCount}
                  onChange={e => setCharCount(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="random">随机</Radio.Button>
                  <Radio.Button value={2}>二字</Radio.Button>
                  <Radio.Button value={3}>三字</Radio.Button>
                </Radio.Group>
              </div>

              {charCount === 3 && (
                <div className={styles.configSection}>
                  <div className={styles.sectionLabel}>中间字</div>
                  <Input
                    placeholder="留空随机"
                    value={middleChar}
                    onChange={e => setMiddleChar(e.target.value.slice(0, 1))}
                    maxLength={1}
                    allowClear
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* 非人名类型的后缀配置 */}
      {!isPersonType && (
        <div className={styles.configSection}>
          <div className={styles.sectionLabel}>后缀</div>
          <Input
            placeholder="留空随机"
            value={suffix}
            onChange={e => setSuffix(e.target.value)}
            allowClear
          />
        </div>
      )}

      {/* AI 生成开关 */}
      <Divider style={{ margin: '12px 0' }} />
      <div className={styles.configSection}>
        <div className={styles.sectionLabel}>
          <RobotOutlined style={{ marginRight: 4 }} />
          AI 生成
        </div>
        <div className={styles.aiSwitchRow}>
          <Switch size="small" checked={useAi} onChange={setUseAi} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {useAi ? '使用 AI 生成更有创意的名字' : '使用本地词库生成'}
          </Text>
        </div>

        {useAi && (
          <div className={styles.aiStyleSection}>
            <div className={styles.sectionLabel} style={{ fontSize: 12 }}>
              API 提供商
            </div>
            <Select
              size="small"
              value={aiProvider}
              onChange={setAiProvider}
              style={{ width: '100%', marginBottom: 8 }}
              getPopupContainer={triggerNode => triggerNode.parentElement || document.body}
              options={configuredProviders.map(p => ({ value: p.id, label: p.name }))}
              placeholder={configuredProviders.length === 0 ? '请先在设置中配置 API' : '选择提供商'}
              disabled={configuredProviders.length === 0}
            />
            {configuredProviders.length === 0 && (
              <Text type="danger" style={{ fontSize: 11 }}>
                未检测到已配置的 API 提供商，请在「设置 → AI/API」中添加
              </Text>
            )}
            <div className={styles.sectionLabel} style={{ fontSize: 12 }}>
              风格
            </div>
            <Select
              size="small"
              value={aiStyle}
              onChange={setAiStyle}
              style={{ width: '100%' }}
              getPopupContainer={triggerNode => triggerNode.parentElement || document.body}
              options={
                isPersonType
                  ? [
                      { value: '古风', label: '古风' },
                      { value: '现代', label: '现代' },
                      { value: '文艺', label: '文艺' },
                      { value: '可爱', label: '可爱' },
                      { value: '霸气', label: '霸气' }
                    ]
                  : [
                      { value: '古风', label: '古风' },
                      { value: '玄幻', label: '玄幻' },
                      { value: '科幻', label: '科幻' },
                      { value: '神秘', label: '神秘' }
                    ]
              }
            />
          </div>
        )}
      </div>

      {/* 生成按钮 */}
      <div className={styles.generateBtn}>
        <Button
          type="primary"
          icon={useAi ? <RobotOutlined /> : <ReloadOutlined spin={loading} />}
          onClick={handleGenerate}
          loading={loading}
          block
        >
          {useAi ? 'AI 生成名字' : '生成名字'}
        </Button>
      </div>
    </div>
  )

  // 名字列表内容
  const namesContent = (
    <div className={styles.namesPanel}>
      {names.length === 0 ? (
        <div className={styles.emptyState}>点击「生成名字」开始</div>
      ) : (
        <div className={styles.namesGrid}>
          {names.map((name, index) => (
            <Tooltip key={index} title="点击复制">
              <div className={styles.nameItem} onClick={() => handleCopyName(name)}>
                <Text>{name}</Text>
                <CopyOutlined className={styles.copyIcon} />
              </div>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  )

  // Popover 内容
  const popoverContent = (
    <div className={styles.panel}>
      <div className={styles.configColumn}>{configContent}</div>
      <div className={styles.namesColumn}>
        <div className={styles.namesHeader}>
          <span>生成结果</span>
          <span className={styles.count}>{names.length} 个</span>
        </div>
        {namesContent}
      </div>
    </div>
  )

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      content={popoverContent}
      trigger="click"
      placement="leftTop"
      overlayClassName={styles.popover}
      arrow={false}
    >
      {children}
    </Popover>
  )
}

export default RandomNamePanel
