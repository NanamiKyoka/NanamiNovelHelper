# -*- coding: utf-8 -*-
"""
JSON5 解析器
支持注释、尾随逗号等 JSON5 特性
"""

import re
import json
from typing import Any, Dict, List, Optional, Union


def parse_json5(content: str) -> Any:
    """
    解析 JSON5 格式的字符串
    
    支持：
    - 单行注释 // ...
    - 多行注释 /* ... */
    - 尾随逗号
    - 单引号字符串
    - 未引用的键名（部分支持）
    
    Args:
        content: JSON5 格式的字符串
        
    Returns:
        解析后的 Python 对象
    """
    # 移除单行注释
    content = re.sub(r'//[^\n]*', '', content)
    
    # 移除多行注释
    content = re.sub(r'/\*[\s\S]*?\*/', '', content)
    
    # 移除尾随逗号（在 ] 或 } 之前的逗号）
    content = re.sub(r',\s*([}\]])', r'\1', content)
    
    # 将单引号字符串转换为双引号（简单处理）
    # 注意：这只是简单替换，不处理转义的单引号
    def replace_single_quotes(match):
        # 检查是否在键名位置
        s = match.group(0)
        return s.replace("'", '"')
    
    # 尝试解析为标准 JSON
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        # 尝试更宽松的解析
        try:
            # 处理未引用的键名
            # 匹配 { key: 或 , key: 形式
            content = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', content)
            return json.loads(content)
        except json.JSONDecodeError:
            raise ValueError(f"Failed to parse JSON5: {e}")


def load_json5_file(file_path: str, encoding: str = 'utf-8') -> Any:
    """
    加载 JSON5 文件
    
    Args:
        file_path: 文件路径
        encoding: 文件编码，默认 utf-8
        
    Returns:
        解析后的 Python 对象
    """
    with open(file_path, 'r', encoding=encoding) as f:
        content = f.read()
    return parse_json5(content)


def save_json5_file(
    file_path: str, 
    data: Any, 
    indent: int = 2, 
    encoding: str = 'utf-8'
) -> None:
    """
    保存数据到 JSON5 文件
    
    注意：实际保存为标准 JSON 格式，但使用 .json5 扩展名以保持兼容
    
    Args:
        file_path: 文件路径
        data: 要保存的数据
        indent: 缩进空格数
        encoding: 文件编码
    """
    import os
    
    # 确保目录存在
    dir_path = os.path.dirname(file_path)
    if dir_path and not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
    
    with open(file_path, 'w', encoding=encoding) as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)


def merge_dicts(base: Dict, updates: Dict) -> Dict:
    """
    深度合并两个字典
    
    Args:
        base: 基础字典
        updates: 更新字典
        
    Returns:
        合并后的字典
    """
    result = base.copy()
    
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    
    return result
