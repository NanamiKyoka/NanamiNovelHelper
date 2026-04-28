/**
 * 搜索替换面板组件 - 参考51mazi实现
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input, Button, Typography } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons'
import type { Editor } from '@tiptap/react'
import styles from './EditorToolbar.module.css'

const { Text } = Typography

interface MatchInfo {
  from: number
  to: number
  text: string
}

interface SearchReplacePanelProps {
  editor: Editor | null
  visible: boolean
  onClose: () => void
}

// 清除所有高亮（不记录历史）
function clearAllHighlights(editor: Editor) {
  const { view, state } = editor
  const { tr, doc, schema } = state
  const highlightMark = schema.marks.highlight

  if (!highlightMark) return

  // 移除文档中所有高亮标记
  doc.descendants((node, pos) => {
    if (node.marks) {
      node.marks.forEach(mark => {
        if (mark.type === highlightMark) {
          tr.removeMark(pos, pos + node.nodeSize, highlightMark)
        }
      })
    }
  })

  tr.setMeta('addToHistory', false)
  view.dispatch(tr)
}

// 批量添加高亮（不记录历史）
function addHighlightMarks(editor: Editor, matches: MatchInfo[], currentIndex: number) {
  const { view, state } = editor
  const { tr, schema } = state
  const highlightMark = schema.marks.highlight

  if (!highlightMark) return

  matches.forEach((match, index) => {
    const mark = highlightMark.create({
      color: index === currentIndex ? '#409eff' : '#ffeb3b'
    })
    tr.addMark(match.from, match.to, mark)
  })

  tr.setMeta('addToHistory', false)
  view.dispatch(tr)
}

export function SearchReplacePanel({ editor, visible, onClose }: SearchReplacePanelProps) {
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matches, setMatches] = useState<MatchInfo[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showReplace, setShowReplace] = useState(false)
  const searchInputRef = useRef<any>(null)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 总匹配数
  const totalMatches = matches.length

  // 清除视觉高亮（不记录历史）
  const clearVisualHighlights = useCallback(() => {
    if (!editor) return
    clearAllHighlights(editor)
  }, [editor])

  // 重置所有状态
  const resetAllState = useCallback(() => {
    setSearchText('')
    setReplaceText('')
    setMatches([])
    setCurrentIndex(-1)
    setShowReplace(false)
    clearVisualHighlights()
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
      searchTimerRef.current = null
    }
  }, [clearVisualHighlights])

  // 查找文本匹配项
  const findTextMatches = useCallback((): MatchInfo[] => {
    if (!editor || !searchText.trim()) return []

    const { doc } = editor.state
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    const pattern = escapeRegExp(searchText)
    const searchRegex = new RegExp(pattern, 'gi')
    const foundMatches: MatchInfo[] = []

    doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text || ''
        let match
        searchRegex.lastIndex = 0

        while ((match = searchRegex.exec(text)) !== null) {
          foundMatches.push({
            from: pos + match.index,
            to: pos + match.index + match[0].length,
            text: match[0]
          })
        }
      }
    })

    return foundMatches
  }, [editor, searchText])

  // 执行搜索
  const performSearch = useCallback(() => {
    if (!editor) return

    if (!searchText.trim()) {
      clearVisualHighlights()
      setMatches([])
      setCurrentIndex(-1)
      return
    }

    const foundMatches = findTextMatches()
    setMatches(foundMatches)
    setCurrentIndex(foundMatches.length > 0 ? 0 : -1)

    if (foundMatches.length > 0) {
      // 先清除所有高亮
      clearAllHighlights(editor)

      // 添加高亮
      addHighlightMarks(editor, foundMatches, 0)

      // 设置当前选中并滚动
      editor.commands.setTextSelection({
        from: foundMatches[0].from,
        to: foundMatches[0].to
      })
      editor.commands.scrollIntoView()
    }

    // 保持搜索框焦点
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)
  }, [editor, searchText, findTextMatches, clearVisualHighlights])

  // 输入变化时防抖搜索
  const onSearchInput = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    if (searchText.trim()) {
      searchTimerRef.current = setTimeout(() => {
        performSearch()
      }, 300)
    } else {
      clearVisualHighlights()
      setMatches([])
      setCurrentIndex(-1)
    }
  }, [searchText, performSearch, clearVisualHighlights])

  // 监听搜索文本变化
  useEffect(() => {
    onSearchInput()
  }, [searchText])

  // 面板可见性变化
  useEffect(() => {
    if (visible) {
      resetAllState()
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 0)
    } else {
      resetAllState()
    }
  }, [visible, resetAllState])

  // 查找下一个
  const findNext = useCallback(() => {
    if (totalMatches === 0 || !editor) return
    const nextIndex = (currentIndex + 1) % totalMatches
    setCurrentIndex(nextIndex)

    // 更新高亮
    clearAllHighlights(editor)
    addHighlightMarks(editor, matches, nextIndex)

    // 设置当前选中
    editor.commands.setTextSelection({
      from: matches[nextIndex].from,
      to: matches[nextIndex].to
    })
    editor.commands.scrollIntoView()

    // 保持搜索框焦点
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)
  }, [editor, matches, totalMatches, currentIndex])

  // 查找上一个
  const findPrev = useCallback(() => {
    if (totalMatches === 0 || !editor) return
    const prevIndex = currentIndex <= 0 ? totalMatches - 1 : currentIndex - 1
    setCurrentIndex(prevIndex)

    // 更新高亮
    clearAllHighlights(editor)
    addHighlightMarks(editor, matches, prevIndex)

    // 设置当前选中
    editor.commands.setTextSelection({
      from: matches[prevIndex].from,
      to: matches[prevIndex].to
    })
    editor.commands.scrollIntoView()

    // 保持搜索框焦点
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)
  }, [editor, matches, totalMatches, currentIndex])

  // 替换当前
  const replaceCurrent = useCallback(() => {
    if (totalMatches === 0 || currentIndex === -1) return

    const currentMatch = matches[currentIndex]
    if (!currentMatch || !editor) return

    // 确保编辑器获得焦点进行替换
    editor.commands.focus()
    editor.commands.setTextSelection({
      from: currentMatch.from,
      to: currentMatch.to
    })
    editor.commands.insertContent(replaceText || '')

    // 重新搜索
    setTimeout(() => {
      performSearch()
    }, 0)
  }, [editor, matches, currentIndex, totalMatches, replaceText, performSearch])

  // 全部替换
  const replaceAll = useCallback(() => {
    if (totalMatches === 0 || !editor) return

    // 从后往前替换
    const sortedMatches = [...matches].sort((a, b) => b.from - a.from)

    editor.commands.focus()

    sortedMatches.forEach(match => {
      editor.commands.setTextSelection({
        from: match.from,
        to: match.to
      })
      editor.commands.insertContent(replaceText || '')
    })

    // 清空
    clearVisualHighlights()
    setMatches([])
    setCurrentIndex(-1)
  }, [editor, matches, totalMatches, replaceText, clearVisualHighlights])

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (totalMatches > 0) {
        findNext()
      } else {
        performSearch()
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 0)
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!visible) return null

  return (
    <div className={styles.searchPanel}>
      {/* 展开/收起按钮 */}
      <div className={styles.searchToggle}>
        <Button type="text" size="small" onClick={() => setShowReplace(!showReplace)}>
          <RightOutlined
            style={{
              transition: 'transform 0.2s',
              transform: showReplace ? 'rotate(90deg)' : 'none'
            }}
          />
        </Button>
      </div>

      {/* 内容区域 */}
      <div className={styles.searchContent}>
        {/* 搜索行 */}
        <div className={styles.searchRow}>
          <Input
            ref={searchInputRef}
            placeholder="查找"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            style={{ width: 180 }}
          />
          <Button size="small" disabled={!searchText.trim()} onClick={performSearch}>
            搜索
          </Button>
          <div className={styles.searchResults}>
            {totalMatches > 0 ? (
              <Text>
                {currentIndex + 1}/{totalMatches}
              </Text>
            ) : (
              <Text type="secondary">无结果</Text>
            )}
          </div>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={totalMatches === 0}
            onClick={findPrev}
            title="上一个"
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={totalMatches === 0}
            onClick={findNext}
            title="下一个"
          />
          <Button size="small" icon={<CloseOutlined />} onClick={onClose} title="关闭" />
        </div>

        {/* 替换行 */}
        {showReplace && (
          <div className={styles.replaceRow}>
            <Input
              placeholder="替换"
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              onKeyDown={handleKeyDown}
              size="small"
              style={{ width: 180 }}
            />
            <Button size="small" disabled={totalMatches === 0} onClick={replaceCurrent}>
              替换
            </Button>
            <Button size="small" disabled={totalMatches === 0} onClick={replaceAll}>
              全部替换
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchReplacePanel
