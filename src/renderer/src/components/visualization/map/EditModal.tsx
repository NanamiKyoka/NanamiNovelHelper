import { useState, useEffect, useMemo } from 'react'
import { Modal, Form, Input, ColorPicker, App } from 'antd'
import { Color } from 'antd/es/color-picker'
import * as Icons from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { IconPicker } from './IconPicker'
import { CHUNK_TYPE_CONFIG, ELEMENT_TYPE_CONFIG } from '@renderer/types/map'
import type { Chunk, MapElement } from '@renderer/types/map'
import styles from './EditModal.module.css'

interface EditModalProps {
  type: 'chunk' | 'element'
  item: Chunk | MapElement | undefined
  onClose: () => void
}

export function EditModal({ type, item, onClose }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const updateChunk = useMapStore(state => state.updateChunk)
  const updateElement = useMapStore(state => state.updateElement)

  const [selectedIcon, setSelectedIcon] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')

  const isChunk = type === 'chunk'
  const config = isChunk ? CHUNK_TYPE_CONFIG : ELEMENT_TYPE_CONFIG

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        name: item.name,
        description: item.description,
        typeName: isChunk
          ? (item as Chunk).chunkType === 'custom'
            ? (item as Chunk).customTypeName || ''
            : ''
          : (item as MapElement).elementType === 'custom'
            ? (item as MapElement).customTypeName || ''
            : ''
      })
      setSelectedIcon(item.icon || '')
      setSelectedColor(item.color || '')
    }
  }, [item, form, isChunk])

  const currentType = useMemo(() => {
    if (!item) return null
    return isChunk ? (item as Chunk).chunkType : (item as MapElement).elementType
  }, [item, isChunk])

  const isCustomType = currentType === 'custom'

  const IconComponent = useMemo(() => {
    const iconName =
      selectedIcon || (currentType ? config[currentType as keyof typeof config]?.icon : '')
    return (
      (Icons as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>)[iconName] ||
      Icons.QuestionCircleOutlined
    )
  }, [selectedIcon, currentType, config])

  const handleColorChange = (color: Color) => {
    setSelectedColor(color.toHexString())
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      if (isChunk) {
        updateChunk((item as Chunk).id, {
          name: values.name,
          description: values.description,
          icon: selectedIcon,
          color: selectedColor,
          customTypeName: isCustomType ? values.typeName : undefined
        })
      } else {
        updateElement((item as MapElement).id, {
          name: values.name,
          description: values.description,
          icon: selectedIcon,
          color: selectedColor,
          customTypeName: isCustomType ? values.typeName : undefined
        })
      }

      message.success('已保存')
      onClose()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  if (!item) return null

  return (
    <Modal
      title={isChunk ? '编辑板块' : '编辑元素'}
      open={true}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      width={500}
      className={styles.editModal}
    >
      <Form form={form} layout="vertical" className={styles.form}>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="输入名称" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea placeholder="输入描述（可选）" rows={3} />
        </Form.Item>

        {isCustomType && (
          <Form.Item
            name="typeName"
            label="自定义类型名称"
            rules={[{ required: true, message: '请输入自定义类型名称' }]}
          >
            <Input placeholder="输入自定义类型名称" />
          </Form.Item>
        )}

        <Form.Item label="图标">
          <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
        </Form.Item>

        <Form.Item label="颜色">
          <div className={styles.colorPickerRow}>
            <ColorPicker value={selectedColor} onChange={handleColorChange} showText format="hex" />
            <div className={styles.colorPreview} style={{ backgroundColor: selectedColor }}>
              <IconComponent style={{ fontSize: 20, color: getContrastColor(selectedColor) }} />
            </div>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) || 0
  const g = parseInt(hex.substring(2, 4), 16) || 0
  const b = parseInt(hex.substring(4, 6), 16) || 0
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
