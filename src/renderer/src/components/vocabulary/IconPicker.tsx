/**
 * 图标选择器组件
 * 支持 Ant Design 图标和 Emoji 表情
 */

import { useState } from 'react'
import { Modal, Input, Tooltip, Segmented } from 'antd'
import {
  // 人物相关
  TeamOutlined,
  UserOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
  WomanOutlined,
  ManOutlined,
  
  // 地点相关
  EnvironmentOutlined,
  HomeOutlined,
  BankOutlined,
  ShopOutlined,
  AimOutlined,
  PushpinOutlined,
  CompassOutlined,
  GlobalOutlined,
  
  // 物品相关
  GiftOutlined,
  InboxOutlined,
  ContainerOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  HddOutlined,
  DatabaseOutlined,
  CloudOutlined,
  CloudServerOutlined,
  
  // 武器/战斗相关
  ThunderboltOutlined,
  FireOutlined,
  TrophyOutlined,
  FlagOutlined,
  
  // 魔法/特殊相关
  BulbOutlined,
  ExperimentOutlined,
  RocketOutlined,
  StarOutlined,
  CrownOutlined,
  
  // 时间/事件相关
  CalendarOutlined,
  ClockCircleOutlined,
  HourglassOutlined,
  HistoryOutlined,
  ScheduleOutlined,
  
  // 书籍/知识相关
  BookOutlined,
  FileTextOutlined,
  FileOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  ReadOutlined,
  SolutionOutlined,
  
  // 状态/标识相关
  TagOutlined,
  TagsOutlined,
  HeartOutlined,
  LikeOutlined,
  SmileOutlined,
  FrownOutlined,
  MehOutlined,
  CheckOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  
  // 工具/操作相关
  ToolOutlined,
  SettingOutlined,
  ControlOutlined,
  DashboardOutlined,
  ScanOutlined,
  SearchOutlined,
  EyeOutlined,
  
  // 安全/权限相关
  KeyOutlined,
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  InsuranceOutlined,
  
  // 医疗/科技相关
  MedicineBoxOutlined,
  BugOutlined,
  ApiOutlined,
  CodeOutlined,
  
  // 设备/媒体相关
  TabletOutlined,
  PhoneOutlined,
  CameraOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  SoundOutlined,
  CustomerServiceOutlined,
  AudioOutlined,
  
  // 通讯相关
  NotificationOutlined,
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  LinkOutlined,
  PaperClipOutlined,
  ShareAltOutlined,
  SendOutlined,
  
  // 文件操作相关
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  SyncOutlined,
  
  // 金融/交通相关
  TransactionOutlined,
  WalletOutlined,
  CarOutlined,
} from '@ant-design/icons'
import styles from './IconPicker.module.css'

// Ant Design 图标列表（分类整理，共100+个图标）
const ANT_ICONS: { name: string; icon: React.ReactNode; label: string; category?: string }[] = [
  // === 人物相关 ===
  { name: 'UserOutlined', icon: <UserOutlined />, label: '用户', category: '人物' },
  { name: 'TeamOutlined', icon: <TeamOutlined />, label: '团队', category: '人物' },
  { name: 'UserAddOutlined', icon: <UserAddOutlined />, label: '添加用户', category: '人物' },
  { name: 'UsergroupAddOutlined', icon: <UsergroupAddOutlined />, label: '用户组', category: '人物' },
  { name: 'WomanOutlined', icon: <WomanOutlined />, label: '女性', category: '人物' },
  { name: 'ManOutlined', icon: <ManOutlined />, label: '男性', category: '人物' },
  
  // === 地点相关 ===
  { name: 'EnvironmentOutlined', icon: <EnvironmentOutlined />, label: '地点', category: '地点' },
  { name: 'HomeOutlined', icon: <HomeOutlined />, label: '家', category: '地点' },
  { name: 'BankOutlined', icon: <BankOutlined />, label: '银行/机构', category: '地点' },
  { name: 'ShopOutlined', icon: <ShopOutlined />, label: '商店', category: '地点' },
  { name: 'AimOutlined', icon: <AimOutlined />, label: '目标', category: '地点' },
  { name: 'PushpinOutlined', icon: <PushpinOutlined />, label: '图钉', category: '地点' },
  { name: 'CompassOutlined', icon: <CompassOutlined />, label: '指南针', category: '地点' },
  { name: 'GlobalOutlined', icon: <GlobalOutlined />, label: '地球', category: '地点' },
  
  // === 物品相关 ===
  { name: 'GiftOutlined', icon: <GiftOutlined />, label: '礼物', category: '物品' },
  { name: 'InboxOutlined', icon: <InboxOutlined />, label: '收件箱', category: '物品' },
  { name: 'ContainerOutlined', icon: <ContainerOutlined />, label: '容器', category: '物品' },
  { name: 'ShoppingOutlined', icon: <ShoppingOutlined />, label: '购物', category: '物品' },
  { name: 'ShoppingCartOutlined', icon: <ShoppingCartOutlined />, label: '购物车', category: '物品' },
  { name: 'AppstoreOutlined', icon: <AppstoreOutlined />, label: '应用', category: '物品' },
  { name: 'HddOutlined', icon: <HddOutlined />, label: '硬盘', category: '物品' },
  { name: 'DatabaseOutlined', icon: <DatabaseOutlined />, label: '数据库', category: '物品' },
  
  // === 武器/战斗相关 ===
  { name: 'ThunderboltOutlined', icon: <ThunderboltOutlined />, label: '闪电', category: '战斗' },
  { name: 'FireOutlined', icon: <FireOutlined />, label: '火焰', category: '战斗' },
  { name: 'TrophyOutlined', icon: <TrophyOutlined />, label: '奖杯', category: '战斗' },
  { name: 'FlagOutlined', icon: <FlagOutlined />, label: '旗帜', category: '战斗' },
  
  // === 魔法/特殊相关 ===
  { name: 'BulbOutlined', icon: <BulbOutlined />, label: '灯泡', category: '魔法' },
  { name: 'ExperimentOutlined', icon: <ExperimentOutlined />, label: '实验', category: '魔法' },
  { name: 'RocketOutlined', icon: <RocketOutlined />, label: '火箭', category: '魔法' },
  { name: 'StarOutlined', icon: <StarOutlined />, label: '星星', category: '魔法' },
  { name: 'CrownOutlined', icon: <CrownOutlined />, label: '皇冠', category: '魔法' },
  
  // === 时间/事件相关 ===
  { name: 'CalendarOutlined', icon: <CalendarOutlined />, label: '日历', category: '时间' },
  { name: 'ClockCircleOutlined', icon: <ClockCircleOutlined />, label: '时钟', category: '时间' },
  { name: 'HourglassOutlined', icon: <HourglassOutlined />, label: '沙漏', category: '时间' },
  { name: 'HistoryOutlined', icon: <HistoryOutlined />, label: '历史', category: '时间' },
  { name: 'ScheduleOutlined', icon: <ScheduleOutlined />, label: '日程', category: '时间' },
  
  // === 书籍/知识相关 ===
  { name: 'BookOutlined', icon: <BookOutlined />, label: '书本', category: '知识' },
  { name: 'FileTextOutlined', icon: <FileTextOutlined />, label: '文本文件', category: '知识' },
  { name: 'FileOutlined', icon: <FileOutlined />, label: '文件', category: '知识' },
  { name: 'FolderOutlined', icon: <FolderOutlined />, label: '文件夹', category: '知识' },
  { name: 'FolderOpenOutlined', icon: <FolderOpenOutlined />, label: '打开文件夹', category: '知识' },
  { name: 'ReadOutlined', icon: <ReadOutlined />, label: '阅读', category: '知识' },
  { name: 'SolutionOutlined', icon: <SolutionOutlined />, label: '方案', category: '知识' },
  
  // === 自然相关 ===
  { name: 'CloudOutlined', icon: <CloudOutlined />, label: '云朵', category: '自然' },
  { name: 'CloudServerOutlined', icon: <CloudServerOutlined />, label: '云服务器', category: '自然' },
  
  // === 状态/标识相关 ===
  { name: 'TagOutlined', icon: <TagOutlined />, label: '标签', category: '标识' },
  { name: 'TagsOutlined', icon: <TagsOutlined />, label: '标签组', category: '标识' },
  { name: 'HeartOutlined', icon: <HeartOutlined />, label: '心形', category: '标识' },
  { name: 'LikeOutlined', icon: <LikeOutlined />, label: '点赞', category: '标识' },
  { name: 'SmileOutlined', icon: <SmileOutlined />, label: '笑脸', category: '标识' },
  { name: 'FrownOutlined', icon: <FrownOutlined />, label: '愁容', category: '标识' },
  { name: 'MehOutlined', icon: <MehOutlined />, label: '无表情', category: '标识' },
  { name: 'CheckOutlined', icon: <CheckOutlined />, label: '勾选', category: '标识' },
  { name: 'CloseOutlined', icon: <CloseOutlined />, label: '关闭', category: '标识' },
  { name: 'CheckCircleOutlined', icon: <CheckCircleOutlined />, label: '成功', category: '标识' },
  { name: 'CloseCircleOutlined', icon: <CloseCircleOutlined />, label: '错误', category: '标识' },
  { name: 'ExclamationCircleOutlined', icon: <ExclamationCircleOutlined />, label: '感叹', category: '标识' },
  { name: 'InfoCircleOutlined', icon: <InfoCircleOutlined />, label: '信息', category: '标识' },
  { name: 'WarningOutlined', icon: <WarningOutlined />, label: '警告', category: '标识' },
  
  // === 工具/操作相关 ===
  { name: 'ToolOutlined', icon: <ToolOutlined />, label: '工具', category: '工具' },
  { name: 'SettingOutlined', icon: <SettingOutlined />, label: '设置', category: '工具' },
  { name: 'ControlOutlined', icon: <ControlOutlined />, label: '控制', category: '工具' },
  { name: 'DashboardOutlined', icon: <DashboardOutlined />, label: '仪表盘', category: '工具' },
  { name: 'ScanOutlined', icon: <ScanOutlined />, label: '扫描', category: '工具' },
  { name: 'SearchOutlined', icon: <SearchOutlined />, label: '搜索', category: '工具' },
  { name: 'EyeOutlined', icon: <EyeOutlined />, label: '眼睛', category: '工具' },
  
  // === 安全/权限相关 ===
  { name: 'KeyOutlined', icon: <KeyOutlined />, label: '钥匙', category: '安全' },
  { name: 'LockOutlined', icon: <LockOutlined />, label: '锁定', category: '安全' },
  { name: 'UnlockOutlined', icon: <UnlockOutlined />, label: '解锁', category: '安全' },
  { name: 'SafetyOutlined', icon: <SafetyOutlined />, label: '安全', category: '安全' },
  { name: 'SecurityScanOutlined', icon: <SecurityScanOutlined />, label: '安全扫描', category: '安全' },
  { name: 'InsuranceOutlined', icon: <InsuranceOutlined />, label: '保险', category: '安全' },
  
  // === 医疗/科技相关 ===
  { name: 'MedicineBoxOutlined', icon: <MedicineBoxOutlined />, label: '药箱', category: '医疗' },
  { name: 'BugOutlined', icon: <BugOutlined />, label: '虫子/Bug', category: '科技' },
  { name: 'ApiOutlined', icon: <ApiOutlined />, label: 'API', category: '科技' },
  { name: 'CodeOutlined', icon: <CodeOutlined />, label: '代码', category: '科技' },
  
  // === 设备/媒体相关 ===
  { name: 'TabletOutlined', icon: <TabletOutlined />, label: '平板', category: '设备' },
  { name: 'PhoneOutlined', icon: <PhoneOutlined />, label: '电话', category: '设备' },
  { name: 'CameraOutlined', icon: <CameraOutlined />, label: '相机', category: '媒体' },
  { name: 'VideoCameraOutlined', icon: <VideoCameraOutlined />, label: '摄像', category: '媒体' },
  { name: 'PictureOutlined', icon: <PictureOutlined />, label: '图片', category: '媒体' },
  { name: 'SoundOutlined', icon: <SoundOutlined />, label: '声音', category: '媒体' },
  { name: 'CustomerServiceOutlined', icon: <CustomerServiceOutlined />, label: '客服', category: '媒体' },
  { name: 'AudioOutlined', icon: <AudioOutlined />, label: '音频', category: '媒体' },
  
  // === 通讯相关 ===
  { name: 'NotificationOutlined', icon: <NotificationOutlined />, label: '通知', category: '通讯' },
  { name: 'BellOutlined', icon: <BellOutlined />, label: '铃铛', category: '通讯' },
  { name: 'MailOutlined', icon: <MailOutlined />, label: '邮件', category: '通讯' },
  { name: 'MessageOutlined', icon: <MessageOutlined />, label: '消息', category: '通讯' },
  { name: 'LinkOutlined', icon: <LinkOutlined />, label: '链接', category: '通讯' },
  { name: 'PaperClipOutlined', icon: <PaperClipOutlined />, label: '回形针', category: '通讯' },
  { name: 'ShareAltOutlined', icon: <ShareAltOutlined />, label: '分享', category: '通讯' },
  { name: 'SendOutlined', icon: <SendOutlined />, label: '发送', category: '通讯' },
  
  // === 文件操作相关 ===
  { name: 'ExportOutlined', icon: <ExportOutlined />, label: '导出', category: '操作' },
  { name: 'ImportOutlined', icon: <ImportOutlined />, label: '导入', category: '操作' },
  { name: 'DownloadOutlined', icon: <DownloadOutlined />, label: '下载', category: '操作' },
  { name: 'UploadOutlined', icon: <UploadOutlined />, label: '上传', category: '操作' },
  { name: 'ReloadOutlined', icon: <ReloadOutlined />, label: '刷新', category: '操作' },
  { name: 'SyncOutlined', icon: <SyncOutlined />, label: '同步', category: '操作' },
  
  // === 金融相关 ===
  { name: 'TransactionOutlined', icon: <TransactionOutlined />, label: '交易', category: '金融' },
  { name: 'WalletOutlined', icon: <WalletOutlined />, label: '钱包', category: '金融' },
  
  // === 交通相关 ===
  { name: 'CarOutlined', icon: <CarOutlined />, label: '汽车', category: '交通' },
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
