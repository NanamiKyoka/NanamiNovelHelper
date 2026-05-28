/**
 * 错误边界组件
 *
 * 捕获子组件的 JavaScript 错误，防止整个应用崩溃。
 * 在回退界面中显示错误码，便于用户反馈和排查。
 */

import { Component, ErrorInfo, ReactNode } from 'react'
import { Result, Button, Typography } from 'antd'
import { parseIpcError, extractErrorCode } from '@utils/error'
import { ErrorCode } from '@shared/errors'
import styles from './ErrorBoundary.module.css'

const { Text } = Typography

interface ErrorBoundaryProps {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, code: ErrorCode) => void
  fallback?: ReactNode
  resetButtonText?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorCode: ErrorCode
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorCode: ErrorCode.UNKNOWN }
  }

  static getDerivedStateFromError(error: Error): Pick<ErrorBoundaryState, 'hasError' | 'error'> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const code = extractErrorCode(error)
    this.setState({ errorCode: code })

    const appError = parseIpcError(error)
    console.error(
      `[ErrorBoundary] [${appError.code}] ${error.message}`,
      '\nComponent Stack:',
      errorInfo.componentStack
    )
    this.props.onError?.(error, errorInfo, code)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorCode: ErrorCode.UNKNOWN })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    const { hasError, error, errorCode } = this.state
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
            subTitle={
              <div>
                <p style={{ marginBottom: 4 }}>{error?.message || '抱歉，页面遇到了一些问题'}</p>
                {errorCode !== ErrorCode.UNKNOWN && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 12 }}
                    code
                  >
                    {errorCode}
                  </Text>
                )}
              </div>
            }
            extra={[
              <Button key="reset" type="primary" onClick={this.handleReset}>
                {resetButtonText}
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>
            ]}
          />
        </div>
      )
    }

    return children
  }
}

export function ModuleErrorBoundary({
  children,
  moduleName
}: {
  children: ReactNode
  moduleName: string
}) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo, code) => {
        console.error(`[${moduleName}][${code}] Error:`, error, errorInfo)
      }}
      resetButtonText="重新加载模块"
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary