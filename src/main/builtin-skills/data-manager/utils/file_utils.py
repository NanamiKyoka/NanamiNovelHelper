# -*- coding: utf-8 -*-
"""
文件路径工具
提供各种数据文件的路径获取方法
"""

import os
from typing import Optional


# ============ 常量定义 ============

PROJECT_META_DIR = '.novelhelper'
DATA_DIR = 'data'

# 词汇相关
VOCABULARY_DIR = 'vocabulary'
VOCABULARY_TYPES_FILE = 'types.json5'
VOCABULARY_DEFAULT_DIR = 'default'

# 敏感词
SENSITIVE_WORDS_FILE = 'sensitive-words.json5'

# 关系图
RELATIONSHIPS_DIR = 'relationships'

# 组织架构图
ORGANIZATIONS_DIR = 'organizations'

# 时间线
TIMELINES_DIR = 'timelines'

# 事序图
SEQUENCE_CHARTS_DIR = 'sequence-charts'


def _safe_project_path(project_path: str) -> str:
    """确保项目路径有效"""
    if not project_path:
        raise ValueError('项目路径不能为空')
    return project_path


def get_meta_dir(project_path: str) -> str:
    """获取 .novelhelper 目录路径"""
    return os.path.join(_safe_project_path(project_path), PROJECT_META_DIR)


def get_data_dir(project_path: str) -> str:
    """获取数据目录路径"""
    return os.path.join(get_meta_dir(project_path), DATA_DIR)


# ============ 词汇相关路径 ============

def get_vocabulary_dir(project_path: str) -> str:
    """获取词汇目录路径"""
    return os.path.join(get_meta_dir(project_path), VOCABULARY_DIR)


def get_vocabulary_types_path(project_path: str) -> str:
    """获取词汇类型文件路径"""
    return os.path.join(get_vocabulary_dir(project_path), VOCABULARY_TYPES_FILE)


def get_vocabulary_default_dir(project_path: str) -> str:
    """获取词汇默认类型目录路径（内置类型）"""
    return os.path.join(get_vocabulary_dir(project_path), VOCABULARY_DEFAULT_DIR)


def get_vocabulary_entries_path(project_path: str, type_id: str, is_builtin: bool = False) -> str:
    """
    获取词汇条目文件路径
    
    Args:
        project_path: 项目路径
        type_id: 类型 ID
        is_builtin: 是否为内置类型
        
    Returns:
        词汇条目文件路径
    """
    if is_builtin:
        return os.path.join(get_vocabulary_default_dir(project_path), f'{type_id}.json5')
    else:
        return os.path.join(get_vocabulary_dir(project_path), f'{type_id}.json5')


# ============ 敏感词路径 ============

def get_sensitive_words_path(project_path: str) -> str:
    """获取敏感词文件路径"""
    return os.path.join(get_meta_dir(project_path), SENSITIVE_WORDS_FILE)


# ============ 关系图路径 ============

def get_relationships_dir(project_path: str) -> str:
    """获取关系图目录路径"""
    return os.path.join(get_data_dir(project_path), RELATIONSHIPS_DIR)


def get_relationship_path(project_path: str, graph_id: str) -> str:
    """获取关系图文件路径"""
    return os.path.join(get_relationships_dir(project_path), f'{graph_id}.json5')


# ============ 组织架构图路径 ============

def get_organizations_dir(project_path: str) -> str:
    """获取组织架构图目录路径"""
    return os.path.join(get_data_dir(project_path), ORGANIZATIONS_DIR)


def get_organization_path(project_path: str, graph_id: str) -> str:
    """获取组织架构图文件路径"""
    return os.path.join(get_organizations_dir(project_path), f'{graph_id}.json5')


# ============ 时间线路径 ============

def get_timelines_dir(project_path: str) -> str:
    """获取时间线目录路径"""
    return os.path.join(get_data_dir(project_path), TIMELINES_DIR)


def get_timeline_path(project_path: str, timeline_id: str) -> str:
    """获取时间线文件路径"""
    return os.path.join(get_timelines_dir(project_path), f'{timeline_id}.json5')


# ============ 事序图路径 ============

def get_sequence_charts_dir(project_path: str) -> str:
    """获取事序图目录路径"""
    return os.path.join(get_data_dir(project_path), SEQUENCE_CHARTS_DIR)


def get_sequence_chart_path(project_path: str, chart_id: str) -> str:
    """获取事序图文件路径"""
    return os.path.join(get_sequence_charts_dir(project_path), f'{chart_id}.json5')
