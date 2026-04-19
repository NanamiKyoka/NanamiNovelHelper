import { useMemo } from 'react'
import * as Icons from '@ant-design/icons'
import { Tooltip } from 'antd'
import styles from './IconPicker.module.css'

const AVAILABLE_ICONS = [
  'HomeOutlined', 'BankOutlined', 'ShopOutlined', 'CoffeeOutlined',
  'AlertOutlined', 'AlertTwoTone', 'CrownOutlined', 'FireOutlined',
  'CloudOutlined', 'SunOutlined', 'AimOutlined', 'CompassOutlined',
  'GlobalOutlined', 'EnvironmentOutlined', 'ApiOutlined', 'BugOutlined',
  'UserOutlined', 'TeamOutlined', 'GiftOutlined', 'WarningOutlined',
  'SettingOutlined', 'ToolOutlined', 'StarOutlined', 'HeartOutlined',
  'ThunderboltOutlined', 'RocketOutlined', 'CarOutlined', 'PhoneOutlined',
  'MailOutlined', 'MessageOutlined', 'NotificationOutlined', 'SoundOutlined',
  'CameraOutlined', 'VideoCameraOutlined', 'PictureOutlined', 'FileOutlined',
  'FolderOutlined', 'BookOutlined', 'ReadOutlined', 'EditOutlined',
  'DeleteOutlined', 'CopyOutlined', 'ScissorOutlined', 'SnippetsOutlined',
  'DiffOutlined', 'HighlightOutlined', 'AlignLeftOutlined', 'OrderedListOutlined',
  'LineOutlined', 'BorderOutlined', 'RadiusSettingOutlined', 'ColumnWidthOutlined',
  'LoginOutlined', 'LogoutOutlined', 'VerticalAlignTopOutlined', 'DownOutlined',
  'HistoryOutlined', 'SearchOutlined', 'FilterOutlined', 'SyncOutlined',
  'DownloadOutlined', 'UploadOutlined', 'ExportOutlined', 'ImportOutlined',
  'EyeOutlined', 'EyeInvisibleOutlined', 'LockOutlined', 'UnlockOutlined',
  'KeyOutlined', 'SafetyOutlined', 'SecurityScanOutlined', 'InsuranceOutlined',
  'DollarOutlined', 'EuroOutlined', 'GoldOutlined', 'WalletOutlined',
  'ShoppingCartOutlined', 'ShoppingOutlined', 'TagsOutlined', 'AppstoreOutlined',
  'DashboardOutlined', 'ControlOutlined', 'DesktopOutlined', 'MobileOutlined',
  'TabletOutlined', 'LaptopOutlined', 'WifiOutlined', 'LinkOutlined'
]

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const SelectedIcon = useMemo(() => {
    return (Icons as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>)[value] || Icons.QuestionCircleOutlined
  }, [value])
  
  return (
    <div className={styles.iconPicker}>
      <div className={styles.selectedIcon}>
        <SelectedIcon style={{ fontSize: 24 }} />
        <span className={styles.selectedName}>{value}</span>
      </div>
      <div className={styles.iconGrid}>
        {AVAILABLE_ICONS.map(iconName => {
          const IconComponent = (Icons as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>)[iconName]
          if (!IconComponent) return null
          
          return (
            <Tooltip key={iconName} title={iconName}>
              <button
                className={`${styles.iconButton} ${value === iconName ? styles.iconButtonActive : ''}`}
                onClick={() => onChange(iconName)}
              >
                <IconComponent style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
