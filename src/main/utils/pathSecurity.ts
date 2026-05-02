import { normalize, resolve, relative, sep } from 'path'
import { existsSync, realpathSync } from 'fs'

export function isPathWithinDirectory(inputPath: string, directory: string): boolean {
  try {
    const normalizedPath = normalize(inputPath)
    const normalizedDir = normalize(directory)

    if (!existsSync(normalizedPath)) {
      const rel = relative(normalizedDir, normalizedPath)
      return !rel.startsWith('..') && !rel.startsWith('/') && !rel.startsWith('\\')
    }

    const realPath = realpathSync(normalizedPath)
    const realDir = realpathSync(normalizedDir)
    const rel = relative(realDir, realPath)

    return !rel.startsWith('..') && !rel.startsWith('/') && !rel.startsWith('\\')
  } catch {
    return false
  }
}

export function safeJoinPath(baseDir: string, inputPath: string): string {
  const normalizedInput = inputPath.replace(/[/\\]/g, sep)

  if (normalizedInput.match(/^[A-Za-z]:/) || normalizedInput.startsWith(sep)) {
    const resolved = resolve(normalizedInput)
    if (!isPathWithinDirectory(resolved, baseDir)) {
      throw new Error('路径不在允许的目录内')
    }
    return resolved
  }

  const resolved = resolve(baseDir, normalizedInput)
  if (!isPathWithinDirectory(resolved, baseDir)) {
    throw new Error('路径不在允许的目录内')
  }
  return resolved
}

export function isAllowedUrlProtocol(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
