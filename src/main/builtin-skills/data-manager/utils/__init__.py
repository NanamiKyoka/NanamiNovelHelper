# -*- coding: utf-8 -*-
"""
内置 SKILL 工具模块
提供 JSON5 解析、文件操作等通用功能
"""

from .json5_parser import parse_json5, load_json5_file, save_json5_file
from .base_tool import BaseTool, ToolResult
from .file_utils import (
    get_vocabulary_types_path,
    get_vocabulary_entries_path,
    get_sensitive_words_path,
    get_relationships_dir,
    get_organizations_dir,
    get_timelines_dir,
    get_sequence_charts_dir
)

__all__ = [
    # JSON5 解析
    'parse_json5',
    'load_json5_file',
    'save_json5_file',
    # 基础工具类
    'BaseTool',
    'ToolResult',
    # 文件路径工具
    'get_vocabulary_types_path',
    'get_vocabulary_entries_path',
    'get_sensitive_words_path',
    'get_relationships_dir',
    'get_organizations_dir',
    'get_timelines_dir',
    'get_sequence_charts_dir'
]
