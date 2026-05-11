export function stripHtmlTags(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<blockquote[^>]*>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')

  return text
}

export function stripHtmlTagsInline(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export function isHtmlContent(content: string): boolean {
  return /<[a-zA-Z][^>]*>/.test(content)
}

export function isNovelFile(path: string): boolean {
  return path.endsWith('.novel')
}

export function isMarkdownFile(path: string): boolean {
  return path.endsWith('.md') || path.endsWith('.markdown')
}

export function isRenderableFile(path: string): boolean {
  return isNovelFile(path) || isMarkdownFile(path)
}

export function disableBrowserAutofill(): void {
  const setAutocompleteOff = (el: Element) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.setAttribute('autocomplete', 'off')
    }
  }

  document.querySelectorAll('input, textarea').forEach(setAutocompleteOff)

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          setAutocompleteOff(node)
          node.querySelectorAll('input, textarea').forEach(setAutocompleteOff)
        }
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

export function disableContextMenu(): void {
  document.addEventListener('contextmenu', e => e.preventDefault(), { capture: true })
}
