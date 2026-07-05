# Gemini Google2API

Gemini Google2API 是一个基于 Nuxt 4 的 Gemini Web 转 OpenAI/Gemini API 兼容服务。项目提供 OpenAI 风格的 `/api/v1` 接口、Gemini 风格的 `/api/v1beta` 接口，以及用于管理 API Key、Gemini 账号池、代理和用量日志的 Web 管理后台。

## 功能特性

- OpenAI 兼容接口：`/api/v1/models`、`/api/v1/chat/completions`、`/api/v1/images/generations`、`/api/v1/videos/generations`、`/api/v1/videos`
- Gemini 兼容接口：`/api/v1beta/models`、`/api/v1beta/models/{model}:generateContent`
- Deep Research：通过专用虚拟模型 `gemini-deepsearch` 暴露完整 Deep Research 工作流
- 生成媒体解析：响应中会尽量提取 Gemini 返回的 generated video/audio/media URL
- Gemini 账号池：支持轮询、最少使用和随机策略
- Web 管理后台：管理 API Key、Gemini Cookie 账号、代理设置和请求日志
- SQLite 持久化：默认数据库位于 `data/gemini.db`
- GitHub Actions：并行构建 `.output` 打包产物和 Docker 镜像

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

### Deep Research / DeepSearch

`gemini-deepsearch` 是一个虚拟模型，会把普通兼容请求映射到 Gemini Web 的 Deep Research 流程：创建研究计划、自动确认启动、轮询状态并返回最终报告。该能力通常需要账号本身具备 Deep Research 权限。

OpenAI 兼容用法：

```bash
curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-gemini2api-example-change-me" \
  -d '{
    "model": "gemini-deepsearch",
    "messages": [
      { "role": "user", "content": "调研 2026 年开源多模态模型的发展趋势" }
    ]
  }'
```

Gemini 兼容用法：

```bash
curl http://localhost:3000/api/v1beta/models/gemini-deepsearch:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-gemini2api-example-change-me" \
  -d '{
    "contents": [
      {
        "parts": [
          { "text": "调研 2026 年 AI Agent 浏览器产品的竞争格局" }
        ]
      }
    ]
  }'
```

OpenAI 响应会在 `choices[0].message.deep_research` 中附加 plan/status 元数据；如果 Gemini 返回生成视频或音频，会在 `choices[0].message.videos` 和 `choices[0].message.media` 中附加 URL。Gemini 兼容响应会将视频/音频 URL 作为 `fileData` part 返回，并在顶层 `deepResearch` 中附加研究元数据。

### Video Generations

视频生成同时兼容 OpenAI 风格的 `POST /api/v1/videos/generations` 和 `POST /api/v1/videos`。请求会被转换为 Gemini 视频生成提示词，并从 Gemini 返回中提取 generated video/media URL。

```bash
curl http://localhost:3000/api/v1/videos/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-gemini2api-example-change-me" \
  -d '{
    "model": "veo-3",
    "prompt": "一段产品发布会开场视频，镜头缓慢推进，电影感灯光",
    "seconds": 8,
    "size": "1920x1080",
    "aspect_ratio": "16:9",
    "image": "https://example.com/reference.png",
    "n": 1
  }'
```

兼容字段：

- OpenAI 优先：`prompt`、`model`、`seconds`、`size`、`response_format`、`image`、`images`、`input_reference`、`input_references`
- xAI 兼容兜底：`duration`、`resolution`、`input_referrence`
- 额外透传到提示词的控制项：`aspect_ratio` / `aspectRatio`、`negative_prompt` / `negativePrompt`、`seed`、`fps`

当 OpenAI 字段和 xAI 兼容字段同时存在时，OpenAI 字段优先生效。例如 `seconds` 会覆盖 `duration`，`image/images/input_reference` 会覆盖 `input_referrence`。

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

仓库包含两个独立 workflow，触发条件相同，可并行执行：

- `.github/workflows/build.yml`：构建并上传 `.output` 打包产物
- `.github/workflows/docker.yml`：构建 Docker 镜像，非 PR 触发时推送到 GHCR

- push 到 `main`
- pull request
- 手动触发 `workflow_dispatch`

`build.yml` 会执行：

1. Checkout 代码
2. 使用 Node.js 22.13.0
3. 恢复 npm 缓存
4. `npm ci`
5. `npm run build`
6. 打包 `.output`、`package.json`、`package-lock.json`、`config.toml`
7. 上传 `gemini-google2api-${{ github.sha }}.tar.gz` artifact

`docker.yml` 会执行：

1. Checkout 代码
2. 使用 Docker Buildx 构建镜像
3. 复用 GitHub Actions Docker build cache
4. 非 PR 触发时推送镜像到 GitHub Container Registry：`ghcr.io/<owner>/<repo>`

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
- 本地提交前建议运行 `npm test`、`npm run typecheck` 和 `npm run build`。
