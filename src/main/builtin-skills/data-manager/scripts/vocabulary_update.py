# -*- coding: utf-8 -*-
"""
词汇更新工具
支持更新词汇类型和条目
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.base_tool import BaseTool, ToolResult, run_tool
from utils.json5_parser import load_json5_file, save_json5_file
from utils.file_utils import (
    get_vocabulary_types_path,
    get_vocabulary_entries_path
)


class VocabularyUpdateTool(BaseTool):
    """词汇更新工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'update_entry')
        
        if action == 'update_type':
            return self._update_type()
        elif action == 'update_entry':
            return self._update_entry()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _update_type(self) -> ToolResult:
        """更新词汇类型"""
        type_id = self.get_required_param('typeId')
        
        types_path = get_vocabulary_types_path(self.project_path)
        if not os.path.exists(types_path):
            return ToolResult(success=False, error='词汇类型文件不存在')
        
        try:
            types = load_json5_file(types_path)
            
            # 查找类型
            type_index = next((i for i, t in enumerate(types) if t.get('id') == type_id), None)
            
            if type_index is None:
                return ToolResult(success=False, error=f'类型不存在: {type_id}')
            
            type_info = types[type_index]
            
            # 不允许修改内置类型的基本信息
            if type_info.get('isBuiltIn', False):
                return ToolResult(success=False, error='内置类型不能修改')
            
            # 获取可更新的字段
            if self.get_param('name') is not None:
                new_name = self.get_param('name').strip()
                # 检查名称是否重复
                for i, t in enumerate(types):
                    if i != type_index and t.get('name', '').lower() == new_name.lower():
                        return ToolResult(success=False, error=f'类型名称已存在: {new_name}')
                type_info['name'] = new_name
            
            if self.get_param('icon') is not None:
                type_info['icon'] = self.get_param('icon')
            
            if self.get_param('color') is not None:
                type_info['color'] = self.get_param('color')
            
            if self.get_param('description') is not None:
                type_info['description'] = self.get_param('description')
            
            if self.get_param('typeFields') is not None:
                # 更新字段定义
                new_fields = self.get_param('typeFields')
                processed_fields = []
                for i, field in enumerate(new_fields):
                    processed_field = {
                        'id': field.get('id', f'field-{i}'),
                        'name': field.get('name', f'字段{i+1}'),
                        'type': field.get('type', 'text'),
                        'required': field.get('required', False),
                        'order': field.get('order', i)
                    }
                    if 'options' in field:
                        processed_field['options'] = field['options']
                    if 'defaultValue' in field:
                        processed_field['defaultValue'] = field['defaultValue']
                    if 'placeholder' in field:
                        processed_field['placeholder'] = field['placeholder']
                    processed_fields.append(processed_field)
                type_info['fields'] = processed_fields
            
            # 更新时间戳
            type_info['updatedAt'] = self.get_timestamp()
            types[type_index] = type_info
            save_json5_file(types_path, types)
            
            return ToolResult(
                success=True,
                data={'type': type_info},
                message=f'成功更新类型: {type_info.get("name")}'
            )
            
        except Exception as e:
            return ToolResult(success=False, error=f'更新类型失败: {e}')
    
    def _update_entry(self) -> ToolResult:
        """更新词汇条目"""
        entry_id = self.get_required_param('entryId')
        
        # 获取可更新的字段
        updates = {}
        
        if self.get_param('name') is not None:
            updates['name'] = self.get_param('name').strip()
        
        if self.get_param('aliases') is not None:
            updates['aliases'] = self.get_param('aliases')
        
        if self.get_param('color') is not None:
            updates['color'] = self.get_param('color')
        
        if self.get_param('fields') is not None:
            updates['fields'] = self.get_param('fields')
        
        if self.get_param('tags') is not None:
            updates['tags'] = self.get_param('tags')
        
        if self.get_param('description') is not None:
            updates['description'] = self.get_param('description')
        
        if self.get_param('linkedFilePath') is not None:
            updates['linkedFilePath'] = self.get_param('linkedFilePath')
        
        if not updates:
            return ToolResult(success=False, error='没有提供要更新的字段')
        
        # 查找条目
        types_path = get_vocabulary_types_path(self.project_path)
        if not os.path.exists(types_path):
            return ToolResult(success=False, error='词汇类型文件不存在')
        
        try:
            types = load_json5_file(types_path)
            
            for type_info in types:
                type_id = type_info.get('id')
                is_builtin = type_info.get('isBuiltIn', False)
                entries_path = get_vocabulary_entries_path(self.project_path, type_id, is_builtin)
                
                if not os.path.exists(entries_path):
                    continue
                
                entries = load_json5_file(entries_path)
                entry_index = next((i for i, e in enumerate(entries) if e.get('id') == entry_id), None)
                
                if entry_index is not None:
                    # 检查名称是否重复（如果更新了名称）
                    if 'name' in updates:
                        new_name = updates['name'].lower()
                        for i, e in enumerate(entries):
                            if i != entry_index and e.get('name', '').lower() == new_name:
                                return ToolResult(
                                    success=False,
                                    error=f'名称已存在: {updates["name"]}'
                                )
                    
                    # 更新条目
                    now = self.get_timestamp()
                    entries[entry_index].update(updates)
                    entries[entry_index]['updatedAt'] = now
                    
                    # 如果更新了类型名称，同步更新
                    if type_info.get('name'):
                        entries[entry_index]['typeName'] = type_info.get('name')
                    
                    save_json5_file(entries_path, entries)
                    
                    return ToolResult(
                        success=True,
                        data={'entry': entries[entry_index]},
                        message=f'成功更新词汇: {entries[entry_index].get("name")}'
                    )
            
            return ToolResult(success=False, error=f'条目不存在: {entry_id}')
            
        except Exception as e:
            return ToolResult(success=False, error=f'更新失败: {e}')


if __name__ == '__main__':
    run_tool(VocabularyUpdateTool)