# -*- coding: utf-8 -*-
"""
基础工具类
所有 SKILL 工具的基类
"""

import sys
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, asdict


@dataclass
class ToolResult:
    """工具执行结果"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = {'success': self.success}
        if self.data is not None:
            result['data'] = self.data
        if self.error:
            result['error'] = self.error
        if self.message:
            result['message'] = self.message
        return result
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


class BaseTool:
    """
    工具基类
    
    子类需要实现 execute() 方法
    """
    
    def __init__(self):
        self.project_path: Optional[str] = None
        self.context: Dict[str, Any] = {}
        self.parameters: Dict[str, Any] = {}
    
    def run(self) -> ToolResult:
        """
        运行工具的入口方法
        从标准输入读取参数和上下文
        """
        try:
            # 从标准输入读取输入数据
            input_data = self._read_input()
            
            # 解析参数和上下文
            self.parameters = input_data.get('parameters', {})
            self.context = input_data.get('context', {})
            self.project_path = self.context.get('projectPath', '')
            
            if not self.project_path:
                return ToolResult(success=False, error='项目路径未提供')
            
            # 执行工具逻辑
            return self.execute()
            
        except json.JSONDecodeError as e:
            return ToolResult(success=False, error=f'JSON 解析错误: {e}')
        except Exception as e:
            return ToolResult(success=False, error=f'执行错误: {str(e)}')
    
    def _read_input(self) -> Dict[str, Any]:
        """从标准输入读取 JSON 数据"""
        input_str = sys.stdin.read()
        # 移除可能的 UTF-8 BOM
        if input_str.startswith('\ufeff'):
            input_str = input_str[1:]
        return json.loads(input_str)
    
    def execute(self) -> ToolResult:
        """
        执行工具逻辑
        
        子类必须实现此方法
        """
        raise NotImplementedError('子类必须实现 execute() 方法')
    
    # ============ 辅助方法 ============
    
    @staticmethod
    def generate_id() -> str:
        """生成唯一 ID"""
        return str(uuid.uuid4())
    
    @staticmethod
    def get_timestamp() -> str:
        """获取当前时间戳（ISO 8601 格式）"""
        return datetime.now().isoformat() + 'Z'
    
    def get_param(self, key: str, default: Any = None) -> Any:
        """获取参数值"""
        return self.parameters.get(key, default)
    
    def get_required_param(self, key: str) -> Any:
        """获取必需参数，如果不存在则抛出异常"""
        if key not in self.parameters:
            raise ValueError(f'缺少必需参数: {key}')
        return self.parameters[key]
    
    def get_current_chapter(self) -> Optional[Dict[str, Any]]:
        """获取当前章节信息"""
        return self.context.get('currentChapter')
    
    def get_selected_text(self) -> Optional[str]:
        """获取用户选中的文本"""
        return self.context.get('selectedText')


def run_tool(tool_class):
    """
    运行工具的便捷函数
    
    用法：
        if __name__ == '__main__':
            run_tool(MyTool)
    """
    tool = tool_class()
    result = tool.run()
    print(result.to_json())
