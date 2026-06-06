import { create } from 'zustand'
import type { AiSkill } from '@shared/ai-skill'

interface AiSkillState {
  skills: AiSkill[]
  enabledSkillNames: Set<string>
  isLoading: boolean

  loadSkills: () => Promise<void>
  toggleSkill: (name: string) => Promise<void>
  saveSkill: (skill: Omit<AiSkill, 'source' | 'location' | 'isBuiltIn'>) => Promise<AiSkill | null>
  deleteSkill: (name: string) => Promise<void>
  ensureBuiltins: () => Promise<void>
}

export const useAiSkillStore = create<AiSkillState>((set, get) => ({
  skills: [],
  enabledSkillNames: new Set(),
  isLoading: false,

  loadSkills: async () => {
    set({ isLoading: true })
    try {
      const skills = await window.api.aiSkill.discoverSkills()
      const projectSettings = await window.api.settings.project.getAll()
      const enabledNames = (projectSettings as Record<string, unknown>)?.aiSkillEnabled as string[] || []

      set({
        skills: skills || [],
        enabledSkillNames: new Set(enabledNames),
        isLoading: false
      })
    } catch (error) {
      console.error('Failed to load AI skills:', error)
      set({ isLoading: false })
    }
  },

  toggleSkill: async name => {
    const { enabledSkillNames } = get()
    const newSet = new Set(enabledSkillNames)
    if (newSet.has(name)) {
      newSet.delete(name)
    } else {
      newSet.add(name)
    }

    set({ enabledSkillNames: newSet })

    try {
      await window.api.settings.project.update({ aiSkillEnabled: Array.from(newSet) })
    } catch (error) {
      console.error('Failed to save skill enabled state:', error)
      throw error
    }
  },

  saveSkill: async skill => {
    try {
      const { name, description, tags, content } = skill
      const saved = await window.api.aiSkill.saveSkill(name, description, tags, content)
      await get().loadSkills()
      return saved
    } catch (error) {
      console.error('Failed to save skill:', error)
      return null
    }
  },

  deleteSkill: async name => {
    try {
      await window.api.aiSkill.deleteSkill(name)
      await get().loadSkills()
    } catch (error) {
      console.error('Failed to delete skill:', error)
      throw error
    }
  },

  ensureBuiltins: async () => {
    try {
      await window.api.aiSkill.ensureBuiltins()
      await get().loadSkills()
    } catch (error) {
      console.error('Failed to ensure builtin skills:', error)
      throw error
    }
  }
}))
