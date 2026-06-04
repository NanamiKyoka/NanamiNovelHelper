import { diffChars } from 'diff'

const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'div',
  'blockquote',
  'li',
  'section',
  'article'
])

export interface HtmlBlock {
  tag: string
  html: string
  text: string
  hasInlineTags: boolean
}

export interface AlignedBlock {
  type: 'unchanged' | 'deleted' | 'added' | 'modified'
  oldBlock?: HtmlBlock
  newBlock?: HtmlBlock
}

export interface DiffPart {
  type: 'unchanged' | 'added' | 'removed'
  text: string
}

export function parseHtmlToBlocks(html: string): HtmlBlock[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body
  const blocks: HtmlBlock[] = []

  for (let i = 0; i < body.children.length; i++) {
    const element = body.children[i]
    const tag = element.tagName.toLowerCase()
    if (BLOCK_TAGS.has(tag)) {
      blocks.push({
        tag,
        html: element.outerHTML,
        text: element.textContent ?? '',
        hasInlineTags: Array.from(element.childNodes).some(
          node => node.nodeType === Node.ELEMENT_NODE
        )
      })
    }
  }

  if (blocks.length === 0 && body.innerHTML.trim().length > 0) {
    blocks.push({
      tag: 'div',
      html: body.innerHTML,
      text: body.textContent ?? '',
      hasInlineTags: Array.from(body.childNodes).some(
        node => node.nodeType === Node.ELEMENT_NODE
      )
    })
  }

  return blocks
}

function lcs(oldBlocks: HtmlBlock[], newBlocks: HtmlBlock[]): [number, number][] {
  const m = oldBlocks.length
  const n = newBlocks.length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldBlocks[i - 1].text.trim() === newBlocks[j - 1].text.trim()) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const matches: [number, number][] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (oldBlocks[i - 1].text.trim() === newBlocks[j - 1].text.trim()) {
      matches.unshift([i - 1, j - 1])
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return matches
}

export function alignBlocks(oldBlocks: HtmlBlock[], newBlocks: HtmlBlock[]): AlignedBlock[] {
  const matches = lcs(oldBlocks, newBlocks)
  const result: AlignedBlock[] = []
  let oldIdx = 0
  let newIdx = 0

  for (const [matchOld, matchNew] of matches) {
    while (oldIdx < matchOld && newIdx < matchNew) {
      result.push({
        type: 'modified',
        oldBlock: oldBlocks[oldIdx],
        newBlock: newBlocks[newIdx]
      })
      oldIdx++
      newIdx++
    }

    while (oldIdx < matchOld) {
      result.push({ type: 'deleted', oldBlock: oldBlocks[oldIdx] })
      oldIdx++
    }

    while (newIdx < matchNew) {
      result.push({ type: 'added', newBlock: newBlocks[newIdx] })
      newIdx++
    }

    result.push({
      type: 'unchanged',
      oldBlock: oldBlocks[oldIdx],
      newBlock: newBlocks[newIdx]
    })
    oldIdx++
    newIdx++
  }

  while (oldIdx < oldBlocks.length && newIdx < newBlocks.length) {
    result.push({
      type: 'modified',
      oldBlock: oldBlocks[oldIdx],
      newBlock: newBlocks[newIdx]
    })
    oldIdx++
    newIdx++
  }

  while (oldIdx < oldBlocks.length) {
    result.push({ type: 'deleted', oldBlock: oldBlocks[oldIdx] })
    oldIdx++
  }

  while (newIdx < newBlocks.length) {
    result.push({ type: 'added', newBlock: newBlocks[newIdx] })
    newIdx++
  }

  return result
}

export function computeWordDiff(oldText: string, newText: string): DiffPart[] {
  const changes = diffChars(oldText, newText)
  const parts: DiffPart[] = []

  for (const change of changes) {
    const type: DiffPart['type'] = change.added
      ? 'added'
      : change.removed
        ? 'removed'
        : 'unchanged'

    if ((type === 'added' || type === 'removed') && change.value.trim().length === 0) {
      continue
    }

    if (parts.length > 0 && parts[parts.length - 1].type === type) {
      parts[parts.length - 1].text += change.value
    } else {
      parts.push({ type, text: change.value })
    }
  }

  return parts
}
