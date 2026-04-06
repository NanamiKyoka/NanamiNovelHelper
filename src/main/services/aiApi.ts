/**
 * AI API 调用服务
 * 支持多种 AI 提供商的统一调用接口
 */

import { globalSettingsService } from './globalSettings'

// 默认配置常量
const DEFAULT_MAX_TOKENS = 2000
const DEFAULT_TEMPERATURE = 0.7

/**
 * AI 提供商类型
 */
export type AIProvider = 'openai' | 'anthropic' | 'custom'

/**
 * API 调用选项
 */
export interface AiApiCallOptions {
  provider?: AIProvider
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

/**
 * API 调用结果
 */
export interface AiApiCallResult {
  success: boolean
  content?: string
  error?: string
  tokensUsed?: {
    input: number
    output: number
  }
  duration: number // 毫秒
}

/**
 * API 配置
 */
interface ApiConfig {
  baseUrl: string
  apiKeyName: string
  defaultModel: string
}

/**
 * 各提供商的默认配置
 */
const PROVIDER_CONFIGS: Record<AIProvider, ApiConfig> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKeyName: 'openai_api_key',
    defaultModel: 'gpt-4',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyName: 'anthropic_api_key',
    defaultModel: 'claude-3-opus-20240229',
  },
  custom: {
    baseUrl: '',
    apiKeyName: 'custom_api_key',
    defaultModel: '',
  },
}

/**
 * AI API 服务
 */
class AiApiService {
  /**
   * 调用 AI API
   */
  async call(prompt: string, options: AiApiCallOptions = {}): Promise<AiApiCallResult> {
    const startTime = Date.now()
    const provider = options.provider || 'openai'
    const config = PROVIDER_CONFIGS[provider]

    try {
      // 获取 API Key
      const apiKey = globalSettingsService.getApiKey(config.apiKeyName)
      if (!apiKey) {
        return {
          success: false,
          error: `未配置 ${provider} API Key，请在设置中配置`,
          duration: Date.now() - startTime,
        }
      }

      // 根据提供商调用不同的 API
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(prompt, options, apiKey, config, startTime)
        case 'anthropic':
          return await this.callAnthropic(prompt, options, apiKey, config, startTime)
        case 'custom':
          return await this.callCustom(prompt, options, apiKey, startTime)
        default:
          return {
            success: false,
            error: `不支持的 AI 提供商: ${provider}`,
            duration: Date.now() - startTime,
          }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(
    prompt: string,
    options: AiApiCallOptions,
    apiKey: string,
    config: ApiConfig,
    startTime: number
  ): Promise<AiApiCallResult> {
    const model = options.model || config.defaultModel
    const baseUrl = PROVIDER_CONFIGS.custom.apiKeyName
      ? globalSettingsService.getApiKey('custom_base_url') || config.baseUrl
      : config.baseUrl

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
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
          duration: Date.now() - startTime,
        }
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''

      return {
        success: true,
        content,
        tokensUsed: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 调用 Anthropic API
   */
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
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
          duration: Date.now() - startTime,
        }
      }

      const data = await response.json()
      const content = data.content?.[0]?.text || ''

      return {
        success: true,
        content,
        tokensUsed: {
          input: data.usage?.input_tokens || 0,
          output: data.usage?.output_tokens || 0,
        },
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 调用自定义 API（兼容 OpenAI 格式）
   */
  private async callCustom(
    prompt: string,
    options: AiApiCallOptions,
    apiKey: string,
    startTime: number
  ): Promise<AiApiCallResult> {
    const baseUrl = globalSettingsService.getApiKey('custom_base_url')
    const model = options.model || globalSettingsService.getApiKey('custom_model') || 'gpt-4'

    if (!baseUrl) {
      return {
        success: false,
        error: '未配置自定义 API Base URL，请在设置中配置',
        duration: Date.now() - startTime,
      }
    }

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
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
          duration: Date.now() - startTime,
        }
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''

      return {
        success: true,
        content,
        tokensUsed: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 测试 API 连接
   */
  async testConnection(provider: AIProvider): Promise<{ success: boolean; error?: string }> {
    const config = PROVIDER_CONFIGS[provider]
    const apiKey = globalSettingsService.getApiKey(config.apiKeyName)

    if (!apiKey) {
      return { success: false, error: '未配置 API Key' }
    }

    // 发送一个简单的测试请求
    const result = await this.call('Hello', {
      provider,
      model: config.defaultModel,
      maxTokens: 10,
    })

    return {
      success: result.success,
      error: result.error,
    }
  }

  /**
   * 获取可用的模型列表
   */
  getAvailableModels(provider: AIProvider): string[] {
    switch (provider) {
      case 'openai':
        return ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
      case 'anthropic':
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
      case 'custom':
        return [] // 自定义模型需要用户自己配置
      default:
        return []
    }
  }
}

// 单例导出
export const aiApiService = new AiApiService()
