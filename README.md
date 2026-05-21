# AI 股票分析面板

一个按面试题最小可交付范围实现的全栈 Demo：

- 用户输入股票代码
- 服务端调用免费股票 API 获取行情
- 服务端调用 OpenAI 输出严格 JSON 分析
- 将行情和分析结果写入 Supabase
- 前端展示实时结果和历史记录

## 在线访问 URL

部署到 Render 后，将你的地址填在这里：

`https://your-render-service.onrender.com`

## 技术栈

- 前端：Next.js App Router + React + Tailwind CSS
- 后端：Next.js Route Handlers
- 股票数据：Twelve Data Quote API
- AI 分析：OpenAI Responses API + Structured Outputs + Zod
- 数据库：Supabase Postgres
- 部署：Render Web Service

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板并填值

```bash
cp .env.example .env.local
```

Windows PowerShell 也可以直接新建 `.env.local`，内容参考 `.env.example`。

3. 在 Supabase SQL Editor 里执行 [supabase.sql](./supabase.sql)

4. 启动开发环境

```bash
npm run dev
```

5. 打开

```text
http://localhost:3000
```

## 环境变量

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=
TWELVE_DATA_API_KEY=your_twelve_data_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## API 设计

### `GET /api/stock?symbol=AAPL`

返回股票行情快照。

### `POST /api/analyze`

请求体：

```json
{
  "symbol": "AAPL"
}
```

行为：

- 拉取最新行情
- 调用 OpenAI 做结构化分析
- 将数据写入 Supabase
- 返回行情、分析结果和保存记录

### `GET /api/history?symbol=AAPL`

返回最近 10 条分析记录。

## Prompt 截图/代码

这个项目没有只靠 prompt 文本约束 JSON，而是直接用了 OpenAI Structured Outputs。

核心代码在 [src/lib/analysis.ts](./src/lib/analysis.ts)：

```ts
const AnalysisSchema = z.object({
  summary: z.string().min(20),
  sentiment: z.enum(["Bullish", "Neutral", "Bearish"]),
  risk_level: z.enum(["Low", "Medium", "High"]),
});

const response = await openai.responses.parse({
  model: "gpt-4.1-mini",
  instructions: [
    "You are an equity research assistant.",
    "Return strict JSON that matches the provided schema.",
    "Do not include markdown, extra keys, or commentary outside JSON.",
  ].join(" "),
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Analyze this stock quote snapshot:\n${JSON.stringify(quote, null, 2)}`,
        },
      ],
    },
  ],
  text: {
    format: zodTextFormat(AnalysisSchema, "stock_analysis"),
  },
});
```

这样做的好处：

- 输出字段稳定
- 前端不需要脆弱地手写 JSON.parse 容错
- 面试时能清楚说明“不是只靠 prompt，而是 schema 级约束”

## Debug 记录

### 问题 1：前端直连外部 API 会暴露密钥

一开始如果让浏览器直接请求股票 API，会出现两个问题：

- API key 暴露在前端
- 某些供应商请求会遇到 CORS 限制

解决方式：

- 改成由 Next.js Route Handler 代理请求
- 股票查询、OpenAI 调用、Supabase 写入全部放到服务端

### 问题 2：只靠 Prompt 约束 JSON 不稳定

如果只写“Please return JSON only”，模型偶尔仍会返回解释文本，导致解析失败。

解决方式：

- 使用 OpenAI Responses API 的 Structured Outputs
- 用 `zodTextFormat(...)` 声明结构
- 服务端直接读取 `response.output_parsed`

## Render 部署

推荐部署为一个 Render Web Service。

### Build Command

```bash
npm install && npm run build
```

### Start Command

```bash
npm run start
```

### 环境变量

在 Render 控制台配置：

- `OPENAI_API_KEY`
- `TWELVE_DATA_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 项目结构

```text
src/
  app/
    api/
      analyze/route.ts
      history/route.ts
      stock/route.ts
    globals.css
    layout.tsx
    page.tsx
  lib/
    analysis.ts
    env.ts
    stock.ts
    supabase.ts
    types.ts
supabase.sql
.env.example
```

## 可继续增强的方向

- 增加 K 线图
- 支持多市场股票
- 增加用户登录和个人分析历史
- 增加失败重试与限流提示
