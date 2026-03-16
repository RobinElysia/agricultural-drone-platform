# AI 问答组件重构说明 v1.0.2

## 版本信息
- 版本号：`v1.0.2`
- 日期：`2026-03-10`
- 目标：将 AI 问答从大面积抽屉改为“悬浮球 + 小窗”交互，并修复乱码文案与模板风险。

## 本次变更范围
### 1. AI 组件交互重构
- 文件：`frontend/src/components/AIChatWindow.vue`
- 处理内容：
  - 由抽屉式全屏面板改为右下角悬浮球（FAB）。
  - 点击悬浮球打开/收起小窗，支持关闭按钮直接关闭。
  - 保留聊天历史、快速提问、发送、清空历史等核心能力。
  - 增加弹出过渡动画与移动端适配（小屏隐藏文字，仅保留图标球）。

### 2. 乱码与中文文案修复
- 文件：`frontend/src/components/AIChatWindow.vue`
- 处理内容：
  - 全量替换组件中的乱码字符串为标准中文（如标题、提示语、按钮文案、确认弹窗文案）。
  - 统一输入占位文案与快速问题文案。

### 3. 组件挂载策略调整
- 文件：`frontend/src/views/DashboardView.vue`
- 处理内容：
  - 保持 `<AIChatWindow />` 常驻挂载，确保悬浮球始终可见，不依赖外层 `v-if`。

## 自我审查与验证
- SFC 语法解析：
  - `src/components/AIChatWindow.vue` 通过。
  - `src/views/DashboardView.vue` 通过。
  - `src/views/LoginView.vue` 通过。
- 构建检查说明：
  - `npm run build` 在本机环境因 `vue-tsc` 与当前 Node 版本兼容问题报错。
  - `vite build` 在当前沙箱环境触发 `spawn EPERM`，属于执行环境限制。
  - 已通过 `@vue/compiler-sfc` 做模板与脚本结构级校验，未发现标签闭合错误。

## 兼容性与后续建议
- 本次未改动接口协议和 Pinia 数据结构，主要是 UI 与文案修复。
- 若要做发布前最终验收，建议在可执行完整构建的环境中再跑一次：`npm run build`。
