import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettingsStore } from '@renderer/stores/settingsStore'

const mockElectronApi = {
  settings: {
    project: {
      update: vi.fn().mockImplementation((updates: Record<string, unknown>) => {
        const currentSettings = useSettingsStore.getState().projectSettings
        return Promise.resolve({
          ...currentSettings,
          ...updates,
          customChunkTypes: updates.customChunkTypes ?? currentSettings?.customChunkTypes ?? []
        })
      })
    }
  }
}

vi.stubGlobal('electron', mockElectronApi)

describe('自定义板块添加功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({
      projectSettings: {
        editor: {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: 16,
          lineHeight: 1.8,
          letterSpacing: 0,
          paragraphSpacing: 0.5,
          autoSaveInterval: 30000,
          enablePreviewMode: false
        },
        highlight: {
          vocabularyHighlight: true,
          sensitiveWordCheck: true
        },
        autoCreateVocabularyFile: false,
        backup: {
          enabled: true,
          maxCount: 10
        },
        expandedFolders: null,
        hiddenItems: [],
        customChunkTypes: []
      }
    })
  })

  it('应该正确添加自定义板块类型', async () => {
    const { result } = renderHook(() => useSettingsStore())

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '测试板块',
        icon: 'SettingOutlined',
        color: '#9e9e9e',
        description: '这是一个测试板块'
      })
    })

    const customChunkTypes = result.current.projectSettings?.customChunkTypes
    expect(customChunkTypes).toBeDefined()
    expect(customChunkTypes?.length).toBe(1)
    expect(customChunkTypes?.[0].name).toBe('测试板块')
  })

  it('应该正确更新自定义板块列表', async () => {
    const { result } = renderHook(() => useSettingsStore())

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '板块1',
        icon: 'SettingOutlined',
        color: '#ff0000',
        description: '第一个板块'
      })
    })

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '板块2',
        icon: 'HomeOutlined',
        color: '#00ff00',
        description: '第二个板块'
      })
    })

    const customChunkTypes = result.current.projectSettings?.customChunkTypes
    expect(customChunkTypes?.length).toBe(2)
    expect(customChunkTypes?.[0].name).toBe('板块1')
    expect(customChunkTypes?.[1].name).toBe('板块2')
  })

  it('应该正确删除自定义板块类型', async () => {
    const { result } = renderHook(() => useSettingsStore())

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '要删除的板块',
        icon: 'SettingOutlined',
        color: '#9e9e9e',
        description: '测试删除功能'
      })
    })

    const addedChunk = result.current.projectSettings?.customChunkTypes?.[0]
    expect(addedChunk).toBeDefined()

    await act(async () => {
      await result.current.deleteCustomChunkType(addedChunk!.id)
    })

    const customChunkTypes = result.current.projectSettings?.customChunkTypes
    expect(customChunkTypes?.length).toBe(0)
  })

  it('应该在 projectSettings 为 null 时返回 null', async () => {
    useSettingsStore.setState({ projectSettings: null })

    const { result } = renderHook(() => useSettingsStore())

    const newChunk = await act(async () => {
      return await result.current.addCustomChunkType({
        name: '测试',
        icon: 'SettingOutlined',
        color: '#9e9e9e',
        description: '测试'
      })
    })

    expect(newChunk).toBeNull()
  })
})
