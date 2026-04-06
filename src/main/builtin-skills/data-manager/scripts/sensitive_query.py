# -*- coding: utf-8 -*-
"""
敏感词查询工具
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file
from utils.file_utils import get_sensitive_words_path


class SensitiveQueryTool(BaseTool):
    """敏感词查询工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'list')
        
        if action == 'list':
            return self._list_words()
        elif action == 'get':
            return self._get_word()
        elif action == 'search':
            return self._search_words()
        elif action == 'list_categories':
            return self._list_categories()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _list_words(self) -> ToolResult:
        """列出所有敏感词"""
        category = self.get_param('category')
        severity = self.get_param('severity')
        limit = self.get_param('limit', 100)
        offset = self.get_param('offset', 0)
        
        words_path = get_sensitive_words_path(self.project_path)
        
        if not os.path.exists(words_path):
            return ToolResult(
                success=True,
                data={'words': [], 'total': 0}
            )
        
        try:
            words = load_json5_file(words_path)
            
            # 过滤
            if category:
                words = [w for w in words if w.get('category') == category]
            
            if severity:
                words = [w for w in words if w.get('severity') == severity]
            
            total = len(words)
            paginated = words[offset:offset + limit]
            
            return ToolResult(
                success=True,
                data={
                    'words': paginated,
                    'total': total
                }
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取敏感词失败: {e}')
    
    def _get_word(self) -> ToolResult:
        """获取单个敏感词"""
        word_id = self.get_required_param('wordId')
        
        words_path = get_sensitive_words_path(self.project_path)
        if not os.path.exists(words_path):
            return ToolResult(success=False, error='敏感词不存在')
        
        try:
            words = load_json5_file(words_path)
            word = next((w for w in words if w.get('id') == word_id), None)
            
            if word:
                return ToolResult(success=True, data={'word': word})
            else:
                return ToolResult(success=False, error=f'敏感词不存在: {word_id}')
        except Exception as e:
            return ToolResult(success=False, error=f'查询失败: {e}')
    
    def _search_words(self) -> ToolResult:
        """搜索敏感词"""
        keyword = self.get_param('keyword', '').lower()
        limit = self.get_param('limit', 50)
        
        if not keyword:
            return ToolResult(success=False, error='请提供搜索关键词')
        
        words_path = get_sensitive_words_path(self.project_path)
        if not os.path.exists(words_path):
            return ToolResult(success=True, data={'words': [], 'total': 0})
        
        try:
            words = load_json5_file(words_path)
            matched = []
            
            for word in words:
                # 搜索名称和别名
                if keyword in word.get('name', '').lower():
                    matched.append(word)
                    continue
                
                for alias in word.get('aliases', []):
                    if keyword in alias.lower():
                        matched.append(word)
                        break
            
            return ToolResult(
                success=True,
                data={
                    'words': matched[:limit],
                    'total': len(matched)
                }
            )
        except Exception as e:
            return ToolResult(success=False, error=f'搜索失败: {e}')
    
    def _list_categories(self) -> ToolResult:
        """列出所有分类"""
        words_path = get_sensitive_words_path(self.project_path)
        
        if not os.path.exists(words_path):
            return ToolResult(success=True, data={'categories': []})
        
        try:
            words = load_json5_file(words_path)
            categories = set()
            
            for word in words:
                cat = word.get('category')
                if cat:
                    categories.add(cat)
            
            return ToolResult(
                success=True,
                data={'categories': sorted(list(categories))}
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取分类失败: {e}')


if __name__ == '__main__':
    run_tool(SensitiveQueryTool)
