/**
 * 词汇高亮设置组件
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Switch,
  Select,
  InputNumber,
  Button,
  Divider,
  Space,
  Tag,
  Input,
  message,
  Card,
  Row,
  Col,
  ColorPicker,
  Checkbox,
  Collapse,
  Tree,
  Modal
} from 'antd'
import type { TreeDataNode, TreeProps } from 'antd'
import { PlusOutlined, FolderOutlined } from '@ant-design/icons'
import type { HighlightConfig, HoverCardTypeConfig } from '@shared/highlight'
import { useHighlightService } from '@services/highlightService'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useProjectStore } from '@stores/projectStore'
import baseStyles from './SettingsBase.module.css'
import styles from './HighlightSettings.module.css'

const { Option } = Select

export function HighlightSettings(): JSX.Element {
  const { config, saveConfig, loading, updateHoverCardConfig } = useHighlightService()
  const { types: vocabTypes } = useVocabularyStore()
  const currentProject = useProjectStore(state => state.currentProject)
  const [form] = Form.useForm()
  const [newExcludeExt, setNewExcludeExt] = useState('')
  const [newExcludeDir, setNewExcludeDir] = useState('')
  const [newIncludeDir, setNewIncludeDir] = useState('')
  const [dirPickerOpen, setDirPickerOpen] = useState(false)
  const [dirPickerTarget, setDirPickerTarget] = useState<'include' | 'exclude'>('include')
  const [projectDirs, setProjectDirs] = useState<TreeDataNode[]>([])
  const [loadingDirs, setLoadingDirs] = useState(false)

  // 初始化表单
  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        enabled: config.scope.enabled,
        matchMode: config.match.matchMode,
        caseSensitive: config.match.caseSensitive,
        matchAliases: config.match.matchAliases,
        sensitiveWordHighlight: config.match.sensitiveWordHighlight,
        showTextColor: config.style.showTextColor,
        showBold: config.style.showBold,
        showItalic: config.style.showItalic,
        showUnderline: config.style.showUnderline,
        underlineWidth: config.style.underlineWidth,
        underlineStyle: config.style.underlineStyle,
        showHoverTooltip: config.style.showHoverTooltip,
        hoverDelay: config.style.hoverDelay,
        largeFileThreshold: config.performance.largeFileThreshold,
        disableOnLargeFile: config.performance.disableOnLargeFile,
        updateDebounce: config.performance.updateDebounce,
        maxHighlights: config.performance.maxHighlights
      })
    }
  }, [config, form])

  // 自动保存表单值变化
  const handleValuesChange = useCallback(
    (_changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => {
      if (!config) return

      const newConfig: Partial<HighlightConfig> = {
        scope: {
          ...config.scope,
          enabled: allValues.enabled
        },
        match: {
          ...config.match,
          matchMode: allValues.matchMode,
          caseSensitive: allValues.caseSensitive,
          matchAliases: allValues.matchAliases,
          sensitiveWordHighlight: allValues.sensitiveWordHighlight
        },
        style: {
          ...config.style,
          showTextColor: allValues.showTextColor,
          showBold: allValues.showBold,
          showItalic: allValues.showItalic,
          showUnderline: allValues.showUnderline,
          underlineWidth: allValues.underlineWidth,
          underlineStyle: allValues.underlineStyle,
          showHoverTooltip: allValues.showHoverTooltip,
          hoverDelay: allValues.hoverDelay
        },
        performance: {
          ...config.performance,
          largeFileThreshold: allValues.largeFileThreshold,
          disableOnLargeFile: allValues.disableOnLargeFile,
          updateDebounce: allValues.updateDebounce,
          maxHighlights: allValues.maxHighlights
        }
      }

      saveConfig(newConfig)
    },
    [config, saveConfig]
  )

  // 加载项目目录结构
  const loadProjectDirs = async () => {
    if (!currentProject) return
    setLoadingDirs(true)
    try {
      const tree = await window.api.file.getTree(true)
      const convertToTreeData = (nodes: FileNode[], parentPath: string = ''): TreeDataNode[] => {
        return nodes
          .filter(node => node.isDirectory)
          .map(node => {
            const relativePath = parentPath ? `${parentPath}/${node.name}` : node.name
            return {
              key: relativePath,
              title: node.name,
              icon: <FolderOutlined />,
              children: node.children ? convertToTreeData(node.children, relativePath) : undefined
            }
          })
      }
      setProjectDirs(convertToTreeData(tree))
    } catch (error) {
      console.error('Failed to load project directories:', error)
    } finally {
      setLoadingDirs(false)
    }
  }

  // 打开目录选择器
  const openDirPicker = (target: 'include' | 'exclude') => {
    setDirPickerTarget(target)
    setDirPickerOpen(true)
    loadProjectDirs()
  }

  // 选择目录
  const handleDirSelect: TreeProps['onSelect'] = selectedKeys => {
    if (selectedKeys.length === 0) return
    const selectedDir = selectedKeys[0] as string

    if (dirPickerTarget === 'include') {
      if (config!.scope.includeDirectories.includes(selectedDir)) {
        message.warning('该目录已存在')
        return
      }
      saveConfig({
        scope: {
          ...config!.scope,
          includeDirectories: [...config!.scope.includeDirectories, selectedDir]
        }
      })
      message.success('已添加包含目录')
    } else {
      if (config!.scope.excludeDirectories.includes(selectedDir)) {
        message.warning('该目录已存在')
        return
      }
      saveConfig({
        scope: {
          ...config!.scope,
          excludeDirectories: [...config!.scope.excludeDirectories, selectedDir]
        }
      })
      message.success('已添加排除目录')
    }
    setDirPickerOpen(false)
  }

  // 添加排除的扩展名
  const addExcludeExt = () => {
    if (!newExcludeExt.trim()) return
    const ext = newExcludeExt.trim().toLowerCase().replace(/^\./, '')
    if (config!.scope.excludeExtensions.includes(ext)) {
      message.warning('该扩展名已存在')
      return
    }

    saveConfig({
      scope: {
        ...config!.scope,
        excludeExtensions: [...config!.scope.excludeExtensions, ext]
      }
    })
    setNewExcludeExt('')
    message.success('添加成功')
  }

  // 删除排除的扩展名
  const removeExcludeExt = (ext: string) => {
    saveConfig({
      scope: {
        ...config!.scope,
        excludeExtensions: config!.scope.excludeExtensions.filter(e => e !== ext)
      }
    })
  }

  // 添加排除的目录
  const addExcludeDir = () => {
    if (!newExcludeDir.trim()) return
    const dir = newExcludeDir.trim()
    if (config!.scope.excludeDirectories.includes(dir)) {
      message.warning('该目录已存在')
      return
    }

    saveConfig({
      scope: {
        ...config!.scope,
        excludeDirectories: [...config!.scope.excludeDirectories, dir]
      }
    })
    setNewExcludeDir('')
    message.success('添加成功')
  }

  // 删除排除的目录
  const removeExcludeDir = (dir: string) => {
    saveConfig({
      scope: {
        ...config!.scope,
        excludeDirectories: config!.scope.excludeDirectories.filter(d => d !== dir)
      }
    })
  }

  // 添加包含的目录
  const addIncludeDir = () => {
    if (!newIncludeDir.trim()) return
    const dir = newIncludeDir.trim()
    if (config!.scope.includeDirectories.includes(dir)) {
      message.warning('该目录已存在')
      return
    }

    saveConfig({
      scope: {
        ...config!.scope,
        includeDirectories: [...config!.scope.includeDirectories, dir]
      }
    })
    setNewIncludeDir('')
    message.success('添加成功')
  }

  // 删除包含的目录
  const removeIncludeDir = (dir: string) => {
    saveConfig({
      scope: {
        ...config!.scope,
        includeDirectories: config!.scope.includeDirectories.filter(d => d !== dir)
      }
    })
  }

  if (loading || !config) {
    return <div>加载中...</div>
  }

  return (
    <div className={baseStyles.container}>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={{
          enabled: config.scope.enabled,
          matchMode: config.match.matchMode,
          caseSensitive: config.match.caseSensitive,
          matchAliases: config.match.matchAliases,
          sensitiveWordHighlight: config.match.sensitiveWordHighlight,
          showTextColor: config.style.showTextColor,
          showBold: config.style.showBold,
          showItalic: config.style.showItalic,
          showUnderline: config.style.showUnderline,
          underlineWidth: config.style.underlineWidth,
          underlineStyle: config.style.underlineStyle,
          showHoverTooltip: config.style.showHoverTooltip,
          hoverDelay: config.style.hoverDelay,
          largeFileThreshold: config.performance.largeFileThreshold,
          disableOnLargeFile: config.performance.disableOnLargeFile,
          updateDebounce: config.performance.updateDebounce,
          maxHighlights: config.performance.maxHighlights
        }}
      >
        {/* 基础设置 */}
        <Card title="基础设置" className={baseStyles.card}>
          <Form.Item name="enabled" label="启用词汇高亮" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="sensitiveWordHighlight" label="启用敏感词高亮" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        {/* 高亮范围设置 */}
        <Card title="高亮范围" className={baseStyles.card}>
          <div className={styles.section}>
            <h4>包含目录</h4>
            <p className={styles.hint}>
              留空表示全部文件，添加后将只对这些目录下的文件进行高亮。 使用相对于项目根目录的路径。
            </p>
            <div className={styles.tagList}>
              {config.scope.includeDirectories.map(dir => (
                <Tag
                  key={dir}
                  closable
                  onClose={() => removeIncludeDir(dir)}
                  icon={<FolderOutlined />}
                >
                  {dir}
                </Tag>
              ))}
            </div>
            <Space style={{ width: '100%', marginTop: 8 }}>
              <Input
                placeholder="相对路径（如 content/chapters）"
                value={newIncludeDir}
                onChange={e => setNewIncludeDir(e.target.value)}
                onPressEnter={addIncludeDir}
                style={{ flex: 1 }}
              />
              <Button
                icon={<FolderOutlined />}
                onClick={() => openDirPicker('include')}
                disabled={!currentProject}
                title={currentProject ? '从项目中选择目录' : '请先打开项目'}
              >
                选择
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={addIncludeDir}>
                添加
              </Button>
            </Space>
          </div>

          <Divider />

          <div className={styles.section}>
            <h4>排除目录</h4>
            <p className={styles.hint}>
              这些目录下的文件不会进行高亮。使用相对于项目根目录的路径。
            </p>
            <div className={styles.tagList}>
              {config.scope.excludeDirectories.map(dir => (
                <Tag
                  key={dir}
                  closable
                  onClose={() => removeExcludeDir(dir)}
                  icon={<FolderOutlined />}
                >
                  {dir}
                </Tag>
              ))}
            </div>
            <Space style={{ width: '100%', marginTop: 8 }}>
              <Input
                placeholder="相对路径（如 node_modules）"
                value={newExcludeDir}
                onChange={e => setNewExcludeDir(e.target.value)}
                onPressEnter={addExcludeDir}
                style={{ flex: 1 }}
              />
              <Button
                icon={<FolderOutlined />}
                onClick={() => openDirPicker('exclude')}
                disabled={!currentProject}
                title={currentProject ? '从项目中选择目录' : '请先打开项目'}
              >
                选择
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={addExcludeDir}>
                添加
              </Button>
            </Space>
          </div>

          <Divider />

          <div className={styles.section}>
            <h4>排除文件类型</h4>
            <p className={styles.hint}>这些扩展名的文件不会进行高亮</p>
            <div className={styles.tagList}>
              {config.scope.excludeExtensions.map(ext => (
                <Tag key={ext} closable onClose={() => removeExcludeExt(ext)}>
                  .{ext}
                </Tag>
              ))}
            </div>
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <Input
                placeholder="输入扩展名（如 json5）"
                value={newExcludeExt}
                onChange={e => setNewExcludeExt(e.target.value)}
                onPressEnter={addExcludeExt}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={addExcludeExt}>
                添加
              </Button>
            </Space.Compact>
          </div>
        </Card>

        {/* 匹配设置 */}
        <Card title="匹配设置" className={baseStyles.card}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="matchMode" label="匹配模式">
                <Select>
                  <Option value="wholeWord">全词匹配</Option>
                  <Option value="partial">部分匹配</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="caseSensitive" label="区分大小写" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="matchAliases" label="匹配别名" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        {/* 样式设置 */}
        <Card title="样式设置" className={baseStyles.card}>
          <p className={styles.hint}>
            配置词汇高亮的显示样式。文字颜色将使用词汇条目中设置的颜色。
          </p>
          <div className={styles.styleOptions}>
            <Form.Item name="showTextColor" valuePropName="checked">
              <Checkbox>文字颜色（使用词汇的颜色）</Checkbox>
            </Form.Item>
            <Form.Item name="showBold" valuePropName="checked">
              <Checkbox>粗体</Checkbox>
            </Form.Item>
            <Form.Item name="showItalic" valuePropName="checked">
              <Checkbox>斜体</Checkbox>
            </Form.Item>
            <Form.Item name="showUnderline" valuePropName="checked">
              <Checkbox>下划线</Checkbox>
            </Form.Item>
          </div>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const showUnderline = getFieldValue('showUnderline')
              if (!showUnderline) return null
              return (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="underlineWidth" label="下划线粗细 (px)">
                      <InputNumber min={1} max={5} step={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="underlineStyle" label="下划线样式">
                      <Select>
                        <Option value="solid">实线</Option>
                        <Option value="dashed">虚线</Option>
                        <Option value="dotted">点线</Option>
                        <Option value="wavy">波浪线</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              )
            }}
          </Form.Item>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="showHoverTooltip" label="显示悬浮提示" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hoverDelay" label="悬浮延迟 (ms)">
                <InputNumber min={0} max={2000} step={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 性能设置 */}
        <Card title="性能设置" className={baseStyles.card}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="largeFileThreshold" label="大文件阈值 (字节)">
                <InputNumber
                  min={100 * 1024}
                  max={10 * 1024 * 1024}
                  step={100 * 1024}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="disableOnLargeFile" label="大文件禁用高亮" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="updateDebounce" label="更新防抖 (ms)">
                <InputNumber min={0} max={1000} step={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxHighlights" label="最大高亮数量">
                <InputNumber min={100} max={50000} step={500} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 敏感词颜色设置 */}
        <Card title="敏感词颜色" className={baseStyles.card}>
          <p className={styles.hint}>按严重程度设置敏感词的高亮颜色</p>
          <Row gutter={[16, 16]}>
            {Object.entries(config.match.sensitiveWordColors).map(([severity, color]) => (
              <Col span={12} key={severity}>
                <div className={styles.colorRow}>
                  <span className={styles.colorLabel}>
                    {severity === 'low' && '低'}
                    {severity === 'medium' && '中'}
                    {severity === 'high' && '高'}
                    {severity === 'critical' && '严重'}
                  </span>
                  <ColorPicker
                    value={color}
                    onChange={value => {
                      const newColors = {
                        ...config.match.sensitiveWordColors,
                        [severity]: typeof value === 'string' ? value : value.toHexString()
                      }
                      saveConfig({
                        match: {
                          ...config.match,
                          sensitiveWordColors: newColors
                        }
                      })
                    }}
                    showText
                  />
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 悬浮卡片配置 */}
        <Card title="悬浮卡片配置" className={baseStyles.card}>
          <p className={styles.hint}>
            配置悬浮时显示的词汇详细信息。可以为每种词汇类型单独设置显示的字段。
          </p>

          <Collapse
            items={vocabTypes.map(vocabType => {
              const typeConfig = config.hoverCard?.typeConfigs?.find(
                (c: HoverCardTypeConfig) => c.typeId === vocabType.id
              ) || { typeId: vocabType.id, fields: ['name', 'type'] }

              return {
                key: vocabType.id,
                label: (
                  <Space>
                    <span style={{ color: vocabType.color }}>●</span>
                    <span>{vocabType.name}</span>
                  </Space>
                ),
                children: (
                  <div>
                    <p className={styles.hint}>选择悬浮卡片中显示的字段：</p>
                    <Checkbox.Group
                      value={typeConfig.fields}
                      onChange={checkedValues => {
                        const newTypeConfigs = [
                          ...(config.hoverCard?.typeConfigs?.filter(
                            (c: HoverCardTypeConfig) => c.typeId !== vocabType.id
                          ) || []),
                          {
                            typeId: vocabType.id,
                            fields: checkedValues as string[]
                          }
                        ]
                        updateHoverCardConfig({
                          ...config.hoverCard,
                          typeConfigs: newTypeConfigs
                        })
                      }}
                      style={{ width: '100%' }}
                    >
                      <Row gutter={[8, 8]}>
                        <Col span={8}>
                          <Checkbox value="name">名称</Checkbox>
                        </Col>
                        <Col span={8}>
                          <Checkbox value="type">类型</Checkbox>
                        </Col>
                        <Col span={8}>
                          <Checkbox value="description">描述</Checkbox>
                        </Col>
                        <Col span={8}>
                          <Checkbox value="aliases">别名</Checkbox>
                        </Col>
                        <Col span={8}>
                          <Checkbox value="tags">标签</Checkbox>
                        </Col>
                        <Col span={8}>
                          <Checkbox value="color">颜色</Checkbox>
                        </Col>
                        {vocabType.fields
                          .filter(
                            field =>
                              !['name', 'type', 'description', 'aliases', 'tags', 'color'].includes(
                                field.id
                              )
                          )
                          .map(field => (
                            <Col span={8} key={field.id}>
                              <Checkbox value={field.id}>{field.name}</Checkbox>
                            </Col>
                          ))}
                      </Row>
                    </Checkbox.Group>
                  </div>
                )
              }
            })}
          />
        </Card>
      </Form>

      {/* 目录选择器弹窗 */}
      <Modal
        title={`选择${dirPickerTarget === 'include' ? '包含' : '排除'}目录`}
        open={dirPickerOpen}
        onCancel={() => setDirPickerOpen(false)}
        footer={null}
        width={400}
      >
        <p style={{ marginBottom: 12, color: '#666' }}>
          点击选择要{dirPickerTarget === 'include' ? '包含' : '排除'}的目录
        </p>
        {loadingDirs ? (
          <div style={{ textAlign: 'center', padding: 24 }}>加载中...</div>
        ) : projectDirs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
            {currentProject ? '项目中没有目录' : '请先打开项目'}
          </div>
        ) : (
          <Tree showIcon treeData={projectDirs} onSelect={handleDirSelect} defaultExpandAll />
        )}
      </Modal>
    </div>
  )
}

export default HighlightSettings
