/**
 * 项目相关类型定义（渲染进程专用）
 * 
 * 基础类型从 @shared 导入，此文件仅包含渲染进程专用的扩展类型
 */

// 从共享类型重新导出
export {
  // 类型
  Project,
  CreateProjectOptions,
  RecentProject,
  ProjectDirectoryType,
  ProjectDirectoryConfig,
  ProjectTemplateType,
  ProjectTemplateConfig,
  PresetVocabularyType,
  PresetVocabularyConfig,
  FileType,
  // 常量
  PROJECT_CONFIG_FILE,
  PROJECT_META_DIR,
  PROJECT_SETTINGS_FILE,
  VOCABULARY_DIR,
  VOCABULARY_TYPES_FILE,
  VOCABULARY_DEFAULT_DIR,
  SENSITIVE_WORDS_FILE,
  BACKUP_DIR,
  IMAGES_DIR,
  ENCRYPTED_KEYS_FILE,
  DEFAULT_DIRECTORIES,
  DEFAULT_TEMPLATES,
  PRESET_VOCABULARY_TYPES,
} from '@shared/project'
