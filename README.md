# AI 股票分析面板

核心流程如下：

- 输入股票代码
- 获取免费股票行情
- 调用 LLM 输出严格 JSON 分析结果
- 将行情与分析结果写入 Supabase
- 展示最近分析历史

## 提交链接
以下两个 URL：

1. 在线演示 URL  
   `https://ai-shares-sooty.vercel.app`

2. 交付说明文档 URL  
   `https://github.com/Evening-breeze707/ai-shares/blob/main/DELIVERY_NOTES.md`

仓库地址：

`https://github.com/Evening-breeze707/ai-shares`

## 功能说明

- 根据股票代码获取最新行情
- 调用 AI 输出固定结构的 JSON 分析结果
- 将行情与分析结果写入 Supabase
- 展示最近分析历史记录

## 技术栈

- 前端：Next.js App Router、React、Tailwind CSS
- 后端：Next.js Route Handlers
- AI：OpenAI Node SDK、Responses API、Prompt 约束、`JSON.parse`、Zod 校验
- 行情数据：Twelve Data Quote API
- 数据库：Supabase Postgres
- 部署：Vercel

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板

```bash
cp .env.example .env.local
```

3. 在 Supabase SQL Editor 中执行 [supabase.sql](./supabase.sql)

4. 启动开发环境

```bash
npm run dev
```

5. 打开浏览器访问

```text
http://localhost:3000
```

## 环境变量

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-5.4
TWELVE_DATA_API_KEY=your_twelve_data_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

## 接口说明

### `GET /api/stock?symbol=AAPL`

获取最新股票行情。

### `POST /api/analyze`

请求体：

```json
{
  "symbol": "AAPL"
}
```

行为：

- 拉取最新行情
- 调用 OpenAI 输出 JSON 分析
- 将行情和分析结果写入 Supabase
- 返回行情、分析结果和保存记录

### `GET /api/history?symbol=AAPL`

获取最近 10 条分析记录。

## 验证结果

- 本地代码检查通过：`npm run lint`
- 本地生产构建通过：`npm run build`
- 在线演示可访问：`https://ai-shares-sooty.vercel.app`
