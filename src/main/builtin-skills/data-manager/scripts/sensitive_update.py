# -*- coding: utf-8 -*-
"""
敏感词更新工具
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_sensitive_words_path


class SensitiveUpdateTool(BaseTool):
    """敏感词更新工具"""
    
    def execute(self) -> ToolResult:
        word_id = self.get_required_param('wordId')
        
        # 获取可更新的字段
        updates = {}
        
        if self.get_param('name') is not None:
            updates['name'] = self.get_param('name').strip()
        
        if self.get_param('aliases') is not None:
            updates['aliases'] = self.get_param('aliases')
        
        if self.get_param('category') is not None:
            updates['category'] = self.get_param('category')
        
        if self.get_param('severity') is not None:
            severity = self.get_param('severity')
            valid_severities = ['low', 'medium', 'high', 'critical']
            if severity not in valid_severities:
                return ToolResult(
                    success=False,
                    error=f'无效的严重程度，有效值: {", ".join(valid_severities)}'
                )
            updates['severity'] = severity
        
        if self.get_param('suggestion') is not None:
            updates['suggestion'] = self.get_param('suggestion')
        
        if self.get_param('description') is not None:
            updates['description'] = self.get_param('description')
        
        if not updates:
            return ToolResult(success=False, error='没有提供要更新的字段')
        
        words_path = get_sensitive_words_path(self.project_path)
        if not os.path.exists(words_path):
            return ToolResult(success=False, error='敏感词不存在')
        
        try:
            words = load_json5_file(words_path)
            word_index = next((i for i, w in enumerate(words) if w.get('id') == word_id), None)
            
            if word_index is None:
                return ToolResult(success=False, error=f'敏感词不存在: {word_id}')
            
            # 检查名称是否重复
            if 'name' in updates:
                new_name = updates['name'].lower()
                for i, w in enumerate(words):
                    if i != word_index and w.get('name', '').lower() == new_name:
                        return ToolResult(success=False, error=f'名称已存在: {updates["name"]}')
            
            # 更新
            now = self.get_timestamp()
            words[word_index].update(updates)
            words[word_index]['updatedAt'] = now
            
            save_json5_file(words_path, words)
            
            return ToolResult(
                success=True,
                data={'word': words[word_index]},
                message=f'成功更新敏感词: {words[word_index].get("name")}'
            )
            
        except Exception as e:
            return ToolResult(success=False, error=f'更新失败: {e}')


if __name__ == '__main__':
    run_tool(SensitiveUpdateTool)
