# 云管理平台

一个用于统一管理 Oracle、AWS 和 DNS 资源的前后端项目。

## 功能概览

- 计算账户管理
- 云实例列表与操作
- Oracle / AWS 实例创建
- DNS 记录管理
- 任务队列
- Telegram 通知
- Docker 部署

## 技术栈

- 前端：Vue 3 + Vite
- 后端：Node.js + Express
- 数据存储：lowdb

## 项目结构

```text
backend/    后端服务与数据
frontend/   前端项目
```

## 本地开发

安装依赖：

```bash
npm install
cd frontend && npm install
```

启动后端：

```bash
npm run server
```

启动前端：

```bash
cd frontend
npm run dev
```

## Docker 部署

项目已提供 Docker 部署文件，详细说明见：

`DEPLOY_DOCKER.md`

快速启动：

```bash
docker compose up -d --build
```

默认访问地址：

```text
http://localhost:3001
```

## 数据说明

运行过程中产生的数据默认保存在：

```text
backend/data
```

该目录已加入 `.gitignore`，不建议提交到 Git。

## Git 提交建议

建议不要提交以下内容：

- `node_modules`
- `frontend/dist`
- `backend/data`
- 本地 `.env` 文件

## 说明

如果用于 GitHub 展示，建议优先阅读：

- `README.md`
- `DEPLOY_DOCKER.md`
