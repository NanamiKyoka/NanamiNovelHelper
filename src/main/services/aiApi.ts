import { BrowserWindow } from 'electron'
import { globalSettingsService } from './globalSettings'
import type { AIProvider, AiApiCallOptions, AiApiCallResult, AiApiStreamChunk } from '@shared/ai-assistant'

const DEFAULT_MAX_TOKENS = 2000
const DEFAULT_TEMPERATURE = 0.7

interface ApiConfig {
  baseUrl: string
  apiKeyName: string
  defaultModel: string
}

const PROVIDER_CONFIGS: Record<AIProvider, ApiConfig> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKeyName: 'openai_api_key',
    defaultModel: 'gpt-4'
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyName: 'anthropic_api_key',
    defaultModel: 'claude-3-opus-20240229'
  },
  custom: {
    baseUrl: '',
    apiKeyName: 'custom_api_key',
    defaultModel: ''
  }
}

interface OpenAiCompatibleResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string }
}

interface AnthropicResponse {
  content?: Array<{ text?: string }>
  usage?: { input_tokens?: number; output_tokens?: number }
  error?: { message?: string }
}

class AiApiService {
  async call(prompt: string, options: AiApiCallOptions = {}): Promise<AiApiCallResult> {
    const startTime = Date.now()
    const provider = options.provider || 'openai'
    const config = PROVIDER_CONFIGS[provider]

    try {
      const apiKey = globalSettingsService.getApiKey(config.apiKeyName)
      if (!apiKey) {
        return {
          success: false,
          error: `未配置 ${provider} API Key，请在设置中配置`,
          duration: Date.now() - startTime
        }
      }

      switch (provider) {
        case 'openai':
          return await this.callOpenAiCompatible(prompt, options, apiKey, config.baseUrl, startTime)
        case 'anthropic':
          return await this.callAnthropic(prompt, options, apiKey, config, startTime)
        case 'custom':
          return await this.callCustom(prompt, options, apiKey, startTime)
        default:
          return {
            success: false,
            error: `不支持的 AI 提供商: ${provider}`,
            duration: Date.now() - startTime
          }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration: Date.now() - startTime
      }
    }
  }

  private async callOpenAiCompatible(
    prompt: string,
    options: AiApiCallOptions,
    apiKey: string,
    defaultBaseUrl: string,
    startTime: number
  ): Promise<AiApiCallResult> {
    const model = options.model || 'gpt-4'
    const baseUrl = globalSettingsService.getApiKey('custom_base_url') || defaultBaseUrl

    try {
      const messages: Array<{ role: string; content: string }> = []
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS
        })
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as OpenAiCompatibleResponse
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
          duration: Date.now() - startTime
        }
      }

      const data = (await response.json()) as OpenAiCompatibleResponse
      return {
        success: true,
        content: data.choices?.[0]?.message?.content || '',
        tokensUsed: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
        duration: Date.now() - startTime
      }
    }
  }

  private async callAnthropic(
    prompt: string,
    options: AiApiCallOptions,
    apiKey: string,
    config: ApiConfig,
    startTime: number
  ): Promise<AiApiCallResult> {
    const model = options.model || config.defaultModel

    try {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as AnthropicResponse
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
          duration: Date.now() - startTime
        }
      }

      const data = (await response.json()) as AnthropicResponse
      return {
        success: true,
        content: data.content?.[0]?.text || '',
        tokensUsed: {
          input: data.usage?.input_tokens || 0,
          output: data.usage?.output_tokens || 0
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
        duration: Date.now() - startTime
      }
    }
  }

  private async callCustom(
    prompt: string,
    options: AiApiCallOptions,
    apiKey: string,
    startTime: number
  ): Promise<AiApiCallResult> {
    const baseUrl = globalSettingsService.getApiKey('custom_base_url')
    if (!baseUrl) {
      return {
        success: false,
        error: '未配置自定义 API Base URL，请在设置中配置',
        duration: Date.now() - startTime
      }
    }

    const model = options.model || globalSettingsService.getApiKey('custom_model') || 'gpt-4'
    return this.callOpenAiCompatible(prompt, { ...options, model }, apiKey, baseUrl, startTime)
  }

  async callStream(
    prompt: string,
    options: AiApiCallOptions,
    win: BrowserWindow
  ): Promise<AiApiCallResult> {
    const startTime = Date.now()
    const provider = options.provider || 'openai'
    const config = PROVIDER_CONFIGS[provider]

    try {
      const apiKey = globalSettingsService.getApiKey(config.apiKeyName)
      if (!apiKey) {
        const error = `未配置 ${provider} API Key，请在设置中配置`
        win.webContents.send('aiAssistant:streamChunk', {
          type: 'error',
          error
        } as AiApiStreamChunk)
        return { success: false, error, duration: Date.now() - startTime }
      }

      switch (provider) {
        case 'openai':
          return await this.callOpenAiCompatibleStream(
            prompt,
            options,
            apiKey,
            config.baseUrl,
            startTime,
            win
          )
        case 'anthropic':
          return await this.callAnthropicStream(
            prompt,
            options,
            apiKey,
            config,
            startTime,
            win
          )
        case 'custom':
          return await this.callCustomStream(prompt, options, apiKey, startTime, win)
        default: {
          const error = `不支持的 AI 提供商: ${provider}`
          win.webContents.send('aiAssistant:streamChunk', {
            type: 'error',
            error
          } as AiApiStreamChunk)
          return { success: false, error, duration: Date.now() - startTime }
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '未知错误'
      win.webContents.send('aiAssistant:streamChunk', {
        type: 'error',
        error: errMsg
      } as AiApiStreamChunk)
      return { success: false, error: errMsg, duration: Date.now() - startTime }
    }
  }

  private async callOpenAiCompatibleStream(
    prompt: string,
    options: AiApiCallOptions,
    apiKey: string,
    defaultBaseUrl: string,
    startTime: number,
    win: BrowserWindow
  ): Promise<AiApiCallResult> {
    const model = options.model || 'gpt-4'
    const baseUrl = globalSettingsService.getApiKey('custom_base_url') || defaultBaseUrl

    try {
      const messages: Array<{ role: string; content: string }> = []
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          stream: true
        })
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as OpenAiCompatibleResponse
        const error = errorData.error?.message || `HTTP ${response.status}`
        win.webContents.send('aiAssistant:streamChunk', {
          type: 'error',
          error
        } as AiApiStreamChunk)
        return { success: false, error, duration: Date.now() - startTime }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        const error = '无法获取响应流'
        win.webContents.send('aiAssistant:streamChunk', {
          type: 'error',
          error
        } as AiApiStreamChunk)
        return { success: false, error, duration: Date.now() - startTime }
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let inputTokens = 0
      let outputTokens = 0
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>
              usage?: { prompt_tokens?: number; completion_tokens?: number }
            }
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              fullContent += content
              win.webContents.send('aiAssistant:streamChunk', {
                type: 'chunk',
                content
              } as AiApiStreamChunk)
            }
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens || 0
              outputTokens = parsed.usage.completion_tokens || 0
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }

      const duration = Date.now() - startTime
      win.webContents.send('aiAssistant:streamChunk', {
        type: 'done',
        tokensUsed: { input: inputTokens, output: outputTokens },
        duration
      } as AiApiStreamChunk)

      return {
        success: true,
        content: fullContent,
        tokensUsed: { input: inputTokens, output: outputTokens },
        duration
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '网络请求失败'
      win.webContents.send('aiAssistant:streamChunk', {
        type: 'error',
        error: errMsg
      } as AiApiStreamChunk)
      return { success: false, error: errMsg, duration: Date.now() - startTime }
    }
  }

  private async callAnthropicStream(
    prompt: string,
    options: AiApiCallOptions,
    apiKey: string,
    config: ApiConfig,
    startTime: number,
    win: BrowserWindow
  ): Promise<AiApiCallResult> {
    const model = options.model || config.defaultModel

    try {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
          stream: true
        })
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as AnthropicResponse
        const error = errorData.error?.message || `HTTP ${response.status}`
        win.webContents.send('aiAssistant:streamChunk', {
          type: 'error',
          error
        } as AiApiStreamChunk)
        return { success: false, error, duration: Date.now() - startTime }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        const error = '无法获取响应流'
        win.webContents.send('aiAssistant:streamChunk', {
          type: 'error',
          error
        } as AiApiStreamChunk)
        return { success: false, error, duration: Date.now() - startTime }
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let inputTokens = 0
      let outputTokens = 0
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)

          try {
            const parsed = JSON.parse(data) as {
              type: string
              delta?: { text?: string }
              message?: { usage?: { input_tokens?: number; output_tokens?: number } }
              usage?: { input_tokens?: number; output_tokens?: number }
            }

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullContent += parsed.delta.text
              win.webContents.send('aiAssistant:streamChunk', {
                type: 'chunk',
                content: parsed.delta.text
              } as AiApiStreamChunk)
            } else if (parsed.type === 'message_start' && parsed.message?.usage) {
              inputTokens = parsed.message.usage.input_tokens || 0
            } else if (parsed.type === 'message_delta' && parsed.usage) {
              outputTokens = parsed.usage.output_tokens || 0
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }

      const duration = Date.now() - startTime
      win.webContents.send('aiAssistant:streamChunk', {
        type: 'done',
        tokensUsed: { input: inputTokens, output: outputTokens },
        duration
      } as AiApiStreamChunk)

      return {
        success: true,
        content: fullContent,
        tokensUsed: { input: inputTokens, output: outputTokens },
        duration
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '网络请求失败'
      win.webContents.send('aiAssistant:streamChunk', {
        type: 'error',
        error: errMsg
      } as AiApiStreamChunk)
      return { success: false, error: errMsg, duration: Date.now() - startTime }
    }
  }

  private async callCustomStream(
    prompt: string,
    options: AiApiCallOptions,
    apiKey: string,
    startTime: number,
    win: BrowserWindow
  ): Promise<AiApiCallResult> {
    const baseUrl = globalSettingsService.getApiKey('custom_base_url')
    if (!baseUrl) {
      const error = '未配置自定义 API Base URL，请在设置中配置'
      win.webContents.send('aiAssistant:streamChunk', {
        type: 'error',
        error
      } as AiApiStreamChunk)
      return { success: false, error, duration: Date.now() - startTime }
    }

    const model = options.model || globalSettingsService.getApiKey('custom_model') || 'gpt-4'
    return this.callOpenAiCompatibleStream(
      prompt,
      { ...options, model },
      apiKey,
      baseUrl,
      startTime,
      win
    )
  }

  async testConnection(provider: AIProvider): Promise<{ success: boolean; error?: string }> {
    const config = PROVIDER_CONFIGS[provider]
    const apiKey = globalSettingsService.getApiKey(config.apiKeyName)

    if (!apiKey) {
      return { success: false, error: '未配置 API Key' }
    }

    const result = await this.call('Hello', {
      provider,
      model: config.defaultModel,
      maxTokens: 10
    })

    return {
      success: result.success,
      error: result.error
    }
  }

  getAvailableModels(provider: AIProvider): string[] {
    switch (provider) {
      case 'openai':
        return ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
      case 'anthropic':
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
      case 'custom':
        return []
      default:
        return []
    }
  }
}

export const aiApiService = new AiApiService()
