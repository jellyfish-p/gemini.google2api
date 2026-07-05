# Gemini Google2API

Gemini Google2API 是一个基于 Nuxt 4 的 Gemini Web 转 OpenAI/Gemini API 兼容服务。项目提供 OpenAI 风格的 `/api/v1` 接口、Gemini 风格的 `/api/v1beta` 接口，以及用于管理 API Key、Gemini 账号池、代理和用量日志的 Web 管理后台。

## 功能特性

- OpenAI 兼容接口：`/api/v1/models`、`/api/v1/chat/completions`、`/api/v1/images/generations`
- Gemini 兼容接口：`/api/v1beta/models`、`/api/v1beta/models/{model}:generateContent`
- Gemini 账号池：支持轮询、最少使用和随机策略
- Web 管理后台：管理 API Key、Gemini Cookie 账号、代理设置和请求日志
- SQLite 持久化：默认数据库位于 `data/gemini.db`
- GitHub Actions：自动安装依赖、缓存 npm/Nuxt 构建缓存、构建并上传 `.output` 打包产物

## 环境要求

- Node.js 22.13.0 或更高版本
- npm

## 快速开始

```bash
npm install
npm run dev
```

默认服务地址：

- 首页：`http://localhost:3000`
- 管理后台：`http://localhost:3000/admin`
- 健康检查：`http://localhost:3000/api/health`

## 配置

项目默认读取根目录下的 `config.toml`。也可以通过环境变量指定配置文件路径：

```bash
CONFIG_PATH=/path/to/config.toml npm run start
```

核心配置示例：

```toml
[server]
port = 3000
host = "0.0.0.0"

[database]
path = "./data/gemini.db"

[admin]
password = "admin123"

[auth]
enabled = false
keys = ["sk-gemini2api-example-change-me"]

[pool]
strategy = "round-robin"
```

生产环境建议修改：

- `admin.password`
- `auth.enabled = true`
- `auth.keys`

## 管理后台

访问 `/admin` 后使用 `config.toml` 中的 `admin.password` 登录。后台可管理：

- API Key
- Gemini 账号 Cookie：`secure_1psid`、`secure_1psidts`
- 单账号代理
- 全局代理与账号池策略
- 请求量、Token 估算和最近使用日志

## API 用法

### 获取模型列表

```bash
curl http://localhost:3000/api/v1/models
```

### Chat Completions

```bash
curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-gemini2api-example-change-me" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      { "role": "user", "content": "你好，介绍一下你自己" }
    ]
  }'
```

### Gemini v1beta generateContent

```bash
curl http://localhost:3000/api/v1beta/models/gemini-2.5-flash:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-gemini2api-example-change-me" \
  -d '{
    "contents": [
      {
        "parts": [
          { "text": "用一句话介绍 Nuxt" }
        ]
      }
    ]
  }'
```

如果 `auth.enabled = false`，接口不会校验 API Key。

## 构建与运行

```bash
npm run build
npm run start
```

构建产物位于 `.output/`。生产启动命令等价于：

```bash
node .output/server/index.mjs
```

## GitHub Actions 打包

仓库包含 `.github/workflows/build.yml`，触发条件：

- push 到 `main`
- pull request
- 手动触发 `workflow_dispatch`

CI 会执行：

1. Checkout 代码
2. 使用 Node.js 22.13.0
3. 恢复 npm 与 Nuxt 构建缓存
4. `npm ci`
5. `npm run build`
6. 打包 `.output`、`package.json`、`package-lock.json`、`config.toml`
7. 上传 `gemini-google2api-${{ github.sha }}.tar.gz` artifact
8. 使用 Docker Buildx 构建镜像
9. 非 PR 触发时推送镜像到 GitHub Container Registry：`ghcr.io/<owner>/<repo>`

本地构建 Docker 镜像：

```bash
docker build -t gemini-google2api .
```

本地运行 Docker 镜像：

```bash
docker run --rm -p 3000:3000 -v ./data:/app/data gemini-google2api
```

## 常用脚本

```bash
npm run dev        # 本地开发
npm run build      # 生产构建
npm run start      # 启动 .output 产物
npm run typecheck  # Nuxt 类型检查
```

## 注意事项

- `config.toml` 中的默认后台密码和示例 API Key 仅用于本地开发。
- Gemini 账号 Cookie 属于敏感信息，不要提交到公开仓库或日志系统。
- 当前项目包含严格类型检查脚本，但现有代码仍有若干 TypeScript 严格模式错误；CI 目前以可打包构建为准。
