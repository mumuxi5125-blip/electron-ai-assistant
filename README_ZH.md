# Electron AI 助手
<p align="center">
  <a href="./README.md">English</a> | 
  <a href="./README_ZH.md">简体中文</a><br>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
</p>
一个使用 Electron 构建的桌面 AI 助手应用，支持多 API、会话管理、文件系统访问，以及用于自动执行任务的代理模式。

## 功能特性

### 1. 多 API 聚合
- 支持 OpenAI、DeepSeek、豆包（Doubao）以及其他 OpenAI 兼容的 API
- 每个 API 可独立启用/禁用
- 可配置的 API 密钥和基础 URL

### 2. 会话管理
- 左侧会话列表，支持创建/删除/切换功能
- 每个会话保持独立的聊天历史和系统提示词
- 使用 `electron-store` 本地持久化会话数据

### 3. 文件系统访问
- 通过主进程 `fs` 模块完全控制本地文件
- 带目录导航的文件浏览器
- 读取、写入、列表、创建和删除操作
- 高风险操作需要安全确认

### 4. 代理模式
- 自然语言任务描述（例如：“读取 F:\\ 中的文件并总结”）
- AI 驱动的工具调用规划和执行
- 分步执行，对风险操作需用户确认

### 5. 安全特性
- 写入、删除和命令执行操作需确认对话框
- 沙盒化的渲染进程，受控的 IPC 暴露
- 无自动执行危险命令

## 项目结构

```
electron-ai-assistant/
├── main.js              # 主进程
├── preload.js           # 预加载脚本（IPC 桥接）
├── renderer.js          # 渲染进程（Vue 3）
├── index.html           # 主窗口 HTML
├── style.css            # 应用样式
├── package.json         # 依赖项和构建配置
├── assets/              # 图标和资源
├── .github/workflows/   # GitHub Actions CI/CD
│   └── build.yml        # 构建工作流
└── README.md            # 本文件
```

## 安装

### 环境要求
- Node.js 18.x 或更高版本
- npm 或 yarn

### 开发环境设置
```bash
# 克隆仓库
git clone <repository-url>
cd electron-ai-assistant

# 安装依赖项
npm install

# 启动开发模式
npm start

# 构建 Windows 版本（NSIS 安装程序）
npm run build:win-nsis
```

### 从源代码构建
```bash
# 生产构建
npm run build

# 开发构建
npm run build:win

# 生成安装程序
npm run dist
```

## 配置

### API 配置
1. 打开应用程序
2. 点击侧边栏中的 API 配置区域
3. 启用所需的 API 并输入您的 API 密钥
4. 根据需要配置基础 URL（已提供默认值）

### 会话管理
- 点击“新建会话”创建对话
- 点击会话名称在不同对话间切换
- 使用编辑/删除按钮管理会话

### 文件浏览器
- 使用路径输入或点击文件夹导航目录
- 点击向上箭头进入父目录
- 点击文件眼睛图标预览文件内容

## 代理模式使用

1. 使用右上角切换按钮切换到“代理模式”
2. 输入自然语言命令，例如：
   - “列出 Documents 文件夹中的所有文件”
   - “读取 config.json 并显示其内容”
   - “创建一个名为 'backup' 的新目录”
3. 点击“执行代理”
4. 查看执行计划，并在提示时确认操作

## 构建配置

应用程序使用 `electron-builder`，具有以下 NSIS 设置：
- `oneClick: false` - 显示安装向导
- `allowToChangeInstallationDirectory: true` - 用户可以选择安装目录
- 创建桌面和开始菜单快捷方式

### CI/CD 流水线

GitHub Actions 工作流 (`build.yml`)：
- 手动触发或版本标签推送时触发
- 使用 Node.js 18 的 Windows 运行器
- 使用虚拟 token 解决 `GH_TOKEN not set` 错误
- 使用 `--publish never` 避免发布错误
- 将 Setup.exe 作为产物上传

## 安全考虑

1. **渲染进程隔离**：渲染进程以 `nodeIntegration: false` 和 `contextIsolation: true` 运行
2. **预加载脚本**：仅向渲染器暴露必要的 IPC 方法
3. **用户确认**：高风险操作需要用户明确批准
4. **文件系统沙盒**：所有文件操作都通过主进程进行
5. **命令执行**：Shell 命令在执行前需用户确认，并在指定目录中执行

## 故障排除

### 常见问题

1. **API 连接错误**
   - 验证 API 密钥是否正确
   - 检查网络连接
   - 确保 API 服务可用

2. **构建错误**
   - 确保 Node.js 版本兼容
   - 检查 `electron-builder` 配置
   - 验证所有依赖项已安装

3. **文件权限错误**
   - 如果需要，以管理员身份运行
   - 检查文件/目录权限
   - 确认路径有效

4. **CI/CD 构建失败**
   - 工作流包含常见 electron-builder CI 问题的修复
   - 使用虚拟 GH_TOKEN 避免身份验证错误
   - 设置 `--publish never` 防止发布

### 开发提示
- 使用 `npm run dev` 启动时打开开发工具
- 在开发工具的控制台中查看日志以进行调试
- 在终端中监控主进程日志

## 许可证

MIT 许可证 - 详见 LICENSE 文件。

## 贡献

1. Fork 本仓库
2. 创建功能分支
3. 进行更改
4. 提交拉取请求

## 支持

如需报告问题和功能请求，请使用 GitHub Issues 页面。
