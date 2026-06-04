import { useMemo } from 'react'
import { parseHtmlToBlocks, alignBlocks, computeWordDiff } from '@utils/novelDiff'
import styles from './NovelDiffViewer.module.css'

interface NovelDiffViewerProps {
  originalHtml: string
  modifiedHtml: string
  fileName?: string
}

function NovelDiffViewer({ originalHtml, modifiedHtml, fileName }: NovelDiffViewerProps): JSX.Element {
  const alignedBlocks = useMemo(() => {
    const oldBlocks = parseHtmlToBlocks(originalHtml)
    const newBlocks = parseHtmlToBlocks(modifiedHtml)
    return alignBlocks(oldBlocks, newBlocks)
  }, [originalHtml, modifiedHtml])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {fileName ? `${fileName} (修改对比)` : '修改对比'}
      </div>
      <div className={styles.content}>
        {alignedBlocks.map((block, index) => {
          const key = `${block.type}-${index}`

          if (block.type === 'unchanged' && block.newBlock) {
            return <div key={key} className={styles.paragraph} dangerouslySetInnerHTML={{ __html: block.newBlock.html }} />
          }

          if (block.type === 'deleted' && block.oldBlock) {
            return (
              <div
                key={key}
                className={styles.blockRemoved}
                dangerouslySetInnerHTML={{ __html: block.oldBlock.html }}
              />
            )
          }

          if (block.type === 'added' && block.newBlock) {
            return (
              <div
                key={key}
                className={styles.blockAdded}
                dangerouslySetInnerHTML={{ __html: block.newBlock.html }}
              />
            )
          }

          if (block.type === 'modified' && block.oldBlock && block.newBlock) {
            if (block.oldBlock.hasInlineTags || block.newBlock.hasInlineTags) {
              return (
                <div key={key} className={styles.paragraph}>
                  <div
                    className={styles.blockRemoved}
                    dangerouslySetInnerHTML={{ __html: block.oldBlock.html }}
                  />
                  <div
                    className={styles.blockAdded}
                    dangerouslySetInnerHTML={{ __html: block.newBlock.html }}
                  />
                </div>
              )
            }

            const diffParts = computeWordDiff(block.oldBlock.text, block.newBlock.text)
            const Tag = block.oldBlock.tag as keyof JSX.IntrinsicElements

            return (
              <Tag key={key} className={styles.paragraph}>
                {diffParts.map((part, partIndex) => {
                  if (part.type === 'removed') {
                    return (
                      <span key={partIndex} className={styles.diffDel}>
                        {part.text}
                      </span>
                    )
                  }
                  if (part.type === 'added') {
                    return (
                      <span key={partIndex} className={styles.diffAdd}>
                        {part.text}
                      </span>
                    )
                  }
                  return <span key={partIndex}>{part.text}</span>
                })}
              </Tag>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

export default NovelDiffViewer
