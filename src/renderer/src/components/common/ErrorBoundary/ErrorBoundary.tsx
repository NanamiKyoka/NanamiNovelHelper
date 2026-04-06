/**
 * 错误边界组件
 * 
 * 捕获子组件的 JavaScript 错误，防止整个应用崩溃
 */

import { Component, ErrorInfo, ReactNode } from 'react'
import { Result, Button } from 'antd'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
  /** 自定义错误回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** 自定义回退 UI */
  fallback?: ReactNode
  /** 重置按钮文字 */
  resetButtonText?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 错误边界组件
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, resetButtonText = '重试' } = this.props

    if (hasError) {
      if (fallback) {
        return fallback
      }

      return (
        <div className={styles.container}>
          <Result
            status="error"
            title="页面出错了"
            subTitle={error?.message || '抱歉，页面遇到了一些问题'}
            extra={[
              <Button key="reset" type="primary" onClick={this.handleReset}>
                {resetButtonText}
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
            ]}
          />
        </div>
      )
    }

    return children
  }
}

/**
 * 功能模块错误边界
 * 用于包裹独立功能模块，防止一个模块出错影响其他模块
 */
export function ModuleErrorBoundary({
  children,
  moduleName,
}: {
  children: ReactNode
  moduleName: string
}) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`[${moduleName}] Error:`, error, errorInfo)
      }}
      resetButtonText="重新加载模块"
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
