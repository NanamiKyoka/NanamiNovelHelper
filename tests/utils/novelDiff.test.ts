import { describe, it, expect } from 'vitest'
import { parseHtmlToBlocks, alignBlocks, computeWordDiff, HtmlBlock } from '@utils/novelDiff'

describe('parseHtmlToBlocks', () => {
  it('应该按 p、h1-h6、div、blockquote、li 等块级标签分割 HTML', () => {
    const blocks = parseHtmlToBlocks('<p>第一段</p><p>第二段</p>')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].tag).toBe('p')
    expect(blocks[0].text).toBe('第一段')
    expect(blocks[1].tag).toBe('p')
    expect(blocks[1].text).toBe('第二段')
  })

  it('应该过滤非块级标签（如 span、em、strong 等内联标签不作为独立 block）', () => {
    const blocks = parseHtmlToBlocks('<span>这是一个 span</span><p>这是一个段落</p>')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].tag).toBe('p')
    expect(blocks[0].text).toBe('这是一个段落')
  })

  it('应该正确识别 hasInlineTags', () => {
    const blocks = parseHtmlToBlocks('<p>纯文本段落</p><p><strong>带粗体的段落</strong></p>')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].hasInlineTags).toBe(false)
    expect(blocks[1].hasInlineTags).toBe(true)
  })

  it('应该在没有任何块级标签时将整个 body 作为一个 div block', () => {
    const blocks = parseHtmlToBlocks('纯文本内容')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].tag).toBe('div')
    expect(blocks[0].text).toBe('纯文本内容')
  })

  it('应该提取正确的 text 和 html', () => {
    const blocks = parseHtmlToBlocks('<p>Hello <strong>world</strong></p>')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('Hello world')
    expect(blocks[0].html).toBe('<p>Hello <strong>world</strong></p>')
  })
})

describe('alignBlocks', () => {
  it('应该将完全相同的段落标记为 unchanged', () => {
    const oldBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false },
      { tag: 'p', html: '<p>段落B</p>', text: '段落B', hasInlineTags: false }
    ]
    const newBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false },
      { tag: 'p', html: '<p>段落B</p>', text: '段落B', hasInlineTags: false }
    ]
    const result = alignBlocks(oldBlocks, newBlocks)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('unchanged')
    expect(result[1].type).toBe('unchanged')
  })

  it('应该将删除的段落标记为 deleted', () => {
    const oldBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false },
      { tag: 'p', html: '<p>段落B</p>', text: '段落B', hasInlineTags: false }
    ]
    const newBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false }
    ]
    const result = alignBlocks(oldBlocks, newBlocks)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('unchanged')
    expect(result[1].type).toBe('deleted')
  })

  it('应该将新增的段落标记为 added', () => {
    const oldBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false }
    ]
    const newBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false },
      { tag: 'p', html: '<p>段落B</p>', text: '段落B', hasInlineTags: false }
    ]
    const result = alignBlocks(oldBlocks, newBlocks)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('unchanged')
    expect(result[1].type).toBe('added')
  })

  it('应该将修改的段落标记为 modified', () => {
    const oldBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false },
      { tag: 'p', html: '<p>段落B</p>', text: '段落B', hasInlineTags: false }
    ]
    const newBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false },
      { tag: 'p', html: '<p>段落B修改</p>', text: '段落B修改', hasInlineTags: false }
    ]
    const result = alignBlocks(oldBlocks, newBlocks)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('unchanged')
    expect(result[1].type).toBe('modified')
  })

  it('应该正确处理混合场景（删除+新增+修改）', () => {
    const oldBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>A</p>', text: 'A', hasInlineTags: false },
      { tag: 'p', html: '<p>B</p>', text: 'B', hasInlineTags: false },
      { tag: 'p', html: '<p>C</p>', text: 'C', hasInlineTags: false }
    ]
    const newBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>A</p>', text: 'A', hasInlineTags: false },
      { tag: 'p', html: '<p>C修改</p>', text: 'C修改', hasInlineTags: false },
      { tag: 'p', html: '<p>D</p>', text: 'D', hasInlineTags: false }
    ]
    const result = alignBlocks(oldBlocks, newBlocks)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('unchanged')
    expect(result[0].oldBlock!.text).toBe('A')
    expect(result[1].type).toBe('modified')
    expect(result[1].oldBlock!.text).toBe('B')
    expect(result[1].newBlock!.text).toBe('C修改')
    expect(result[2].type).toBe('modified')
    expect(result[2].oldBlock!.text).toBe('C')
    expect(result[2].newBlock!.text).toBe('D')
  })

  it('应该使用 trim 后的 text 进行相等比较', () => {
    const oldBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p> 段落A </p>', text: ' 段落A ', hasInlineTags: false }
    ]
    const newBlocks: HtmlBlock[] = [
      { tag: 'p', html: '<p>段落A</p>', text: '段落A', hasInlineTags: false }
    ]
    const result = alignBlocks(oldBlocks, newBlocks)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('unchanged')
  })
})

describe('computeWordDiff', () => {
  it('应该正确计算字符级差异', () => {
    const parts = computeWordDiff('她看着窗外', '她望向窗外')
    expect(parts).toEqual([
      { type: 'unchanged', text: '她' },
      { type: 'removed', text: '看着' },
      { type: 'added', text: '望向' },
      { type: 'unchanged', text: '窗外' }
    ])
  })

  it('应该合并连续的同类型差异', () => {
    const parts = computeWordDiff('abc', 'axc')
    expect(parts).toEqual([
      { type: 'unchanged', text: 'a' },
      { type: 'removed', text: 'b' },
      { type: 'added', text: 'x' },
      { type: 'unchanged', text: 'c' }
    ])
  })

  it('应该过滤仅空白字符的差异', () => {
    const parts = computeWordDiff('Hello world', 'Hello  world')
    expect(parts.some(p => (p.type === 'added' || p.type === 'removed') && p.text.trim().length === 0)).toBe(false)
  })

  it('应该处理完全相同的文本', () => {
    const parts = computeWordDiff('完全相同', '完全相同')
    expect(parts).toHaveLength(1)
    expect(parts[0]).toEqual({ type: 'unchanged', text: '完全相同' })
  })

  it('应该处理完全替换的文本', () => {
    const parts = computeWordDiff('旧文本', '新文本')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toEqual({ type: 'removed', text: '旧' })
    expect(parts[1]).toEqual({ type: 'added', text: '新' })
    expect(parts[2]).toEqual({ type: 'unchanged', text: '文本' })
  })
})
