# -*- coding: utf-8 -*-
"""
词汇类型查询工具
动态发现所有词汇类型，支持按类型或关键词查询条目
"""

import os
import sys

# 添加父目录到路径以便导入工具模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file
from utils.file_utils import (
    get_vocabulary_types_path,
    get_vocabulary_entries_path,
    get_vocabulary_dir,
    get_vocabulary_default_dir
)


class VocabularyQueryTool(BaseTool):
    """词汇查询工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'list_types')
        
        if action == 'list_types':
            return self._list_types()
        elif action == 'get_type':
            return self._get_type()
        elif action == 'list_entries':
            return self._list_entries()
        elif action == 'get_entry':
            return self._get_entry()
        elif action == 'search_entries':
            return self._search_entries()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _list_types(self) -> ToolResult:
        """列出所有词汇类型"""
        types_path = get_vocabulary_types_path(self.project_path)
        
        if not os.path.exists(types_path):
            return ToolResult(
                success=True,
                data={'types': [], 'total': 0},
                message='词汇类型文件不存在，项目可能尚未初始化'
            )
        
        try:
            types = load_json5_file(types_path)
            
            # 简化返回数据，只返回必要字段
            simplified_types = []
            for t in types:
                simplified_types.append({
                    'id': t.get('id'),
                    'name': t.get('name'),
                    'icon': t.get('icon'),
                    'color': t.get('color'),
                    'isBuiltIn': t.get('isBuiltIn', False),
                    'fieldCount': len(t.get('fields', []))
                })
            
            return ToolResult(
                success=True,
                data={
                    'types': simplified_types,
                    'total': len(simplified_types)
                }
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取词汇类型失败: {e}')
    
    def _get_type(self) -> ToolResult:
        """获取单个类型的详细信息"""
        type_id = self.get_required_param('typeId')
        types_path = get_vocabulary_types_path(self.project_path)
        
        if not os.path.exists(types_path):
            return ToolResult(success=False, error='词汇类型文件不存在')
        
        try:
            types = load_json5_file(types_path)
            type_info = next((t for t in types if t.get('id') == type_id), None)
            
            if not type_info:
                return ToolResult(success=False, error=f'类型不存在: {type_id}')
            
            return ToolResult(success=True, data={'type': type_info})
        except Exception as e:
            return ToolResult(success=False, error=f'读取类型信息失败: {e}')
    
    def _list_entries(self) -> ToolResult:
        """列出指定类型的所有条目"""
        type_id = self.get_param('typeId')
        limit = self.get_param('limit', 50)
        offset = self.get_param('offset', 0)
        
        if type_id:
            return self._get_entries_by_type(type_id, limit, offset)
        else:
            return self._get_all_entries(limit, offset)
    
    def _get_entries_by_type(self, type_id: str, limit: int, offset: int) -> ToolResult:
        """获取指定类型的条目"""
        # 首先获取类型信息以判断是否为内置类型
        types_path = get_vocabulary_types_path(self.project_path)
        is_builtin = False
        type_name = type_id
        
        if os.path.exists(types_path):
            try:
                types = load_json5_file(types_path)
                type_info = next((t for t in types if t.get('id') == type_id), None)
                if type_info:
                    is_builtin = type_info.get('isBuiltIn', False)
                    type_name = type_info.get('name', type_id)
            except:
                pass
        
        entries_path = get_vocabulary_entries_path(self.project_path, type_id, is_builtin)
        
        if not os.path.exists(entries_path):
            return ToolResult(
                success=True,
                data={
                    'entries': [],
                    'total': 0,
                    'typeId': type_id,
                    'typeName': type_name
                }
            )
        
        try:
            entries = load_json5_file(entries_path)
            total = len(entries)
            
            # 分页
            paginated_entries = entries[offset:offset + limit]
            
            return ToolResult(
                success=True,
                data={
                    'entries': paginated_entries,
                    'total': total,
                    'typeId': type_id,
                    'typeName': type_name
                }
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取条目失败: {e}')
    
    def _get_all_entries(self, limit: int, offset: int) -> ToolResult:
        """获取所有类型的所有条目"""
        types_path = get_vocabulary_types_path(self.project_path)
        
        if not os.path.exists(types_path):
            return ToolResult(success=True, data={'entries': [], 'total': 0})
        
        try:
            types = load_json5_file(types_path)
            all_entries = []
            
            for type_info in types:
                type_id = type_info.get('id')
                is_builtin = type_info.get('isBuiltIn', False)
                entries_path = get_vocabulary_entries_path(self.project_path, type_id, is_builtin)
                
                if os.path.exists(entries_path):
                    entries = load_json5_file(entries_path)
                    for entry in entries:
                        entry['_typeId'] = type_id
                        entry['_typeName'] = type_info.get('name', type_id)
                    all_entries.extend(entries)
            
            total = len(all_entries)
            paginated_entries = all_entries[offset:offset + limit]
            
            return ToolResult(
                success=True,
                data={
                    'entries': paginated_entries,
                    'total': total
                }
            )
        except Exception as e:
            return ToolResult(success=False, error=f'读取条目失败: {e}')
    
    def _get_entry(self) -> ToolResult:
        """获取单个条目"""
        entry_id = self.get_required_param('entryId')
        
        types_path = get_vocabulary_types_path(self.project_path)
        if not os.path.exists(types_path):
            return ToolResult(success=False, error='条目不存在')
        
        try:
            types = load_json5_file(types_path)
            
            for type_info in types:
                type_id = type_info.get('id')
                is_builtin = type_info.get('isBuiltIn', False)
                entries_path = get_vocabulary_entries_path(self.project_path, type_id, is_builtin)
                
                if os.path.exists(entries_path):
                    entries = load_json5_file(entries_path)
                    entry = next((e for e in entries if e.get('id') == entry_id), None)
                    
                    if entry:
                        return ToolResult(
                            success=True,
                            data={
                                'entry': entry,
                                'typeId': type_id,
                                'typeName': type_info.get('name', type_id)
                            }
                        )
            
            return ToolResult(success=False, error=f'条目不存在: {entry_id}')
        except Exception as e:
            return ToolResult(success=False, error=f'查询条目失败: {e}')
    
    def _search_entries(self) -> ToolResult:
        """搜索条目"""
        keyword = self.get_param('keyword', '')
        type_id = self.get_param('typeId')
        field_names = self.get_param('fields', ['name'])  # 默认搜索名称字段
        limit = self.get_param('limit', 50)
        
        types_path = get_vocabulary_types_path(self.project_path)
        if not os.path.exists(types_path):
            return ToolResult(success=True, data={'entries': [], 'total': 0})
        
        try:
            types = load_json5_file(types_path)
            matched_entries = []
            keyword_lower = keyword.lower()
            
            # 确定要搜索的类型
            types_to_search = types
            if type_id:
                types_to_search = [t for t in types if t.get('id') == type_id]
            
            for type_info in types_to_search:
                tid = type_info.get('id')
                is_builtin = type_info.get('isBuiltIn', False)
                entries_path = get_vocabulary_entries_path(self.project_path, tid, is_builtin)
                
                if not os.path.exists(entries_path):
                    continue
                
                entries = load_json5_file(entries_path)
                
                for entry in entries:
                    # 搜索指定字段
                    matched = False
                    for field in field_names:
                        value = entry.get(field, '')
                        if isinstance(value, str) and keyword_lower in value.lower():
                            matched = True
                            break
                        elif isinstance(value, list):
                            # 处理标签数组等
                            for item in value:
                                if isinstance(item, str) and keyword_lower in item.lower():
                                    matched = True
                                    break
                    
                    # 同时搜索别名
                    if not matched:
                        aliases = entry.get('aliases', [])
                        for alias in aliases:
                            if keyword_lower in alias.lower():
                                matched = True
                                break
                    
                    if matched:
                        entry['_typeId'] = tid
                        entry['_typeName'] = type_info.get('name', tid)
                        matched_entries.append(entry)
            
            return ToolResult(
                success=True,
                data={
                    'entries': matched_entries[:limit],
                    'total': len(matched_entries),
                    'keyword': keyword
                }
            )
        except Exception as e:
            return ToolResult(success=False, error=f'搜索失败: {e}')


if __name__ == '__main__':
    run_tool(VocabularyQueryTool)
