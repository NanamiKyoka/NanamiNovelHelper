/**
 * 统一确认对话框组件
 * 
 * 提供一致的用户确认体验
 */

import { Modal, ModalProps } from 'antd'
import { ExclamationCircleOutlined, InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps extends Omit<ModalProps, 'onOk' | 'onCancel'> {
  /** 对话框类型 */
  type?: 'confirm' | 'info' | 'success' | 'warning' | 'danger'
  /** 确认按钮文字 */
  confirmText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 确认回调 */
  onConfirm?: () => void | Promise<void>
  /** 取消回调 */
  onCancel?: () => void
  /** 是否显示加载状态 */
  loading?: boolean
}

/**
 * 确认对话框类型配置
 */
const TYPE_CONFIG = {
  confirm: {
    icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
    okType: 'primary' as const,
  },
  info: {
    icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
    okType: 'primary' as const,
  },
  success: {
    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    okType: 'primary' as const,
  },
  warning: {
    icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
    okType: 'primary' as const,
  },
  danger: {
    icon: <CloseCircleOutlined style={{ color: '#f5222d' }} />,
    okType: 'primary' as const,
  },
}

/**
 * 确认对话框组件
 */
export function ConfirmDialog({
  type = 'confirm',
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  loading,
  title,
  children,
  ...restProps
}: ConfirmDialogProps) {
  const config = TYPE_CONFIG[type]
  const titleId = 'confirm-dialog-title'

  return (
    <Modal
      {...restProps}
      title={
        <div className={styles.title} id={titleId}>
          {config.icon}
          <span>{title}</span>
        </div>
      }
      okText={confirmText}
      cancelText={cancelText}
      okType={config.okType}
      onOk={async () => {
        await onConfirm?.()
      }}
      onCancel={onCancel}
      confirmLoading={loading}
      maskClosable={false}
      aria-labelledby={titleId}
      aria-modal="true"
    >
      {children}
    </Modal>
  )
}

/**
 * 删除确认对话框
 */
export function DeleteConfirmDialog({
  title = '确认删除',
  content = '此操作不可撤销，确定要删除吗？',
  onConfirm,
  onCancel,
  loading,
  ...restProps
}: {
  title?: string
  content?: React.ReactNode
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  loading?: boolean
} & Omit<ModalProps, 'title' | 'onOk' | 'onCancel'>) {
  return (
    <ConfirmDialog
      type="danger"
      title={title}
      confirmText="删除"
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
      {...restProps}
    >
      {content}
    </ConfirmDialog>
  )
}

/**
 * 保存确认对话框（用于未保存提示）
 */
export function UnsavedConfirmDialog({
  onSave,
  onDiscard,
  onCancel,
  loading,
}: {
  onSave?: () => void | Promise<void>
  onDiscard?: () => void
  onCancel?: () => void
  loading?: boolean
}) {
  const titleId = 'unsaved-dialog-title'
  
  return (
    <Modal
      title={
        <div className={styles.title} id={titleId}>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>未保存的更改</span>
        </div>
      }
      okText="保存"
      cancelText="取消"
      okType="primary"
      onOk={onSave}
      onCancel={onCancel}
      confirmLoading={loading}
      maskClosable={false}
      aria-labelledby={titleId}
      aria-modal="true"
      footer={[
        <button key="discard" className={styles.discardBtn} onClick={onDiscard} aria-label="不保存并关闭">
          不保存
        </button>,
        <button key="cancel" className={styles.cancelBtn} onClick={onCancel} aria-label="取消操作">
          取消
        </button>,
        <button key="save" className={styles.saveBtn} onClick={onSave} disabled={loading} aria-label="保存更改">
          {loading ? '保存中...' : '保存'}
        </button>,
      ]}
    >
      当前有未保存的更改，是否保存？
    </Modal>
  )
}

export default ConfirmDialog
