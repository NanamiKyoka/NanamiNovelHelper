# -*- coding: utf-8 -*-
"""
词汇添加工具
支持添加词汇类型和条目
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


class VocabularyAddTool(BaseTool):
    """词汇添加工具"""
    
    def execute(self) -> ToolResult:
        action = self.get_param('action', 'add_entry')
        
        if action == 'add_type':
            return self._add_type()
        elif action == 'add_entry':
            return self._add_entry()
        else:
            return ToolResult(success=False, error=f'未知操作: {action}')
    
    def _add_type(self) -> ToolResult:
        """添加新的词汇类型"""
        # 获取必需参数
        name = self.get_required_param('name')
        
        # 获取可选参数
        type_id = self.get_param('typeId')  # 可选，不提供则自动生成 UUID
        icon = self.get_param('icon', 'folder')
        color = self.get_param('color', '#1890ff')
        type_fields = self.get_param('typeFields', [])  # 类型的字段定义
        description = self.get_param('description', '')
        
        types_path = get_vocabulary_types_path(self.project_path)
        
        # 确保目录存在
        types_dir = os.path.dirname(types_path)
        if not os.path.exists(types_dir):
            os.makedirs(types_dir, exist_ok=True)
        
        try:
            # 读取现有类型
            if os.path.exists(types_path):
                types = load_json5_file(types_path)
            else:
                types = []
            
            # 检查名称是否重复
            for existing in types:
                if existing.get('name', '').lower() == name.lower():
                    return ToolResult(
                        success=False,
                        error=f'类型名称已存在: {name}'
                    )
            
            # 生成类型 ID（使用 UUID，与手动创建一致）
            if not type_id:
                type_id = self.generate_id()
                
                # 确保 ID 唯一
                while any(t.get('id') == type_id for t in types):
                    type_id = self.generate_id()
            
            # 检查 ID 是否重复
            for existing in types:
                if existing.get('id') == type_id:
                    return ToolResult(
                        success=False,
                        error=f'类型 ID 已存在: {type_id}'
                    )
            
            # 获取最大排序号
            max_order = max((t.get('order', 0) for t in types), default=-1)
            
            # 处理字段定义，添加 order
            processed_fields = []
            for i, field in enumerate(type_fields):
                processed_field = {
                    'id': field.get('id', f'field-{i}'),
                    'name': field.get('name', f'字段{i+1}'),
                    'type': field.get('type', 'text'),
                    'required': field.get('required', False),
                    'order': field.get('order', i)
                }
                # 添加可选属性
                if 'options' in field:
                    processed_field['options'] = field['options']
                if 'defaultValue' in field:
                    processed_field['defaultValue'] = field['defaultValue']
                if 'placeholder' in field:
                    processed_field['placeholder'] = field['placeholder']
                processed_fields.append(processed_field)
            
            # 创建新类型
            now = self.get_timestamp()
            new_type = {
                'id': type_id,
                'name': name.strip(),
                'icon': icon,
                'color': color,
                'fields': processed_fields,
                'tableConfig': self._generate_default_table_config(processed_fields),
                'isBuiltIn': False,
                'order': max_order + 1,
                'description': description,
                'createdAt': now,
                'updatedAt': now
            }
            
            # 添加类型
            types.append(new_type)
            save_json5_file(types_path, types)
            
            # 创建对应的条目文件（空数组）
            entries_path = get_vocabulary_entries_path(self.project_path, type_id, is_builtin=False)
            entries_dir = os.path.dirname(entries_path)
            if not os.path.exists(entries_dir):
                os.makedirs(entries_dir, exist_ok=True)
            save_json5_file(entries_path, [])
            
            return ToolResult(
                success=True,
                data={'type': new_type},
                message=f'成功创建词汇类型: {name}'
            )
            
        except Exception as e:
            return ToolResult(success=False, error=f'创建类型失败: {e}')
    
    def _generate_default_table_config(self, fields):
        """根据字段生成默认表格配置"""
        config = []
        for i, field in enumerate(fields[:4]):  # 最多显示前4个字段
            if field.get('id') != 'name':  # name 字段通常已显示
                config.append({
                    'fieldId': field.get('id'),
                    'visible': True,
                    'width': 100,
                    'order': i
                })
        return config
    
    def _add_entry(self) -> ToolResult:
        """添加词汇条目"""
        # 获取必需参数
        type_id = self.get_required_param('typeId')
        name = self.get_required_param('name')
        
        # 获取可选参数
        fields = self.get_param('fields', {})
        aliases = self.get_param('aliases', [])
        tags = self.get_param('tags', [])
        color = self.get_param('color')
        description = self.get_param('description', '')
        linked_file_path = self.get_param('linkedFilePath')
        
        # 验证类型是否存在
        types_path = get_vocabulary_types_path(self.project_path)
        if not os.path.exists(types_path):
            return ToolResult(success=False, error='词汇类型文件不存在，请先初始化项目')
        
        try:
            types = load_json5_file(types_path)
            type_info = next((t for t in types if t.get('id') == type_id), None)
            
            if not type_info:
                return ToolResult(success=False, error=f'类型不存在: {type_id}')
            
            is_builtin = type_info.get('isBuiltIn', False)
            type_name = type_info.get('name', type_id)
            
            # 验证必填字段
            type_fields = type_info.get('fields', [])
            for field in type_fields:
                if field.get('required', False):
                    field_id = field.get('id')
                    if field_id not in fields and field_id != 'name':  # name 已单独处理
                        # 检查默认值
                        if field.get('defaultValue') is None:
                            return ToolResult(
                                success=False,
                                error=f'缺少必填字段: {field.get("name", field_id)}'
                            )
            
            # 如果没有提供颜色，使用类型默认颜色
            if not color:
                color = type_info.get('color', '#1890ff')
            
            # 创建新条目
            now = self.get_timestamp()
            new_entry = {
                'id': self.generate_id(),
                'name': name.strip(),
                'aliases': aliases,
                'color': color,
                'typeId': type_id,
                'typeName': type_name,
                'fields': fields,
                'tags': tags,
                'description': description,
                'createdAt': now,
                'updatedAt': now
            }
            
            if linked_file_path:
                new_entry['linkedFilePath'] = linked_file_path
            
            # 读取现有条目
            entries_path = get_vocabulary_entries_path(self.project_path, type_id, is_builtin)
            
            if os.path.exists(entries_path):
                entries = load_json5_file(entries_path)
            else:
                entries = []
            
            # 检查名称是否重复
            for existing in entries:
                if existing.get('name', '').lower() == name.lower():
                    return ToolResult(
                        success=False,
                        error=f'名称已存在: {name}'
                    )
            
            # 添加新条目
            entries.append(new_entry)
            save_json5_file(entries_path, entries)
            
            return ToolResult(
                success=True,
                data={'entry': new_entry},
                message=f'成功添加词汇: {name}'
            )
            
        except Exception as e:
            return ToolResult(success=False, error=f'添加失败: {e}')


if __name__ == '__main__':
    run_tool(VocabularyAddTool)
