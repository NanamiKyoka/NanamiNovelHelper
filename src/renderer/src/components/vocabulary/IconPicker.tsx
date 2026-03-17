/**
 * 图标选择器组件
 * 支持 Ant Design 图标和 Emoji 表情
 */

import { useState } from 'react'
import { Modal, Tabs, Input, Tooltip, Segmented } from 'antd'
import {
  TeamOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  TagOutlined,
  StarOutlined,
  HeartOutlined,
  FireOutlined,
  CrownOutlined,
  BugOutlined,
  RocketOutlined,
  TrophyOutlined,
  BookOutlined,
  CloudOutlined,
  CompassOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FlagOutlined,
  HomeOutlined,
  KeyOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  PictureOutlined,
  PrinterOutlined,
  SafetyOutlined,
  ShopOutlined,
  SoundOutlined,
  ToolOutlined,
  UmbrellaOutlined,
  VideoCameraOutlined,
  WalletOutlined,
  CarOutlined,
  BankOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  DeliveredProcedureOutlined,
  FileOutlined,
  FolderOutlined,
  GlobalOutlined,
  HourglassOutlined,
  IdcardOutlined,
  LinkOutlined,
  LockOutlined,
  MailOutlined,
  NotificationOutlined,
  PaperClipOutlined,
  PoweroffOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  ScanOutlined,
  SearchOutlined,
  SettingOutlined,
  ShareAltOutlined,
  ShoppingCartOutlined,
  SkinOutlined,
  SmileOutlined,
  SyncOutlined,
  TabletOutlined,
  TransactionOutlined,
  UserOutlined,
  WifiOutlined,
  WarningOutlined
} from '@ant-design/icons'
import styles from './IconPicker.module.css'

// Ant Design 图标列表
const ANT_ICONS: { name: string; icon: React.ReactNode; label: string }[] = [
  { name: 'TeamOutlined', icon: <TeamOutlined />, label: '团队' },
  { name: 'EnvironmentOutlined', icon: <EnvironmentOutlined />, label: '地点' },
  { name: 'GiftOutlined', icon: <GiftOutlined />, label: '礼物' },
  { name: 'ThunderboltOutlined', icon: <ThunderboltOutlined />, label: '闪电' },
  { name: 'CalendarOutlined', icon: <CalendarOutlined />, label: '日历' },
  { name: 'TagOutlined', icon: <TagOutlined />, label: '标签' },
  { name: 'StarOutlined', icon: <StarOutlined />, label: '星星' },
  { name: 'HeartOutlined', icon: <HeartOutlined />, label: '心形' },
  { name: 'FireOutlined', icon: <FireOutlined />, label: '火焰' },
  { name: 'CrownOutlined', icon: <CrownOutlined />, label: '皇冠' },
  { name: 'BugOutlined', icon: <BugOutlined />, label: '虫子' },
  { name: 'RocketOutlined', icon: <RocketOutlined />, label: '火箭' },
  { name: 'TrophyOutlined', icon: <TrophyOutlined />, label: '奖杯' },
  { name: 'BookOutlined', icon: <BookOutlined />, label: '书本' },
  { name: 'CloudOutlined', icon: <CloudOutlined />, label: '云朵' },
  { name: 'CompassOutlined', icon: <CompassOutlined />, label: '指南针' },
  { name: 'DashboardOutlined', icon: <DashboardOutlined />, label: '仪表盘' },
  { name: 'ExperimentOutlined', icon: <ExperimentOutlined />, label: '实验' },
  { name: 'EyeOutlined', icon: <EyeOutlined />, label: '眼睛' },
  { name: 'FlagOutlined', icon: <FlagOutlined />, label: '旗帜' },
  { name: 'HomeOutlined', icon: <HomeOutlined />, label: '家' },
  { name: 'KeyOutlined', icon: <KeyOutlined />, label: '钥匙' },
  { name: 'MedicineBoxOutlined', icon: <MedicineBoxOutlined />, label: '药箱' },
  { name: 'PictureOutlined', icon: <PictureOutlined />, label: '图片' },
  { name: 'SafetyOutlined', icon: <SafetyOutlined />, label: '安全' },
  { name: 'ShopOutlined', icon: <ShopOutlined />, label: '商店' },
  { name: 'SoundOutlined', icon: <SoundOutlined />, label: '声音' },
  { name: 'ToolOutlined', icon: <ToolOutlined />, label: '工具' },
  { name: 'VideoCameraOutlined', icon: <VideoCameraOutlined />, label: '摄像' },
  { name: 'WalletOutlined', icon: <WalletOutlined />, label: '钱包' },
  { name: 'CarOutlined', icon: <CarOutlined />, label: '汽车' },
  { name: 'BankOutlined', icon: <BankOutlined />, label: '银行' },
  { name: 'ClockCircleOutlined', icon: <ClockCircleOutlined />, label: '时钟' },
  { name: 'GlobalOutlined', icon: <GlobalOutlined />, label: '地球' },
  { name: 'UserOutlined', icon: <UserOutlined />, label: '用户' },
  { name: 'WarningOutlined', icon: <WarningOutlined />, label: '警告' },
  { name: 'SmileOutlined', icon: <SmileOutlined />, label: '笑脸' },
  { name: 'SkinOutlined', icon: <SkinOutlined />, label: '皮肤' },
  { name: 'SettingOutlined', icon: <SettingOutlined />, label: '设置' },
]

// Emoji 列表（按类别分组）
const EMOJI_CATEGORIES = {
  '人物': ['👤', '👥', '👶', '👦', '👧', '👨', '👩', '👴', '👵', '🧑', '🧒', '🧔', '🧓', '💂', '👷', '🤴', '👸', '🧙', '🧚', '🧛', '🧜', '🧝', '🥷', '🦸', '🦹'],
  '动物': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥'],
  '物品': ['⚔️', '🗡️', '🔪', '🏹', '🛡️', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗝️', '🔒', '🔓', '🔔', '🔕', '📯', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '💊', '💉', '🩸', '🩹', '🩺', '🚿', '🛁', '🛀', '🧴', '🧷', '🧹', '🧺', '🧻', '🧼', '🧽', '🧯', '🛒', '🎁', '🎈', '🎀', '🎊', '🎉', '🎎', '🎏', '🎐', '🎑', '🧧', '🎒', '👛', '👜', '👝', '🛍️', '📦', '📧', '📨', '📩', '💌', '📥', '📤', '📋', '📁', '📂', '🗂️', '📅', '📆', '📇', '📈', '📉', '📊', '📌', '📍', '✂️', '📐', '📏', '🧮', '🎹', '🎸', '🎺', '🎻', '🪕', '🥁', '🪘', '🎤', '🎧', '📻', '🎷', '🪗', '🎯', '🎲', '♟️', '🎰', '🎮', '🎳', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️'],
  '自然': ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰', '🦀', '🐚', '🌍', '🌎', '🌏', '🌐', '🗺️', '🗾', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🧱', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🎡', '🎢', '💈', '🎪', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🛻', '🚚', '🚛', '🚜'],
  '食物': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🫙', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾'],
  '符号': ['⭐', '🌟', '✨', '💫', '🔥', '💥', '💢', '💦', '💨', '🕳️', '💣', '💬', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '🦠', '👨‍⚕️', '👩‍⚕️', '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍⚖️', '👩‍⚖️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀', '👨‍🚒', '👩‍🚒', '👮', '🕵️', '💂', '👷', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟'],
}

// 图标类型
export type IconType = 'ant' | 'emoji'

// 图标值
export interface IconValue {
  type: IconType
  value: string  // Ant 图标名称或 Emoji 字符
}

interface IconPickerProps {
  open: boolean
  value?: IconValue
  onChange: (value: IconValue) => void
  onCancel: () => void
}

// 获取图标预览组件
export function getIconPreview(iconValue: string | undefined, fallbackIcon?: React.ReactNode): React.ReactNode {
  if (!iconValue) return fallbackIcon || <TagOutlined />
  
  // 检查是否是 Emoji（包含 emoji 字符）
  if (/[\p{Emoji}]/u.test(iconValue) && iconValue.length <= 4) {
    return <span style={{ fontSize: 16 }}>{iconValue}</span>
  }
  
  // 查找 Ant Design 图标
  const antIcon = ANT_ICONS.find(i => i.name === iconValue)
  if (antIcon) {
    return antIcon.icon
  }
  
  return fallbackIcon || <TagOutlined />
}

function IconPicker({ open, value, onChange, onCancel }: IconPickerProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'ant' | 'emoji'>(
    value?.type || 'ant'
  )
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('人物')

  // 过滤 Ant 图标
  const filteredAntIcons = ANT_ICONS.filter(icon => 
    !searchText || 
    icon.label.includes(searchText) || 
    icon.name.toLowerCase().includes(searchText.toLowerCase())
  )

  // 处理 Ant 图标选择
  const handleAntIconSelect = (iconName: string) => {
    onChange({ type: 'ant', value: iconName })
  }

  // 处理 Emoji 选择
  const handleEmojiSelect = (emoji: string) => {
    onChange({ type: 'emoji', value: emoji })
  }

  // Emoji 类别列表
  const categories = Object.keys(EMOJI_CATEGORIES)

  return (
    <Modal
      title="选择图标"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={480}
      destroyOnHidden
    >
      <Segmented
        block
        options={[
          { label: '图标库', value: 'ant' },
          { label: 'Emoji 表情', value: 'emoji' },
        ]}
        value={activeTab}
        onChange={(v) => setActiveTab(v as 'ant' | 'emoji')}
        style={{ marginBottom: 16 }}
      />

      {activeTab === 'ant' && (
        <>
          <Input
            placeholder="搜索图标..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginBottom: 12 }}
            allowClear
          />
          <div className={styles.iconGrid}>
            {filteredAntIcons.map((icon) => (
              <Tooltip key={icon.name} title={icon.label}>
                <div
                  className={`${styles.iconItem} ${value?.type === 'ant' && value?.value === icon.name ? styles.selected : ''}`}
                  onClick={() => handleAntIconSelect(icon.name)}
                >
                  {icon.icon}
                </div>
              </Tooltip>
            ))}
          </div>
        </>
      )}

      {activeTab === 'emoji' && (
        <>
          <Segmented
            options={categories}
            value={selectedCategory}
            onChange={(v) => setSelectedCategory(v as string)}
            style={{ marginBottom: 12 }}
          />
          <div className={styles.emojiGrid}>
            {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.map((emoji) => (
              <div
                key={emoji}
                className={`${styles.emojiItem} ${value?.type === 'emoji' && value?.value === emoji ? styles.selected : ''}`}
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}

export default IconPicker
