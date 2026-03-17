/**
 * 搜索面板组件
 * 类似 VSCode 的侧边栏搜索功能
 */

import { useState, useCallback } from 'react'
import { Input, Button, Select, Typography, Empty, List, Tag, Space, Tooltip } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  CloseOutlined,
  FileOutlined,
  FolderOutlined
} from '@ant-design/icons'
import styles from './SearchPanel.module.css'

const { Text, Paragraph } = Typography

interface SearchResult {
  id: string
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

interface SearchMatch {
  line: number
  column: number
  text: string
  highlightText: string
}

// 模拟搜索结果
const mockResults: SearchResult[] = []

function SearchPanel(): JSX.Element {
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [filesToInclude, setFilesToInclude] = useState('')
  const [filesToExclude, setFilesToExclude] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<SearchResult[]>(mockResults)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = useCallback(() => {
    if (!searchText.trim()) {
      setResults([])
      return
    }
    
    setIsSearching(true)
    // TODO: 实现实际搜索逻辑
    setTimeout(() => {
      setIsSearching(false)
      setResults([])
    }, 500)
  }, [searchText])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0)

  return (
    <div className={styles.container}>
      {/* 搜索输入区 */}
      <div className={styles.searchSection}>
        <div className={styles.inputRow}>
          <Input
            placeholder="搜索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            prefix={<SearchOutlined className={styles.inputIcon} />}
            suffix={
              <Space size={0}>
                <Tooltip title="区分大小写">
                  <Button
                    type={caseSensitive ? 'primary' : 'text'}
                    size="small"
                    icon="Aa"
                    className={styles.toggleBtn}
                    onClick={() => setCaseSensitive(!caseSensitive)}
                  />
                </Tooltip>
                <Tooltip title="全词匹配">
                  <Button
                    type={wholeWord ? 'primary' : 'text'}
                    size="small"
                    icon="ab|"
                    className={styles.toggleBtn}
                    onClick={() => setWholeWord(!wholeWord)}
                  />
                </Tooltip>
                <Tooltip title="使用正则表达式">
                  <Button
                    type={useRegex ? 'primary' : 'text'}
                    size="small"
                    icon=".*"
                    className={styles.toggleBtn}
                    onClick={() => setUseRegex(!useRegex)}
                  />
                </Tooltip>
              </Space>
            }
            className={styles.searchInput}
          />
          <Tooltip title="替换">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => setShowReplace(!showReplace)}
              className={showReplace ? styles.activeBtn : ''}
            />
          </Tooltip>
          <Tooltip title="更多筛选">
            <Button
              type="text"
              size="small"
              icon="⋯"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? styles.activeBtn : ''}
            />
          </Tooltip>
        </div>

        {/* 替换输入 */}
        {showReplace && (
          <div className={styles.inputRow}>
            <Input
              placeholder="替换"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className={styles.searchInput}
            />
            <Tooltip title="替换全部">
              <Button type="text" size="small" icon={<ReloadOutlined />} />
            </Tooltip>
          </div>
        )}

        {/* 文件筛选 */}
        {showFilters && (
          <div className={styles.filtersSection}>
            <Input
              placeholder="要包含的文件"
              value={filesToInclude}
              onChange={(e) => setFilesToInclude(e.target.value)}
              className={styles.filterInput}
            />
            <Input
              placeholder="要排除的文件"
              value={filesToExclude}
              onChange={(e) => setFilesToExclude(e.target.value)}
              className={styles.filterInput}
            />
          </div>
        )}
      </div>

      {/* 搜索结果 */}
      <div className={styles.resultsSection}>
        {isSearching ? (
          <div className={styles.loading}>搜索中...</div>
        ) : results.length > 0 ? (
          <>
            <div className={styles.resultsHeader}>
              <Text type="secondary">
                {totalMatches} 个结果，在 {results.length} 个文件中
              </Text>
            </div>
            <List
              dataSource={results}
              renderItem={(item) => (
                <List.Item className={styles.resultItem}>
                  <div className={styles.fileHeader}>
                    <FileOutlined />
                    <Text ellipsis className={styles.fileName}>
                      {item.fileName}
                    </Text>
                    <Tag>{item.matches.length}</Tag>
                  </div>
                  {item.matches.map((match, idx) => (
                    <div key={idx} className={styles.matchItem}>
                      <Text type="secondary" className={styles.lineNumber}>
                        {match.line}
                      </Text>
                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        className={styles.matchText}
                      >
                        {match.text}
                      </Paragraph>
                    </div>
                  ))}
                </List.Item>
              )}
            />
          </>
        ) : searchText ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="未找到结果"
            className={styles.empty}
          />
        ) : (
          <div className={styles.placeholder}>
            <Text type="secondary">
              输入搜索内容后按 Enter 开始搜索
            </Text>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPanel
