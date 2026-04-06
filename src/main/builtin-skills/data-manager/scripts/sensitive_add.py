# -*- coding: utf-8 -*-
"""
敏感词添加工具
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_sensitive_words_path, get_meta_dir


class SensitiveAddTool(BaseTool):
    """敏感词添加工具"""
    
    def execute(self) -> ToolResult:
        name = self.get_required_param('name')
        
        # 可选参数
        aliases = self.get_param('aliases', [])
        category = self.get_param('category', '其他')
        severity = self.get_param('severity', 'medium')
        suggestion = self.get_param('suggestion', '')
        description = self.get_param('description', '')
        
        # 验证严重程度
        valid_severities = ['low', 'medium', 'high', 'critical']
        if severity not in valid_severities:
            return ToolResult(
                success=False, 
                error=f'无效的严重程度，有效值: {", ".join(valid_severities)}'
            )
        
        words_path = get_sensitive_words_path(self.project_path)
        
        # 确保目录存在
        meta_dir = get_meta_dir(self.project_path)
        if not os.path.exists(meta_dir):
            os.makedirs(meta_dir, exist_ok=True)
        
        # 读取现有敏感词
        if os.path.exists(words_path):
            words = load_json5_file(words_path)
        else:
            words = []
        
        # 检查是否重复
        name_lower = name.lower()
        for existing in words:
            if existing.get('name', '').lower() == name_lower:
                return ToolResult(success=False, error=f'敏感词已存在: {name}')
            
            for alias in existing.get('aliases', []):
                if alias.lower() == name_lower:
                    return ToolResult(
                        success=False, 
                        error=f'敏感词已作为别名存在: {name}'
                    )
        
        # 创建新敏感词
        now = self.get_timestamp()
        new_word = {
            'id': self.generate_id(),
            'name': name.strip(),
            'aliases': aliases,
            'category': category,
            'severity': severity,
            'suggestion': suggestion,
            'description': description,
            'createdAt': now,
            'updatedAt': now
        }
        
        words.append(new_word)
        save_json5_file(words_path, words)
        
        return ToolResult(
            success=True,
            data={'word': new_word},
            message=f'成功添加敏感词: {name}'
        )


if __name__ == '__main__':
    run_tool(SensitiveAddTool)
