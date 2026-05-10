import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import type { CustomChunkType } from '@shared/settings'

describe('自定义板块完整流程测试', () => {
  const mockElectronApi = {
    settings: {
      project: {
        update: vi.fn()
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.stubGlobal('electron', mockElectronApi)
    
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

  it('应该正确处理自定义板块添加的完整流程', async () => {
    const { result } = renderHook(() => useSettingsStore())

    mockElectronApi.settings.project.update.mockImplementation((updates: Record<string, unknown>) => {
      const currentSettings = useSettingsStore.getState().projectSettings
      const newSettings = {
        ...currentSettings,
        ...updates,
        customChunkTypes: updates.customChunkTypes as CustomChunkType[]
      }
      return Promise.resolve(newSettings)
    })

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '测试板块',
        icon: 'SettingOutlined',
        color: '#9e9e9e',
        description: '这是一个测试板块'
      })
    })

    expect(result.current.projectSettings?.customChunkTypes).toBeDefined()
    expect(result.current.projectSettings?.customChunkTypes?.length).toBe(1)
    expect(result.current.projectSettings?.customChunkTypes?.[0].name).toBe('测试板块')
    expect(result.current.projectSettings?.customChunkTypes?.[0].icon).toBe('SettingOutlined')
    expect(result.current.projectSettings?.customChunkTypes?.[0].color).toBe('#9e9e9e')
    expect(result.current.projectSettings?.customChunkTypes?.[0].description).toBe('这是一个测试板块')
    expect(result.current.projectSettings?.customChunkTypes?.[0].id).toMatch(/^custom-/)
    expect(result.current.projectSettings?.customChunkTypes?.[0].createdAt).toBeDefined()
    expect(result.current.projectSettings?.customChunkTypes?.[0].updatedAt).toBeDefined()
  })

  it('应该正确处理多个自定义板块的添加', async () => {
    const { result } = renderHook(() => useSettingsStore())

    mockElectronApi.settings.project.update.mockImplementation((updates: Record<string, unknown>) => {
      const currentSettings = useSettingsStore.getState().projectSettings
      const newSettings = {
        ...currentSettings,
        ...updates,
        customChunkTypes: updates.customChunkTypes as CustomChunkType[]
      }
      return Promise.resolve(newSettings)
    })

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '板块1',
        icon: 'SettingOutlined',
        color: '#ff0000',
        description: '第一个板块'
      })
    })

    expect(result.current.projectSettings?.customChunkTypes?.length).toBe(1)

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '板块2',
        icon: 'HomeOutlined',
        color: '#00ff00',
        description: '第二个板块'
      })
    })

    expect(result.current.projectSettings?.customChunkTypes?.length).toBe(2)
    expect(result.current.projectSettings?.customChunkTypes?.[0].name).toBe('板块1')
    expect(result.current.projectSettings?.customChunkTypes?.[1].name).toBe('板块2')
  })

  it('应该正确处理后端返回不完整数据的情况', async () => {
    const { result } = renderHook(() => useSettingsStore())

    mockElectronApi.settings.project.update.mockResolvedValue({
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
      hiddenItems: []
    })

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '测试板块',
        icon: 'SettingOutlined',
        color: '#9e9e9e',
        description: '这是一个测试板块'
      })
    })

    expect(result.current.projectSettings?.customChunkTypes).toEqual([])
  })

  it('应该正确处理后端返回空数组的情况', async () => {
    const { result } = renderHook(() => useSettingsStore())

    mockElectronApi.settings.project.update.mockResolvedValue({
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
    })

    await act(async () => {
      await result.current.addCustomChunkType({
        name: '测试板块',
        icon: 'SettingOutlined',
        color: '#9e9e9e',
        description: '这是一个测试板块'
      })
    })

    expect(result.current.projectSettings?.customChunkTypes).toEqual([])
  })

  it('应该正确处理后端 API 调用失败的情况', async () => {
    const { result } = renderHook(() => useSettingsStore())

    mockElectronApi.settings.project.update.mockRejectedValue(new Error('API 调用失败'))

    await expect(async () => {
      await act(async () => {
        await result.current.addCustomChunkType({
          name: '测试板块',
          icon: 'SettingOutlined',
          color: '#9e9e9e',
          description: '这是一个测试板块'
        })
      })
    }).rejects.toThrow('API 调用失败')
  })
})
