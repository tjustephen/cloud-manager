# Docker 部署说明

## 环境要求

- 已安装 Docker
- 已安装 Docker Compose
- 默认占用端口：`3001`

## 目录说明

- 前端静态文件会在镜像构建时打包
- 数据目录挂载为 `./backend/data`

## 推荐部署方式

在项目根目录执行：

```bash
docker compose up -d --build
```

启动后访问：

```text
http://localhost:3001
```

## 常用命令

启动或更新：

```bash
docker compose up -d --build
```

停止服务：

```bash
docker compose down
```

查看日志：

```bash
docker compose logs -f app
```

查看容器状态：

```bash
docker compose ps
```

## 数据持久化

本项目使用 lowdb 保存以下数据：

- 计算账户
- DNS 账户
- 任务队列
- 系统设置

宿主机目录：

```text
./backend/data
```

容器内目录：

```text
/app/backend/data
```

删除容器后，只要没有删除宿主机的 `backend/data`，数据就会保留。

## 直接使用 Docker 命令

构建镜像：

```bash
docker build -t oracle-app .
```

Linux / macOS 运行：

```bash
docker run -d \
  --name oracle-app \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -v $(pwd)/backend/data:/app/backend/data \
  oracle-app
```

Windows PowerShell 运行：

```powershell
docker run -d `
  --name oracle-app `
  -p 3001:3001 `
  -e NODE_ENV=production `
  -e PORT=3001 `
  -v ${PWD}/backend/data:/app/backend/data `
  oracle-app
```

## 更新部署

代码更新后执行：

```bash
docker compose down
docker compose up -d --build
```

## 故障排查

如果页面打不开，优先检查：

1. `docker compose ps` 确认容器是否启动
2. `docker compose logs -f app` 查看后端是否报错
3. `3001` 端口是否被其他程序占用
4. `backend/data` 是否有读写权限
