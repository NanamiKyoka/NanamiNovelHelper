/**
 * 随机起名核心逻辑
 * 支持中国人名、日本人名、西方人名、势力、地名、秘籍、法宝、灵药等类型
 */

import {
  CHINESE_SURNAMES,
  CHINESE_COMPOUND_SURNAMES,
  CHINESE_MALE_CHARS,
  CHINESE_FEMALE_CHARS,
  JAPANESE_SURNAMES,
  JAPANESE_MALE_CHARS,
  JAPANESE_FEMALE_CHARS,
  WESTERN_SURNAMES,
  WESTERN_MALE_NAMES,
  WESTERN_FEMALE_NAMES,
  FORCE_SUFFIXES,
  PLACE_SUFFIXES,
  BOOK_SUFFIXES,
  ITEM_SUFFIXES,
  ELIXIR_SUFFIXES,
  CORE_WORDS,
  CustomNameType
} from '@constants/names'

// 生成选项
export interface GenerateOptions {
  type: string // 类型：cn, jp, en, force, place, book, item, elixir, 或自定义类型ID
  count?: number // 生成数量，默认 24
  surname?: string // 指定姓氏
  gender?: 'male' | 'female' // 性别
  charCount?: 2 | 3 // 名字字数（仅人名）
  middleChar?: string // 中间字（仅中国三字名）
  suffix?: string // 指定后缀（势力/地名/物品等）
  customType?: CustomNameType // 自定义类型配置
}

// 随机选择数组中的一个元素
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 随机选择字符串中的一个字符
function randomChar(str: string): string {
  return str[Math.floor(Math.random() * str.length)]
}

// 随机整数 [min, max]
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成中国人名
 */
function generateChineseNames(options: GenerateOptions): string[] {
  const { count = 24, surname, gender, charCount, middleChar } = options
  const result: string[] = []

  // 名字用字
  const maleChars = CHINESE_MALE_CHARS
  const femaleChars = CHINESE_FEMALE_CHARS

  for (let i = 0; i < count; i++) {
    // 选择姓氏
    let selectedSurname: string
    if (surname) {
      selectedSurname = surname
    } else {
      // 80% 单姓，20% 复姓
      selectedSurname =
        Math.random() < 0.8 ? randomPick(CHINESE_SURNAMES) : randomPick(CHINESE_COMPOUND_SURNAMES)
    }

    // 选择名字用字
    const nameChars =
      gender === 'female'
        ? femaleChars
        : gender === 'male'
          ? maleChars
          : Math.random() < 0.5
            ? maleChars
            : femaleChars

    // 生成名字
    let name: string
    const nameLength = charCount || (Math.random() < 0.6 ? 2 : 3)

    if (nameLength === 2) {
      // 二字名：姓 + 1字
      name = randomChar(nameChars)
    } else {
      // 三字名：姓 + 2字
      if (middleChar) {
        name = middleChar + randomChar(nameChars)
      } else {
        name = randomChar(nameChars) + randomChar(nameChars)
      }
    }

    result.push(selectedSurname + name)
  }

  return result
}

/**
 * 生成日本人名（中文音译）
 */
function generateJapaneseNames(options: GenerateOptions): string[] {
  const { count = 24, surname, gender } = options
  const result: string[] = []

  const maleChars = JAPANESE_MALE_CHARS
  const femaleChars = JAPANESE_FEMALE_CHARS

  for (let i = 0; i < count; i++) {
    // 选择姓氏
    const selectedSurname = surname || randomPick(JAPANESE_SURNAMES)

    // 选择名字
    const nameChars =
      gender === 'female'
        ? femaleChars
        : gender === 'male'
          ? maleChars
          : Math.random() < 0.5
            ? maleChars
            : femaleChars
    const name = randomPick(nameChars)

    result.push(selectedSurname + name)
  }

  return result
}

/**
 * 生成西方人名（中文音译）
 */
function generateWesternNames(options: GenerateOptions): string[] {
  const { count = 24, surname, gender } = options
  const result: string[] = []

  for (let i = 0; i < count; i++) {
    // 选择姓氏
    const selectedSurname = surname || randomPick(WESTERN_SURNAMES)

    // 选择名字
    const names =
      gender === 'female'
        ? WESTERN_FEMALE_NAMES
        : gender === 'male'
          ? WESTERN_MALE_NAMES
          : Math.random() < 0.5
            ? WESTERN_MALE_NAMES
            : WESTERN_FEMALE_NAMES
    const firstName = randomPick(names)

    // 格式：名·姓
    result.push(`${firstName}·${selectedSurname}`)
  }

  return result
}

/**
 * 生成势力名称
 */
function generateForceNames(options: GenerateOptions): string[] {
  const { count = 24, suffix } = options
  const result: string[] = []

  for (let i = 0; i < count; i++) {
    // 前缀：1-3 个核心字
    const prefixLength = randomInt(1, 3)
    let prefix = ''
    for (let j = 0; j < prefixLength; j++) {
      prefix += randomPick(CORE_WORDS)
    }

    // 后缀
    const selectedSuffix = suffix || randomPick(FORCE_SUFFIXES)

    result.push(prefix + selectedSuffix)
  }

  return result
}

/**
 * 生成地名
 */
function generatePlaceNames(options: GenerateOptions): string[] {
  const { count = 24, suffix } = options
  const result: string[] = []

  for (let i = 0; i < count; i++) {
    // 前缀：1-4 个核心字
    const prefixLength = randomInt(1, 4)
    let prefix = ''
    for (let j = 0; j < prefixLength; j++) {
      prefix += randomPick(CORE_WORDS)
    }

    // 后缀
    const selectedSuffix = suffix || randomPick(PLACE_SUFFIXES)

    result.push(prefix + selectedSuffix)
  }

  return result
}

/**
 * 生成秘籍名称
 */
function generateBookNames(options: GenerateOptions): string[] {
  const { count = 24, suffix } = options
  const result: string[] = []

  for (let i = 0; i < count; i++) {
    // 前缀：1-4 个核心字
    const prefixLength = randomInt(1, 4)
    let prefix = ''
    for (let j = 0; j < prefixLength; j++) {
      prefix += randomPick(CORE_WORDS)
    }

    // 后缀
    const selectedSuffix = suffix || randomPick(BOOK_SUFFIXES)

    result.push(prefix + selectedSuffix)
  }

  return result
}

/**
 * 生成法宝名称
 */
function generateItemNames(options: GenerateOptions): string[] {
  const { count = 24, suffix } = options
  const result: string[] = []

  for (let i = 0; i < count; i++) {
    // 前缀：1-3 个核心字
    const prefixLength = randomInt(1, 3)
    let prefix = ''
    for (let j = 0; j < prefixLength; j++) {
      prefix += randomPick(CORE_WORDS)
    }

    // 后缀
    const selectedSuffix = suffix || randomPick(ITEM_SUFFIXES)

    result.push(prefix + selectedSuffix)
  }

  return result
}

/**
 * 生成灵药名称
 */
function generateElixirNames(options: GenerateOptions): string[] {
  const { count = 24, suffix } = options
  const result: string[] = []

  for (let i = 0; i < count; i++) {
    // 前缀：1-3 个核心字
    const prefixLength = randomInt(1, 3)
    let prefix = ''
    for (let j = 0; j < prefixLength; j++) {
      prefix += randomPick(CORE_WORDS)
    }

    // 后缀
    const selectedSuffix = suffix || randomPick(ELIXIR_SUFFIXES)

    result.push(prefix + selectedSuffix)
  }

  return result
}

/**
 * 生成自定义类型名称
 */
function generateCustomNames(options: GenerateOptions): string[] {
  const { count = 24, suffix, customType } = options
  if (!customType) {
    return []
  }

  const result: string[] = []
  const { prefixes, suffixes, prefixCount, usePrefixOnly } = customType

  for (let i = 0; i < count; i++) {
    // 前缀
    const [min, max] = prefixCount
    const length = randomInt(min, max)
    let prefix = ''
    for (let j = 0; j < length; j++) {
      prefix += randomPick(prefixes)
    }

    if (usePrefixOnly) {
      result.push(prefix)
    } else {
      // 后缀
      const selectedSuffix = suffix || randomPick(suffixes)
      result.push(prefix + selectedSuffix)
    }
  }

  return result
}

/**
 * 主生成函数
 */
export function generateNames(options: GenerateOptions): string[] {
  const { type } = options

  switch (type) {
    case 'cn':
      return generateChineseNames(options)
    case 'jp':
      return generateJapaneseNames(options)
    case 'en':
      return generateWesternNames(options)
    case 'force':
      return generateForceNames(options)
    case 'place':
      return generatePlaceNames(options)
    case 'book':
      return generateBookNames(options)
    case 'item':
      return generateItemNames(options)
    case 'elixir':
      return generateElixirNames(options)
    default:
      // 尝试作为自定义类型处理
      return generateCustomNames(options)
  }
}

/**
 * 获取随机姓氏
 */
export function getRandomSurname(
  type: 'cn' | 'jp' | 'en' = 'cn',
  compound: boolean = false
): string {
  switch (type) {
    case 'cn':
      if (compound) {
        return randomPick(CHINESE_COMPOUND_SURNAMES)
      }
      return randomPick(CHINESE_SURNAMES)
    case 'jp':
      return randomPick(JAPANESE_SURNAMES)
    case 'en':
      return randomPick(WESTERN_SURNAMES)
    default:
      return randomPick(CHINESE_SURNAMES)
  }
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
