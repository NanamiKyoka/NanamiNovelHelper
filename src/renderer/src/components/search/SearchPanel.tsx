/**
 * 搜索面板组件
 * 类似 VSCode 的侧边栏搜索功能
 */

import { useState, useCallback } from 'react'
import { Input, Button, Typography, Empty, Tag, Space, Tooltip, Spin, App } from 'antd'
import { SearchOutlined, ReloadOutlined, FileOutlined } from '@ant-design/icons'
import { useEditorStore } from '@stores/editorStore'
import styles from './SearchPanel.module.css'

const { Text } = Typography

// 搜索结果类型（与后端保持一致）
interface SearchMatch {
  line: number
  column: number
  matchText: string
  lineText: string
  contextBefore: string
  contextAfter: string
}

interface FileSearchResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

interface SearchResult {
  success: boolean
  results: FileSearchResult[]
  totalMatches: number
  filesSearched: number
  error?: string
}

function SearchPanel(): JSX.Element {
  const { message } = App.useApp()
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [filesToInclude, setFilesToInclude] = useState('')
  const [filesToExclude, setFilesToExclude] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<FileSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [totalMatches, setTotalMatches] = useState(0)
  const [filesSearched, setFilesSearched] = useState(0)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const openFile = useEditorStore(state => state.openFile)
  const requestGoToPosition = useEditorStore(state => state.requestGoToPosition)
  const requestExternalRefresh = useEditorStore(state => state.requestExternalRefresh)

  // 执行搜索
  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) {
      setResults([])
      setTotalMatches(0)
      return
    }

    setIsSearching(true)
    setResults([])
    setExpandedFiles(new Set())

    try {
      const result: SearchResult = await window.electron.search.search({
        query: searchText,
        caseSensitive,
        wholeWord,
        useRegex,
        filesToInclude,
        filesToExclude,
        maxResults: 2000
      })

      if (result.success) {
        setResults(result.results)
        setTotalMatches(result.totalMatches)
        setFilesSearched(result.filesSearched)
        // 默认展开所有有结果的文件
        setExpandedFiles(new Set(result.results.map(r => r.filePath)))
      } else {
        message.error(result.error || '搜索失败')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '搜索失败')
    } finally {
      setIsSearching(false)
    }
  }, [searchText, caseSensitive, wholeWord, useRegex, filesToInclude, filesToExclude, message])

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  // 点击搜索结果跳转到编辑器
  const handleMatchClick = useCallback(
    async (filePath: string, matchText: string, matchIndex: number) => {
      try {
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath
        await openFile(filePath, fileName)
        setTimeout(() => {
          requestGoToPosition(filePath, matchText, matchIndex)
        }, 50)
      } catch (error) {
        console.error('[SearchPanel] 打开文件失败:', error)
        message.error('打开文件失败')
      }
    },
    [openFile, requestGoToPosition, message]
  )

  // 切换文件展开/折叠
  const toggleFileExpand = (filePath: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filePath)) {
        next.delete(filePath)
      } else {
        next.add(filePath)
      }
      return next
    })
  }

  // 替换全部
  const handleReplaceAll = useCallback(async () => {
    if (!searchText.trim() || results.length === 0) return

    try {
      let totalReplacements = 0
      const replacedFiles: string[] = []

      for (const file of results) {
        const result = await window.electron.search.replace(
          file.filePath,
          searchText,
          replaceText,
          {
            caseSensitive,
            wholeWord,
            useRegex,
            replaceAll: true
          }
        )
        if (result.success && result.replacements) {
          totalReplacements += result.replacements
          replacedFiles.push(file.filePath)
        }
      }

      message.success(`已替换 ${totalReplacements} 处`)

      // 通知编辑器刷新已打开的文件
      for (const filePath of replacedFiles) {
        requestExternalRefresh(filePath)
      }

      // 重新搜索以更新结果
      handleSearch()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '替换失败')
    }
  }, [
    searchText,
    replaceText,
    results,
    caseSensitive,
    wholeWord,
    useRegex,
    handleSearch,
    requestExternalRefresh,
    message
  ])

  return (
    <div className={styles.container}>
      {/* 搜索输入区 */}
      <div className={styles.searchSection}>
        <div className={styles.inputRow}>
          <Input
            placeholder="搜索"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            prefix={<SearchOutlined className={styles.inputIcon} />}
            suffix={
              <Space size={0}>
                <Tooltip title="区分大小写">
                  <Button
                    type={caseSensitive ? 'primary' : 'text'}
                    size="small"
                    className={styles.toggleBtn}
                    onClick={() => setCaseSensitive(!caseSensitive)}
                  >
                    Aa
                  </Button>
                </Tooltip>
                <Tooltip title="全词匹配">
                  <Button
                    type={wholeWord ? 'primary' : 'text'}
                    size="small"
                    className={styles.toggleBtn}
                    onClick={() => setWholeWord(!wholeWord)}
                  >
                    ab|
                  </Button>
                </Tooltip>
                <Tooltip title="使用正则表达式">
                  <Button
                    type={useRegex ? 'primary' : 'text'}
                    size="small"
                    className={styles.toggleBtn}
                    onClick={() => setUseRegex(!useRegex)}
                  >
                    .*
                  </Button>
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
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? styles.activeBtn : ''}
            >
              ⋯
            </Button>
          </Tooltip>
        </div>

        {/* 替换输入 */}
        {showReplace && (
          <div className={styles.inputRow}>
            <Input
              placeholder="替换为..."
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              className={styles.searchInput}
            />
            <Tooltip title="替换全部">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleReplaceAll}
                disabled={results.length === 0}
              />
            </Tooltip>
          </div>
        )}

        {/* 文件筛选 */}
        {showFilters && (
          <div className={styles.filtersSection}>
            <Input
              placeholder="要包含的文件 (例如: *.md, src/**)"
              value={filesToInclude}
              onChange={e => setFilesToInclude(e.target.value)}
              className={styles.filterInput}
            />
            <Input
              placeholder="要排除的文件 (例如: node_modules/**)"
              value={filesToExclude}
              onChange={e => setFilesToExclude(e.target.value)}
              className={styles.filterInput}
            />
          </div>
        )}
      </div>

      {/* 搜索结果 */}
      <div className={styles.resultsSection}>
        {isSearching ? (
          <div className={styles.loading}>
            <Spin size="small" />
            <Text type="secondary" style={{ marginLeft: 8 }}>
              搜索中...
            </Text>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className={styles.resultsHeader}>
              <Text type="secondary">
                {totalMatches} 个结果，在 {results.length} 个文件中（已搜索 {filesSearched} 个文件）
              </Text>
            </div>
            <div className={styles.resultsList}>
              {results.map(file => (
                <div key={file.filePath} className={styles.fileGroup}>
                  <div
                    className={styles.fileHeader}
                    onClick={() => toggleFileExpand(file.filePath)}
                  >
                    <span className={styles.expandIcon}>
                      {expandedFiles.has(file.filePath) ? '▼' : '▶'}
                    </span>
                    <FileOutlined className={styles.fileIcon} />
                    <Text ellipsis className={styles.fileName}>
                      {file.filePath}
                    </Text>
                    <Tag className={styles.matchCount}>{file.matches.length}</Tag>
                  </div>
                  {expandedFiles.has(file.filePath) && (
                    <div className={styles.matchesList}>
                      {file.matches.map((match, idx) => (
                        <div
                          key={idx}
                          className={styles.matchItem}
                          onClick={() => handleMatchClick(file.filePath, match.matchText, idx)}
                        >
                          <Text type="secondary" className={styles.lineNumber}>
                            {match.line}
                          </Text>
                          <div className={styles.matchContent}>
                            <Text className={styles.matchText}>
                              {match.contextBefore}
                              <span className={styles.matchHighlight}>{match.matchText}</span>
                              {match.contextAfter}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : searchText ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="未找到结果"
            className={styles.empty}
          />
        ) : (
          <div className={styles.placeholder}>
            <Text type="secondary">输入搜索内容后按 Enter 开始搜索</Text>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPanel
