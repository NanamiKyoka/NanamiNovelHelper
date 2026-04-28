import { describe, it, expect } from 'vitest'
import { stripHtmlTags, stripHtmlTagsInline, isHtmlContent, isNovelFile } from '@utils/html'

describe('stripHtmlTags', () => {
  it('应该移除HTML标签', () => {
    expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello')
  })

  it('应该将<br>转换为换行符', () => {
    expect(stripHtmlTags('Line1<br>Line2')).toBe('Line1\nLine2')
  })

  it('应该将<br/>转换为换行符', () => {
    expect(stripHtmlTags('Line1<br/>Line2')).toBe('Line1\nLine2')
  })

  it('应该将</p>转换为换行符', () => {
    expect(stripHtmlTags('<p>Para1</p><p>Para2</p>')).toContain('\n')
  })

  it('应该将</div>转换为换行符', () => {
    expect(stripHtmlTags('<div>Block1</div><div>Block2</div>')).toContain('\n')
  })

  it('应该将</li>转换为换行符', () => {
    expect(stripHtmlTags('<li>Item1</li><li>Item2</li>')).toContain('\n')
  })

  it('应该将<li>转换为列表标记', () => {
    expect(stripHtmlTags('<li>Item</li>')).toContain('• Item')
  })

  it('应该解码HTML实体', () => {
    expect(stripHtmlTags('&amp;')).toBe('&')
    expect(stripHtmlTags('&lt;')).toBe('<')
    expect(stripHtmlTags('&gt;')).toBe('>')
    expect(stripHtmlTags('&quot;')).toBe('"')
    expect(stripHtmlTags('&#39;')).toBe("'")
    expect(stripHtmlTags('a&nbsp;b')).toContain('a')
    expect(stripHtmlTags('a&nbsp;b')).toContain('b')
  })

  it('应该合并多余的空行', () => {
    const result = stripHtmlTags('<p>A</p><p></p><p></p><p>B</p>')
    expect(result).not.toContain('\n\n\n')
  })

  it('纯文本应原样返回', () => {
    expect(stripHtmlTags('Hello World')).toBe('Hello World')
  })

  it('空字符串应返回空字符串', () => {
    expect(stripHtmlTags('')).toBe('')
  })

  it('应该处理标题标签', () => {
    const result = stripHtmlTags('<h1>Title</h1>')
    expect(result).toContain('Title')
    expect(result).not.toContain('<h1>')
  })

  it('应该处理blockquote标签', () => {
    const result = stripHtmlTags('<blockquote>Quote</blockquote>')
    expect(result).toContain('Quote')
    expect(result).not.toContain('<blockquote>')
  })
})

describe('stripHtmlTagsInline', () => {
  it('应该移除HTML标签但不添加换行', () => {
    expect(stripHtmlTagsInline('<b>bold</b> text')).toBe('bold text')
  })

  it('应该解码HTML实体', () => {
    expect(stripHtmlTagsInline('&amp;')).toBe('&')
    expect(stripHtmlTagsInline('&lt;')).toBe('<')
    expect(stripHtmlTagsInline('&gt;')).toBe('>')
    expect(stripHtmlTagsInline('&quot;')).toBe('"')
    expect(stripHtmlTagsInline('&#39;')).toBe("'")
    expect(stripHtmlTagsInline('&nbsp;')).toBe(' ')
  })

  it('纯文本应原样返回', () => {
    expect(stripHtmlTagsInline('Hello World')).toBe('Hello World')
  })

  it('空字符串应返回空字符串', () => {
    expect(stripHtmlTagsInline('')).toBe('')
  })
})

describe('isHtmlContent', () => {
  it('包含HTML标签时应返回true', () => {
    expect(isHtmlContent('<p>Hello</p>')).toBe(true)
    expect(isHtmlContent('<div>content</div>')).toBe(true)
    expect(isHtmlContent('Text with <b>bold</b>')).toBe(true)
  })

  it('纯文本应返回false', () => {
    expect(isHtmlContent('Hello World')).toBe(false)
    expect(isHtmlContent('')).toBe(false)
  })

  it('以<开头但不是标签的应返回false', () => {
    expect(isHtmlContent('< not a tag')).toBe(false)
    expect(isHtmlContent('3 < 5')).toBe(false)
  })

  it('自闭合标签应返回true', () => {
    expect(isHtmlContent('<br/>')).toBe(true)
    expect(isHtmlContent('<img src="test" />')).toBe(true)
  })
})

describe('isNovelFile', () => {
  it('.novel后缀应返回true', () => {
    expect(isNovelFile('chapter1.novel')).toBe(true)
    expect(isNovelFile('/path/to/file.novel')).toBe(true)
  })

  it('非.novel后缀应返回false', () => {
    expect(isNovelFile('chapter1.md')).toBe(false)
    expect(isNovelFile('chapter1.txt')).toBe(false)
    expect(isNovelFile('novel')).toBe(false)
  })

  it('空字符串应返回false', () => {
    expect(isNovelFile('')).toBe(false)
  })
})
