import { useState, useCallback, useMemo } from 'react'
import { Popover, Button, Radio, Input, Select, message, Tooltip, Tabs, Typography } from 'antd'
import { ReloadOutlined, CopyOutlined, UserOutlined, EnvironmentOutlined, BookOutlined, ToolOutlined, ExperimentOutlined, SettingOutlined } from '@ant-design/icons'
import { generateNames, getRandomSurname, copyToClipboard } from '@utils/randomName'
import { NAME_TYPES, type NameType } from '@constants/names'
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

function RandomNamePanel({ children, onNameSelect }: RandomNamePanelProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('cn')
  const [gender, setGender] = useState<'male' | 'female' | 'random'>('random')
  const [charCount, setCharCount] = useState<2 | 3 | 'random'>('random')
  const [surname, setSurname] = useState<string>('')
  const [middleChar, setMiddleChar] = useState<string>('')
  const [suffix, setSuffix] = useState<string>('')
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 当前选中的类型配置
  const currentTypeConfig = useMemo(() => {
    return NAME_TYPES.find(t => t.value === selectedType)
  }, [selectedType])

  // 是否为人名类型
  const isPersonType = useMemo(() => {
    return currentTypeConfig?.category === 'person'
  }, [currentTypeConfig])

  // 生成名字
  const handleGenerate = useCallback(() => {
    setLoading(true)
    
    // 模拟一点点延迟，让用户感觉到生成过程
    setTimeout(() => {
      const options = {
        type: selectedType,
        count: 24,
        surname: surname || undefined,
        gender: gender === 'random' ? undefined : gender as 'male' | 'female',
        charCount: charCount === 'random' ? undefined : charCount,
        middleChar: middleChar || undefined,
        suffix: suffix || undefined
      }
      
      const result = generateNames(options)
      setNames(result)
      setLoading(false)
    }, 100)
  }, [selectedType, surname, gender, charCount, middleChar, suffix])

  // 随机姓氏
  const handleRandomSurname = useCallback(() => {
    const type = selectedType === 'jp' ? 'jp' : (selectedType === 'en' ? 'en' : 'cn')
    const isCompound = selectedType === 'cn' && Math.random() < 0.2
    const newSurname = getRandomSurname(type, isCompound)
    setSurname(newSurname)
  }, [selectedType])

  // 复制名字
  const handleCopyName = useCallback(async (name: string) => {
    const success = await copyToClipboard(name)
    if (success) {
      message.success(`已复制: ${name}`)
      onNameSelect?.(name)
    } else {
      message.error('复制失败')
    }
  }, [onNameSelect])

  // 初始化生成
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && names.length === 0) {
      setTimeout(handleGenerate, 100)
    }
  }, [names.length, handleGenerate])

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
                onChange={(e) => setSurname(e.target.value)}
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
              onChange={(e) => setGender(e.target.value)}
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
                  onChange={(e) => setCharCount(e.target.value)}
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
                    onChange={(e) => setMiddleChar(e.target.value.slice(0, 1))}
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
            onChange={(e) => setSuffix(e.target.value)}
            allowClear
          />
        </div>
      )}

      {/* 生成按钮 */}
      <div className={styles.generateBtn}>
        <Button
          type="primary"
          icon={<ReloadOutlined spin={loading} />}
          onClick={handleGenerate}
          loading={loading}
          block
        >
          生成名字
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
              <div
                className={styles.nameItem}
                onClick={() => handleCopyName(name)}
              >
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
      <div className={styles.configColumn}>
        {configContent}
      </div>
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
