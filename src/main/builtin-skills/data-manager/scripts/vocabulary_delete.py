# -*- coding: utf-8 -*-
"""
词汇删除工具
支持删除词汇类型和条目
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


class VocabularyDeleteTool(BaseTool):
    """词汇删除工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'delete_entry')
        
        if action == 'delete_type':
            return self._delete_type()
        elif action == 'delete_entry':
            return self._delete_entry()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _delete_type(self) -> ToolResult:
        """删除词汇类型"""
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
            type_name = type_info.get('name', type_id)
            is_builtin = type_info.get('isBuiltIn', False)
            
            # 不允许删除内置类型
            if is_builtin:
                return ToolResult(success=False, error=f'内置类型不能删除: {type_name}')
            
            # 删除类型
            types.pop(type_index)
            save_json5_file(types_path, types)
            
            # 删除对应的条目文件
            entries_path = get_vocabulary_entries_path(self.project_path, type_id, is_builtin)
            if os.path.exists(entries_path):
                os.remove(entries_path)
            
            return ToolResult(
                success=True,
                data={
                    'deletedId': type_id,
                    'deletedName': type_name
                },
                message=f'成功删除词汇类型: {type_name}'
            )
            
        except Exception as e:
            return ToolResult(success=False, error=f'删除类型失败: {e}')
    
    def _delete_entry(self) -> ToolResult:
        """删除词汇条目"""
        entry_id = self.get_required_param('entryId')
        
        # 可选：是否同时删除关联文件
        delete_linked_file = self.get_param('deleteLinkedFile', False)
        
        # 查找并删除条目
        types_path = get_vocabulary_types_path(self.project_path)
        if not os.path.exists(types_path):
            return ToolResult(success=False, error='词汇类型文件不存在')
        
        try:
            types = load_json5_file(types_path)
            deleted_entry = None
            deleted_file = None
            
            for type_info in types:
                type_id = type_info.get('id')
                is_builtin = type_info.get('isBuiltIn', False)
                entries_path = get_vocabulary_entries_path(self.project_path, type_id, is_builtin)
                
                if not os.path.exists(entries_path):
                    continue
                
                entries = load_json5_file(entries_path)
                entry_index = next((i for i, e in enumerate(entries) if e.get('id') == entry_id), None)
                
                if entry_index is not None:
                    deleted_entry = entries[entry_index]
                    entry_name = deleted_entry.get('name', entry_id)
                    
                    # 检查是否需要删除关联文件
                    if delete_linked_file and deleted_entry.get('linkedFilePath'):
                        linked_path = os.path.join(
                            self.project_path, 
                            deleted_entry['linkedFilePath']
                        )
                        if os.path.exists(linked_path):
                            try:
                                os.remove(linked_path)
                                deleted_file = linked_path
                            except Exception:
                                # 文件删除失败不影响条目删除
                                pass
                    
                    # 删除条目
                    entries.pop(entry_index)
                    save_json5_file(entries_path, entries)
                    
                    result_data = {
                        'deletedId': entry_id,
                        'deletedName': entry_name,
                        'typeId': type_id
                    }
                    
                    if deleted_file:
                        result_data['deletedFile'] = deleted_file
                    
                    return ToolResult(
                        success=True,
                        data=result_data,
                        message=f'成功删除词汇: {entry_name}'
                    )
            
            return ToolResult(success=False, error=f'条目不存在: {entry_id}')
            
        except Exception as e:
            return ToolResult(success=False, error=f'删除失败: {e}')


if __name__ == '__main__':
    run_tool(VocabularyDeleteTool)