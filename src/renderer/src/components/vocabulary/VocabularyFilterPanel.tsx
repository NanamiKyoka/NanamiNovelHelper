import React from 'react'
import { Space, Select, Button } from 'antd'
import { ClearOutlined } from '@ant-design/icons'
import styles from './VocabularyPanel.module.css'

interface VocabularyFilterPanelProps {
  allTags: string[]
  allColors: string[]
  filterTags: string[]
  filterColor: string
  filterHasLinkedFile: boolean | null
  filterStarred: boolean | null
  activeFilterCount: number
  onFilterTagsChange: (tags: string[]) => void
  onFilterColorChange: (color: string) => void
  onFilterHasLinkedFileChange: (value: boolean | null) => void
  onFilterStarredChange: (value: boolean | null) => void
  onClearAll: () => void
}

const VocabularyFilterPanel: React.FC<VocabularyFilterPanelProps> = ({
  allTags,
  allColors,
  filterTags,
  filterColor,
  filterHasLinkedFile,
  filterStarred,
  activeFilterCount,
  onFilterTagsChange,
  onFilterColorChange,
  onFilterHasLinkedFileChange,
  onFilterStarredChange,
  onClearAll
}) => {
  return (
    <div className={styles.filterPanel}>
      <Space wrap size="middle">
        <div className={styles.filterItem}>
          <span className={styles.filterLabel}>标签：</span>
          <Select
            mode="multiple"
            placeholder="选择标签"
            value={filterTags}
            onChange={onFilterTagsChange}
            options={allTags.map(t => ({ value: t, label: t }))}
            style={{ minWidth: 150 }}
            allowClear
            size="small"
          />
        </div>

        <div className={styles.filterItem}>
          <span className={styles.filterLabel}>颜色：</span>
          <Select
            placeholder="选择颜色"
            value={filterColor || undefined}
            onChange={(v) => onFilterColorChange(v || '')}
            allowClear
            style={{ minWidth: 120 }}
            size="small"
          >
            {allColors.map(color => (
              <Select.Option key={color} value={color}>
                <Space>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
                  <span>{color}</span>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className={styles.filterItem}>
          <span className={styles.filterLabel}>关联文件：</span>
          <Select
            placeholder="选择"
            value={filterHasLinkedFile}
            onChange={onFilterHasLinkedFileChange}
            allowClear
            style={{ minWidth: 100 }}
            size="small"
          >
            <Select.Option value={true}>有关联</Select.Option>
            <Select.Option value={false}>无关联</Select.Option>
          </Select>
        </div>

        <div className={styles.filterItem}>
          <span className={styles.filterLabel}>收藏：</span>
          <Select
            placeholder="选择"
            value={filterStarred}
            onChange={onFilterStarredChange}
            allowClear
            style={{ minWidth: 100 }}
            size="small"
          >
            <Select.Option value={true}>已收藏</Select.Option>
            <Select.Option value={false}>未收藏</Select.Option>
          </Select>
        </div>

        {activeFilterCount > 0 && (
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={onClearAll}
          >
            清除筛选
          </Button>
        )}
      </Space>
    </div>
  )
}

export default VocabularyFilterPanel
