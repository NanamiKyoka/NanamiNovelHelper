export interface AiSkill {
  name: string
  description: string
  tags: string[]
  content: string // Markdown 内容（不含 Frontmatter）
  source: 'project' | 'global'
  enabled: boolean
  location: string // 文件绝对路径
  isBuiltIn?: boolean
}

export interface AiSkillMatchResult {
  skill: AiSkill
  score: number
}
