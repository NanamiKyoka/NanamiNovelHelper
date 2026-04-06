# -*- coding: utf-8 -*-
"""
敏感词删除工具
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import get_sensitive_words_path


class SensitiveDeleteTool(BaseTool):
    """敏感词删除工具"""
    
    def execute(self) -> ToolResult:
        word_id = self.get_required_param('wordId')
        
        words_path = get_sensitive_words_path(self.project_path)
        if not os.path.exists(words_path):
            return ToolResult(success=False, error='敏感词不存在')
        
        try:
            words = load_json5_file(words_path)
            word_index = next((i for i, w in enumerate(words) if w.get('id') == word_id), None)
            
            if word_index is None:
                return ToolResult(success=False, error=f'敏感词不存在: {word_id}')
            
            deleted_word = words[word_index]
            word_name = deleted_word.get('name', word_id)
            
            words.pop(word_index)
            save_json5_file(words_path, words)
            
            return ToolResult(
                success=True,
                data={
                    'deletedId': word_id,
                    'deletedName': word_name
                },
                message=f'成功删除敏感词: {word_name}'
            )
            
        except Exception as e:
            return ToolResult(success=False, error=f'删除失败: {e}')


if __name__ == '__main__':
    run_tool(SensitiveDeleteTool)
