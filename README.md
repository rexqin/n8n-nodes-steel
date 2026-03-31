# n8n-nodes-steel

Steel API 的 n8n 社区节点，提供以下 MVP 能力：

- Steel: `pdf`, `scrape`, `screenshot`
- Sessions: `create`, `get`, `list`, `release`

## 凭证

使用 `Steel API` 凭证，字段：

- `baseUrl`（默认 `https://api.steel.dev`）
- `apiKey`（通过 `Authorization: Bearer <token>` 注入）

## 本地开发

```bash
pnpm install
pnpm run build
```

## n8n 本地调试

```bash
# 在本仓库构建后，把 dist 挂载到 n8n 自定义节点目录
pnpm run build
```

## 发布

已内置 GitHub Actions 工作流：`.github/workflows/release.yml`

- 触发方式：`workflow_dispatch` / `tag push (v*)`
- Secrets：`INFISICAL_UNIVERSAL_AUTH_CLIENT_ID`、`INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET`
- Repo Variable：`INFISICAL_PROJECT_ID`
- `NPM_TOKEN` 来源：由工作流在运行时从 Infisical 路径 `/n8n-nodes-steel/credentials` 导出
- 发布命令：`npm publish`

## Infisical

通过脚本检查并导出必须 key：

```bash
chmod +x scripts/check-infisical-keys.sh
./scripts/check-infisical-keys.sh
```

Machine Identity: `436a2630-fad8-475b-8f00-5ab158e9919e`  
Env: `dev`  
Path: `/credentials`（不存在会自动创建）
