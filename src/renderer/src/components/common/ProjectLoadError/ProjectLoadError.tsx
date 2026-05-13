import { useMemo } from 'react'
import { Button, Card, Typography, Space, Alert, Collapse, Divider } from 'antd'
import {
  ReloadOutlined,
  HomeOutlined,
  FolderOpenOutlined,
  ExclamationCircleOutlined,
  BugOutlined,
  ToolOutlined
} from '@ant-design/icons'
import styles from './ProjectLoadError.module.css'

const { Title, Text } = Typography

export interface ProjectLoadErrorProps {
  error: string
  projectPath?: string
  onRetry?: () => void
  onOpenOther?: () => void
  onGoHome?: () => void
  loading?: boolean
}

interface ErrorAnalysis {
  title: string
  description: string
  possibleCauses: string[]
  solutions: string[]
}

function analyzeError(error: string, projectPath?: string): ErrorAnalysis {
  const lowerError = error.toLowerCase()

  if (lowerError.includes('路径不存在') || lowerError.includes('not found')) {
    return {
      title: '项目路径不存在',
      description: projectPath
        ? `指定的项目路径 "${projectPath}" 不存在或已被移动。`
        : '指定的项目路径不存在或已被移动。',
      possibleCauses: [
        '项目文件夹已被删除或移动到其他位置',
        '项目路径在配置文件中记录错误',
        '外部存储设备（如U盘、网络驱动器）未连接'
      ],
      solutions: [
        '检查项目文件夹是否存在于指定路径',
        '如果项目已移动，请通过"打开项目"功能重新选择项目位置',
        '如果是外部存储设备，请确保设备已正确连接'
      ]
    }
  }

  if (lowerError.includes('project.json') || lowerError.includes('project.json5')) {
    return {
      title: '项目配置文件损坏',
      description: '项目配置文件 (project.json5) 不存在或格式错误。',
      possibleCauses: [
        '项目配置文件被意外删除',
        '配置文件内容被手动修改导致格式错误',
        '文件系统错误导致文件损坏'
      ],
      solutions: [
        '检查项目目录下的 .novelhelper/data/project.json5 文件是否存在',
        '尝试用文本编辑器打开配置文件，检查JSON格式是否正确',
        '如果配置文件丢失，可能需要重新创建项目'
      ]
    }
  }

  if (lowerError.includes('permission') || lowerError.includes('权限') || lowerError.includes('access')) {
    return {
      title: '权限不足',
      description: '没有足够的权限访问项目目录或文件。',
      possibleCauses: [
        '项目目录设置了访问权限限制',
        '当前用户账户权限不足',
        '文件被其他程序锁定'
      ],
      solutions: [
        '以管理员身份运行应用程序',
        '检查项目目录的访问权限设置',
        '关闭可能占用项目文件的其他程序'
      ]
    }
  }

  if (lowerError.includes('timeout') || lowerError.includes('超时')) {
    return {
      title: '加载超时',
      description: '项目加载时间过长，可能是由于网络或系统资源问题。',
      possibleCauses: [
        '项目文件过大或数量过多',
        '系统资源不足（内存、CPU）',
        '磁盘读写速度过慢',
        '防病毒软件正在扫描项目文件'
      ],
      solutions: [
        '等待系统资源释放后重试',
        '关闭其他占用资源的程序',
        '将项目移动到更快的存储设备',
        '在防病毒软件中排除项目目录'
      ]
    }
  }

  if (lowerError.includes('json') || lowerError.includes('parse') || lowerError.includes('解析')) {
    return {
      title: '数据解析错误',
      description: '项目数据文件格式错误，无法正确解析。',
      possibleCauses: [
        '配置文件被手动编辑导致语法错误',
        '文件编码不正确',
        '文件在写入时被中断导致不完整'
      ],
      solutions: [
        '检查最近编辑过的配置文件',
        '使用JSON验证工具检查文件格式',
        '从备份中恢复项目数据'
      ]
    }
  }

  return {
    title: '项目加载失败',
    description: error || '发生未知错误，无法加载项目。',
    possibleCauses: [
      '项目文件损坏或格式不兼容',
      '系统资源不足',
      '网络或存储设备问题',
      '应用程序内部错误'
    ],
    solutions: [
      '尝试重新加载项目',
      '检查项目文件完整性',
      '重启应用程序',
      '查看应用日志获取详细错误信息'
    ]
  }
}

export function ProjectLoadError({
  error,
  projectPath,
  onRetry,
  onOpenOther,
  onGoHome,
  loading
}: ProjectLoadErrorProps): JSX.Element {
  const analysis = useMemo(() => analyzeError(error, projectPath), [error, projectPath])

  return (
    <div className={styles.container}>
      <Card className={styles.errorCard} bordered={false}>
        <div className={styles.header}>
          <ExclamationCircleOutlined className={styles.icon} />
          <Title level={3} className={styles.title}>
            {analysis.title}
          </Title>
        </div>

        <Alert
          type="error"
          message={analysis.description}
          showIcon
          className={styles.alert}
        />

        <Collapse
          defaultActiveKey={['solutions']}
          className={styles.collapse}
          items={[
            {
              key: 'causes',
              label: (
                <Space>
                  <BugOutlined />
                  <span>可能的原因</span>
                </Space>
              ),
              children: (
                <ul className={styles.list}>
                  {analysis.possibleCauses.map((cause, index) => (
                    <li key={index}>{cause}</li>
                  ))}
                </ul>
              )
            },
            {
              key: 'solutions',
              label: (
                <Space>
                  <ToolOutlined />
                  <span>解决方案</span>
                </Space>
              ),
              children: (
                <ul className={styles.list}>
                  {analysis.solutions.map((solution, index) => (
                    <li key={index}>{solution}</li>
                  ))}
                </ul>
              )
            }
          ]}
        />

        {projectPath && (
          <div className={styles.pathInfo}>
            <Text type="secondary">项目路径：</Text>
            <Text code className={styles.pathText}>
              {projectPath}
            </Text>
          </div>
        )}

        <Divider />

        <div className={styles.actions}>
          {onRetry && (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onRetry}
              loading={loading}
            >
              重新加载
            </Button>
          )}
          {onOpenOther && (
            <Button
              icon={<FolderOpenOutlined />}
              onClick={onOpenOther}
              disabled={loading}
            >
              打开其他项目
            </Button>
          )}
          {onGoHome && (
            <Button
              icon={<HomeOutlined />}
              onClick={onGoHome}
              disabled={loading}
            >
              返回首页
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

export default ProjectLoadError
