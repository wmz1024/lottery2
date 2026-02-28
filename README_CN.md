# 抽奖管理系统

一个现代化、功能丰富的抽奖管理系统，基于 Express.js、MDUI v1 和 Bootstrap 5 构建。

[English Documentation](README.md)

## 功能特性

### 管理后台
- 🎯 **抽奖管理**：创建和管理多个抽奖活动
- 🎁 **奖品配置**：
  - 设置单个奖品中奖概率
  - 支持区间奖品（如 10-100GB 存储空间）
  - 库存管理，支持库存限制
  - 奖品兑换码/卡密管理
- 🎭 **黑幕系统**：为特定抽奖码设置固定奖品
- 🎫 **抽奖码管理**：生成和管理抽奖码（UUID 格式）
- 📊 **结果与分析**：查看抽奖结果并导出为 CSV
- 🔒 **安全功能**：
  - JWT 认证，24 小时令牌过期
  - 浏览器指纹追踪（FingerprintJS）
  - IP 地址追踪和限制
  - 邮箱收集选项
- 🎨 **现代化界面**：
  - MDUI v1 + Bootstrap 5 设计
  - 深色/浅色主题切换
  - 响应式侧边栏导航
  - 移动端友好界面

### 用户界面
- 🎰 **互动转盘**：使用 Winwheel.js 实现流畅的旋转动画
- 🏆 **实时更新**：实时跑马灯显示最近中奖者
- 📱 **移动端优化**：完全响应式设计，支持触摸操作
- 🎁 **懦夫选项**：为风险规避型用户提供保底奖品选项
- 🔐 **防作弊**：
  - 每个抽奖码只能抽一次
  - 可选的指纹/IP 限制
  - 支持邮箱验证

## 技术栈

- **后端**：Node.js + Express.js
- **前端**：HTML5 + JavaScript（原生）
- **UI 框架**：MDUI v1 + Bootstrap 5
- **转盘库**：Winwheel.js
- **认证**：JWT (jsonwebtoken)
- **指纹识别**：FingerprintJS v3
- **数据存储**：JSON 文件
- **包管理器**：pnpm

## 安装

### 前置要求
- Node.js（v14 或更高版本）
- pnpm（推荐）或 npm

### 设置步骤

1. 克隆仓库：
```bash
git clone <repository-url>
cd lottery-system
```

2. 安装依赖：
```bash
pnpm install
# 或
npm install
```

3. 启动服务器：
```bash
pnpm start
# 或
npm start
```

4. 访问应用：
- 用户界面：`http://localhost:3000`
- 管理员登录：`http://localhost:3000/login.html`
- 管理后台：`http://localhost:3000/admin.html`

### 默认凭据
- 用户名：`admin`
- 密码：`admin123`

**⚠️ 重要**：首次登录后请立即更改默认凭据！

## 项目结构

```
lottery-system/
├── data/                    # JSON 数据存储
│   ├── admin.json          # 管理员凭据
│   ├── lotteries.json      # 抽奖活动
│   ├── codes.json          # 抽奖码
│   └── results.json        # 抽奖结果
├── public/                  # 前端文件
│   ├── css/
│   │   └── style.css       # 自定义样式
│   ├── js/
│   │   ├── admin.js        # 管理后台逻辑
│   │   ├── lottery.js      # 用户界面逻辑
│   │   └── login.js        # 登录页面逻辑
│   ├── admin.html          # 管理后台
│   ├── login.html          # 登录页面
│   └── lottery.html        # 用户抽奖页面
├── routes/                  # API 路由
│   ├── admin.js            # 管理 API 端点
│   └── lottery.js          # 抽奖 API 端点
├── server.js               # Express 服务器
├── package.json            # 依赖项
└── README.md               # 文档
```

## API 端点

### 管理 API（需要认证）

#### 认证
- `POST /api/admin/login` - 管理员登录
- `GET /api/admin/verify-token` - 验证 JWT 令牌

#### 抽奖管理
- `GET /api/admin/lotteries` - 获取所有抽奖活动
- `POST /api/admin/lotteries` - 创建抽奖活动
- `PUT /api/admin/lotteries/:id` - 更新抽奖活动
- `DELETE /api/admin/lotteries/:id` - 删除抽奖活动

#### 抽奖码管理
- `GET /api/admin/codes/:lotteryId` - 获取抽奖码
- `POST /api/admin/codes` - 生成抽奖码
- `DELETE /api/admin/codes/:id` - 删除抽奖码
- `POST /api/admin/codes/fixed-prize` - 设置固定奖品（黑幕）

#### 结果与导出
- `GET /api/admin/results/:lotteryId` - 获取结果
- `GET /api/admin/export/:lotteryId` - 导出结果 CSV
- `GET /api/admin/export-codes/:lotteryId` - 导出抽奖码 CSV

#### 库存与设置
- `GET /api/admin/inventory/:lotteryId` - 获取库存状态
- `GET /api/admin/account` - 获取管理员账户信息
- `PUT /api/admin/account` - 更新管理员凭据

### 公共 API

- `POST /api/lottery/verify` - 验证抽奖码
- `POST /api/lottery/draw` - 执行抽奖
- `POST /api/lottery/coward` - 获取懦夫选项奖品
- `GET /api/lottery/info/:lotteryId` - 获取抽奖信息
- `GET /api/lottery/recent-results/:lotteryId` - 获取最近中奖者

## 功能详解

### 抽奖配置

创建抽奖时，您可以配置：

1. **基本信息**：
   - 名称和描述
   - 懦夫选项（保底奖品）

2. **奖品选项**：
   - 奖品名称
   - 中奖概率（%）
   - 库存数量（0 = 无限制）
   - 区间奖品（最小-最大值及单位）
   - 兑换码/卡密

3. **安全设置**：
   - 按浏览器指纹限制
   - 按 IP 地址限制
   - 要求收集邮箱

### 黑幕（固定奖品）系统

管理员可以为特定抽奖码设置固定奖品：
- 单个或批量选择抽奖码
- 选择特定奖品
- 对于区间奖品：
  - 在原区间内随机
  - 指定具体数值
  - 自定义区间

### 库存管理

实时追踪奖品库存：
- 总库存 vs. 已使用库存
- 剩余数量
- 兑换码可用性
- 按抽奖活动分类

### 数据导出

将抽奖数据导出为 CSV：
- **结果导出**：抽奖码、奖品、时间戳、类型、指纹、IP、邮箱
- **抽奖码导出**：抽奖码、状态、创建时间

## 安全功能

1. **JWT 认证**：24 小时令牌过期，自动刷新
2. **浏览器指纹识别**：使用 FingerprintJS 进行唯一设备识别
3. **IP 追踪**：request-ip 中间件实现精确 IP 检测
4. **频率限制**：每个抽奖码只能抽一次，可选指纹/IP 限制
5. **会话管理**：令牌过期时自动登出

## 自定义

### 更改 JWT 密钥

编辑 `server.js`：
```javascript
app.set('jwtSecret', '你的密钥');
```

### 修改主题颜色

编辑 `public/admin.html` 和 `public/lottery.html`：
```html
<body class="mdui-theme-primary-indigo mdui-theme-accent-pink">
```

可用主题：indigo、blue、red、pink、purple 等。

### 调整转盘大小

编辑 `public/js/lottery.js` 中的 `initWheel()` 函数：
```javascript
let canvasSize, outerRadius, fontSize;
if (isSmallMobile) {
  canvasSize = 280;
  outerRadius = 130;
  fontSize = 12;
}
```

## 开发

### 开发模式运行

```bash
pnpm run dev
# 或
npm run dev
```

使用 nodemon 实现文件更改时自动重启。

### 数据存储

所有数据存储在 `data/` 目录的 JSON 文件中：
- 简单且便携
- 无需数据库设置
- 易于备份和迁移

**注意**：对于高流量的生产环境，建议迁移到专业数据库（MongoDB、PostgreSQL 等）

## 浏览器支持

- Chrome/Edge（最新版）
- Firefox（最新版）
- Safari（最新版）
- 移动浏览器（iOS Safari、Chrome Mobile）

## 许可证

MIT 许可证 - 可自由用于个人或商业项目。

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 支持

如有问题，请在 GitHub 上提交 issue。

## 更新日志

### 版本 1.0.0
- 初始版本发布
- 完整的抽奖管理系统
- 带认证的管理后台
- 带旋转转盘的用户抽奖界面
- 浏览器指纹和 IP 追踪
- 库存管理
- CSV 导出功能
- 深色/浅色主题支持
- 移动端响应式设计
