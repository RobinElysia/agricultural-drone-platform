# 农业无人机综合管理平台

## 🚁 项目简介

本项目是一款面向现代农业场景的**无人机综合管理平台**，旨在通过数字化手段提升农业植保作业的智能化水平与管理效率。该项目采用现代化的前后端分离架构，严格遵循软件工程最佳实践，包括DRY、SOLID、KISS、YAGNI等原则，确保了代码的高质量和可维护性。

**项目版本**：1.0.0 | **创建时间**：2026-02-19 | **完成度**：85%

---

## 🎯 核心功能

### 1. 数据大屏（三栏式设计）
- **左侧**：无人机状态（电量、转速、载荷）+ 环境信息（温度、天气、风级、湿度）
- **中部**：GIS地图（高德地图集成）+ 路径规划功能
- **右侧**：作业目标（亩数、农药用量）+ 人员权限管理

### 2. 用户管理系统
- 三级角色：管理员、操作员、农业员
- 权限分配与细粒度控制
- 用户注册、登录、登出功能
- JWT认证系统 + 速率限制中间件

### 3. 无人机管理（完整CRUD）
- ✅ **增**：添加新无人机（支持坐标位置）
- ✅ **删**：删除无人机（带确认提示）
- ✅ **改**：编辑无人机信息（在线更新）
- ✅ **查**：实时查询无人机状态与统计信息
- 远程控制：起飞、降落、喷洒、充电、返航

### 4. AI智能助手
- 悬浮球形态交互
- 通义千问API集成（含本地回退方案）
- 操作答疑与故障排查
- 对话历史记录与持久化
- 支持多轮对话

### 5. 地图监控平台
- 高德地图API集成
- 无人机实时定位标记
- 换电站POI标注
- 路径规划与导航辅助
- 飞行参数可视化

---

## 🛠️ 技术栈

### 前端
- **框架**：Vue 3 + Composition API
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **状态管理**：Pinia
- **路由**：Vue Router 4
- **图表**：ECharts / AntV
- **地图**：高德地图API
- **HTTP客户端**：Axios

### 后端
- **运行时**：Node.js >= 16
- **Web框架**：Express.js
- **数据存储**：Redis >= 6
- **认证**：JWT (jsonwebtoken)
- **AI集成**：通义千问API
- **实时通信**：WebSocket (准备就绪)
- **速率限制**：express-rate-limit

### 部署
- **容器化**：Docker + Docker Compose
- **反向代理**：Nginx
- **配置管理**：环境变量 (.env)

---

## 📁 项目结构

### 前端项目 (frontend/)
```
src/
├── components/             # 可复用组件（通用、仪表板、AI）
├── views/                  # 7个页面（大屏、登录、用户、无人机、地图、AI、404）
├── store/                  # Pinia状态管理（用户、无人机、环境、AI）
├── router/                 # Vue Router路由配置
├── api/                    # API服务层统一封装
├── types/                  # TypeScript类型定义
├── utils/                  # 工具函数（地理、响应处理）
└── styles/                 # 全局样式和Tailwind配置
```

### 后端项目 (backend/)
```
src/
├── controllers/            # 5个控制器（认证、无人机、环境、AI、仪表板）
├── models/                 # 数据模型定义与工厂方法
├── services/               # 业务逻辑（Redis、AI）
├── routes/                 # 5个路由模块
├── middleware/             # 认证、速率限制、验证中间件
├── utils/                  # 工具函数（响应、认证、Redis操作）
└── config/                 # 配置管理
```

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 16.0.0
- **Redis** >= 6.0.0
- **npm** 或 **yarn**
- **内存**：至少 4GB
- **磁盘**：至少 2GB 可用空间
- **操作系统**：Windows, macOS, Linux

### 步骤1：安装Redis（建议有 Docker 用 Docker）

#### Windows
```bash
# 方法A：官方Redis for Windows
# 下载：https://github.com/microsoftarchive/redis/releases
# 运行安装程序，然后启动
redis-server

# 方法B：Docker（推荐）
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### macOS
```bash
brew install redis
brew services start redis
# 或手动启动
redis-server
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

### 步骤2：安装Node.js依赖（你们需要安装node.js v22）

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 步骤3：配置环境变量（可以跳过，因为我配置好了）

创建 `backend/.env` 文件：
```bash
# 服务器配置
PORT=8080
HOST=localhost

# JWT配置
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=24h

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# API密钥（可选，因为我已经写配置了）
QIANWEN_API_KEY=your-qianwen-api-key
AMAP_KEY=your-amap-api-key

# CORS配置
CORS_ORIGIN=*
```

创建 `frontend/.env` 文件：
```bash
# 高德地图配置
# 申请地址: https://lbs.amap.com/

# Web端 JS API Key
VITE_AMAP_KEY=26f8023834b2d3f01a76d663d189566e

# 安全密钥 (JSAPI 2.0 需要)
VITE_AMAP_SECURITY_CODE=5ee5ddb14136d6c578efe55b8537d4a2
```

### 步骤4：启动服务

#### 手动启动（推荐）

**终端1 - 启动后端**
```bash
cd backend
# 初始化 Redis 数据
npm run init
# 运行后端
npm run dev
```

**终端2 - 启动前端**
```bash
cd frontend
npm run dev
```

### 步骤5：访问应用

- **前端应用**：http://localhost:3000
- **后端API**：http://localhost:8080/api
- **健康检查**：http://localhost:8080/health

---

## 👤 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 操作员 | operator | operator123 |
| 农业员 | farmer | farmer123 |

---

## 📚 功能详解

### 数据大屏（DashboardView）
- **左栏**：动态展示选中无人机的实时状态（电量、转速、载荷）与环境监测数据
- **中栏**：高德地图可视化，支持航点编辑、路径绘制、代价优化
- **右栏**：作业目标卡和用户权限管理卡，显示权限等级和操作日志

### 无人机管理（DronesView + 数据大屏集成）
- **CRUD完整**：创建、查看、编辑、删除无人机信息
- **实时监控**：电量、转速、载荷、位置、状态实时更新
- **快速统计**：总数、在线数、飞行中数、平均电量一览
- **远程控制**：起飞→续航→降落完整生命周期管理
- **智能交互**：无数据提示、删除确认、自动选择逻辑

### 用户权限管理（UsersView）
- **三级权限模型**：管理员（全部操作）、操作员（无人机控制）、农业员（数据查看）
- **register/login/logout**：完整的用户生命周期管理
- **权限检查中间件**：每个API都进行认证和授权验证

### AI助手（AIChatView + 浮窗）
- **对话历史**：所有对话存储在Redis中，支持持久化
- **本地回退**：API失败时使用预设回答，保证用户体验
- **实时更新**：Store驱动UI实时刷新

### 地图监控（MapView）
- **路径规划**：点击地图添加航点，自动计算距离和预估时间
- **换电点管理**：添加/编辑换电站位置
- **飞行参数**：速度、高度实时调整
- **警告系统**：电量≤10%自动弹窗提警

---

## 🔐 安全特性

✅ **JWT认证**：所有API端点均需有效token  
✅ **速率限制**：防止API滥用，默认15分钟内最多100个请求  
✅ **CORS配置**：配置跨域资源共享，安全区别信任源  
✅ **输入验证**：前后端双重验证，防止注入攻击  
✅ **密码加密**：存储密码前进行哈希处理  
✅ **环境变量**：敏感信息不硬编码  

---

## ⚙️ API密钥配置

### 通义千问API（AI助手）
1. 访问：https://dashscope.aliyuncs.com/
2. 登录/注册阿里云账号
3. 创建API Key
4. 填入 `.env` 文件的 `QIANWEN_API_KEY`
5. 如无密钥，系统自动使用本地回退回答

### 高德地图API（地图显示）
1. 访问：https://lbs.amap.com/
2. 注册/登录高德账号
3. 创建应用并申请Web服务API密钥
4. 填入 `.env` 文件的 `AMAP_KEY`
5. 城市代码：沈阳210100，北京110000，上海310000等

---

## 📊 项目进度

| 模块 | 状态 | 完成度 | 说明 |
|------|------|--------|------|
| 项目架构设计 | ✅ 完成 | 100% | 系统架构、技术栈、数据库设计已完成 |
| 前端开发 | ✅ 完成 | 100% | 7个页面、4个store、完整的API服务层 |
| 后端开发 | ✅ 完成 | 100% | 5个控制器、5个路由模块、完整认证系统 |
| 数据库设计 | ✅ 完成 | 100% | Redis数据结构、持久化、实时推送 |
| 文档编写 | ✅ 完成 | 100% | 综合README和项目文档 |
| 部署配置 | ✅ 完成 | 100% | Docker支持、nginx配置 |
| API密钥配置 | ⏳ 进行中 | 50% | 需用户自行申请和配置 |
| 功能测试 | ⏳ 进行中 | 50% | 单元测试、集成测试进行中 |
| **总进度** | ⏳ | **85%** | 基础架构完全就位，可投入使用 |

---

## 🏗️ 软件工程最佳实践

### 1. DRY原则（Don't Repeat Yourself）
- ✅ 组件复用：Button、Card、Modal等通用组件
- ✅ 逻辑复用：useComposable模式提取通用逻辑
- ✅ API复用：统一的API服务层避免重复请求

### 2. SOLID原则
- ✅ 单一职责：每个类/组件只负责一个功能
- ✅ 开闭原则：对扩展开放，对修改关闭
- ✅ 里氏替换：子类可替换父类
- ✅ 接口隔离：细粒度的接口设计
- ✅ 依赖倒置：依赖注入管理依赖

### 3. KISS原则（Keep It Simple, Stupid）
- ✅ 简单设计：避免过度工程化
- ✅ 清晰代码：有意义的变量名和函数签名
- ✅ 最小依赖：只引入必要的库

### 4. YAGNI原则（You Ain't Gonna Need It）
- ✅ 按需开发：只实现当前需要的功能
- ✅ 避免过度设计：不为未来不确定的需求提前实现

### 5. 关注点分离（SoC）
- ✅ 分层架构：UI层 → 状态层 → 服务层 → 数据层
- ✅ 模块化设计：各功能模块独立，职责清晰

### 6. 其他原则
- ✅ 最小惊讯原则：一致的交互和预期行为
- ✅ 最少知识原则：松耦合，模块间依赖最小
- ✅ 高内聚低耦合：模块内功能紧密相关，模块间依赖最小

---

## 🌟 项目亮点

| 亮点 | 说明 |
|------|------|
| 现代化技术栈 | Vue3 + TypeScript + Tailwind CSS提供最佳开发体验 |
| 完整功能 | 用户、无人机、环境、AI、地图五大模块完整实现 |
| 最佳实践 | 遵循DRY、SOLID等8大原则，代码高质量高可维护性 |
| 安全可靠 | JWT认证 + 速率限制 + 输入验证 + 密码加密 |
| 高性能 | Redis缓存 + 异步处理 + 代码分割 + 请求防抖 |
| 容器化部署 | Docker + Docker Compose一键启动 |
| 文档完善 | 详细的安装、配置、API、架构文档 |
| 实时通信准备就绪 | WebSocket框架已准备，可随时启用实时推送 |

---

## 🔧 常见问题

### Q1：启动后无法访问服务
**A**：检查以下内容：
- Redis是否运行：`redis-cli ping` 应返回 PONG
- 端口是否被占用：`netstat -ano | findstr :3000` 或 `:8080`
- 依赖是否安装：检查 `node_modules` 目录
- 查看控制台是否有错误信息

### Q2：前端无法连接后端API
**A**：检查：
- 后端服务是否启动（http://localhost:8080/health）
- CORS配置是否正确（`.env` 中 `CORS_ORIGIN`）
- 前端API URL是否配置正确（默认http://localhost:8080）

### Q3：某些功能不可用
**A**：可能原因：
- API密钥未配置（通义千问、高德地图）
- 后端服务未启动
- 用户权限不足（检查用户角色）
- 查看浏览器控制台和服务器日志

### Q4：数据丢失或异常
**A**：解决步骤：
1. 检查Redis是否正常运行：`redis-cli ping`
2. 查看Redis数据：`redis-cli keys *`
3. 必要时重置数据：`redis-cli flushdb`（注意：会删除所有数据）

---

## 📞 技术支持

如遇问题，请按以下顺序排查：
1. 阅读本README的"常见问题"部分
2. 检查控制台和日志输出
3. 参考项目内的详细文档
4. 查看代码注释和文档说明

---

## 📝 更新日志

### v1.0.0 (2026-02-19)
- ✅ 完整的前后端架构
- ✅ 用户、无人机、环境、AI、地图五大模块
- ✅ CRUD完全实现
- ✅ Docker支持
- ✅ 完整文档

---

## 📄 许可证

MIT License - 自由使用，修改和分发

---

## 🎉 致谢

感谢以下开源项目的支持：
- Vue.js团队
- TypeScript团队
- Express.js社区
- Redis官方
- Tailwind CSS
- 阿里云（通义千问）
- 高德地图

---

**项目位置**：C:\Users\58404\.openclaw\workspace\agricultural-drone-platform  
**最后更新**：2026-02-22  
**项目状态**：✅ 基础架构完成（85%）| ⏳ 测试和优化进行中

如有任何问题或建议，欢迎联系项目维护者。祝您使用愉快！🚀
