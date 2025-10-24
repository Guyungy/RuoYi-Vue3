# 陪玩管理系统（前端）

基于 Vue3 + Element Plus + Vite 构建的陪玩行业运营平台前端。项目延续了若依的工程化能力，重新规划了陪玩业务所需的仪表盘、打手资源管理、订单调度与角色权限体系，帮助团队快速上线陪玩撮合服务。

## 核心能力
- **仪表盘**：实时掌握平台核心指标，含订单趋势、打手档期、老板充值等业务概览。
- **打手管理**：维护打手的开黑项目、段位、价格、排期与上下线状态，实现资源精细化运营。
- **订单管理**：按角色拆分视角，老板侧关注派单/支付，运营侧关注分配/履约，打手侧聚焦任务与评价。
- **多角色权限**：支持管理员、老板、打手三类身份登录，前端按角色动态展示菜单、字段与操作按钮。

## 快速开始

```bash
# 安装依赖
yarn --registry=https://registry.npmmirror.com

# 启动本地服务
yarn dev

# 构建预发布 / 生产
yarn build:stage
yarn build:prod
```

默认 API 入口为 `/dev-api`，可在 `.env.*` 中按环境修改。若需使用本地静态菜单，可在环境变量中新增 `VITE_USE_LOCAL_MENU = 'true'`。

## 后端联调

项目已内置陪玩业务接口，搭配同目录下的后端工程 `RuoYi-Vue-fast` 即可直接联调。

1. **准备数据库**
   - 本地启动 MySQL，创建库：`CREATE DATABASE IF NOT EXISTS \`ry-vue\` DEFAULT CHARSET utf8mb4;`
   - 导入后端工程 `sql/ry_20250522.sql`（含系统初始数据）。
2. **配置后端**
   - 后端默认账号：`root / 12345678`。若不同，请修改 `RuoYi-Vue-fast/src/main/resources/application-druid.yml`。
   - 如需关闭验证码，可在后台系统参数 `sys.account.captchaEnabled` 置为 `false`。
3. **启动后端**
   ```bash
   cd RuoYi-Vue-fast
   D:\GitHub\apache-maven-3.9.6\bin\mvn.cmd package -DskipTests
   java -jar target\ruoyi.jar
   ```
   成功后可通过 `http://localhost:8080/dev-api/captchaImage` 验证接口存活。
4. **启动前端**
   - 确认 `.env.development` 中 `VITE_USE_LOCAL_MENU = 'false'`。
   - 执行 `yarn dev`，默认管理员账号 `admin / admin123`，登录后即可看到陪玩仪表盘、打手管理、订单管理等菜单。

### 新增 API 列表

所有接口均需要登录后携带 `Authorization: Bearer <token>` 访问：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/companion/boosters` | 打手列表，支持 `keyword`、`game`、`status`、分页参数 |
| PATCH | `/companion/boosters/{id}/status` | 切换打手上下线状态 |
| GET | `/companion/orders` | 订单列表，支持 `scope`（manager/boss/personal）、`status`、`game` 等筛选 |
| PATCH | `/companion/orders/{id}/assign` | 指派／回流订单 |
| PATCH | `/companion/orders/{id}/status` | 更新订单状态流转 |
| GET | `/companion/orders/metrics` | 仪表盘指标数据 |

后端会自动根据当前用户角色追加陪玩业务菜单，无需再同步修改 `sys_menu` 表；若需要为老板、打手新增账号，可在后台“系统管理 → 用户管理”中创建，并分配 `boss` 或 `booster` 角色。

## 目录结构

```
src/
├── api/companion           # 陪玩业务接口封装
├── router/menus            # 本地菜单配置（可替换后端路由）
├── views/companion         # 仪表盘、打手、订单等业务页面
└── ...
```

## 角色约定

| 角色编码 | 说明           | 典型菜单可见性                 |
|----------|----------------|--------------------------------|
| `manager`| 平台管理员     | 仪表盘、打手管理、订单管理、系统设置 |
| `boss`   | 雇主 / 老板    | 仪表盘、订单管理（老板视角）、消息中心 |
| `booster`| 打手 / 陪玩    | 仪表盘（任务摘要）、我的安排、接单记录 |

若启用了本地菜单，`src/router/menus/companionMenu.js` 中的 `meta.roles` 会控制菜单展示。接入真实后端时，只需返回同结构的路由数据。

## 后端对接建议

后端可在若依的权限体系上新增以下模块：
- `/companion/boosters`：打手信息 CRUD、档期管理、上下线。
- `/companion/orders`：订单查询、派单、回访、评价。
- `/companion/dashboard`：仪表盘数据聚合接口。
- `/auth/login`：返回角色编码 `manager`、`boss`、`booster`。

## 开源协议

本项目前端基于 MIT 协议开源，可自由商用但需保留版权说明。若对项目有定制化需求，欢迎提交 Issue 或 PR。
