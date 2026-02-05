import { Mastra } from '@mastra/core/mastra';
// import { LibSQLStore } from '@mastra/libsql';
import { registerApiRoute } from '@mastra/core/server';
import { PinoLogger } from '@mastra/loggers';
import { imageRecognitionAgent } from './agents/image-recognition-agent';
import { imageRecognitionGptAgent } from './agents/image-recognition-gpt-agent';
import { majiangAnalysisAgent } from './agents/majiang-analysis-agent';
import { weatherAgent } from './agents/weather-agent';
// import { completenessScorer, toolCallAppropriatenessScorer, translationScorer } from './scorers/weather-scorer';
import { chatRoute } from "@mastra/ai-sdk";
import { evaluateShoupaiWorkflow } from './workflows/evaluate-shoupai';
import { weatherWorkflow } from './workflows/weather-workflow';

const allowedOrigins = [
  process.env.FRONTEND_URL ?? 'https://majiang-ai-xxxxx.a.run.app',
  'http://localhost:3000',
];

export const mastra = new Mastra({
  workflows: { weatherWorkflow, evaluateShoupaiWorkflow },
  agents: { weatherAgent, majiangAnalysisAgent, imageRecognitionAgent, imageRecognitionGptAgent },
  // scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  server: {
    middleware: [
      {
        path: '/api/*',
        handler: async (c, next) => {
          const origin = c.req.header('Origin');
          if (origin && allowedOrigins.includes(origin)) {
            c.header('Access-Control-Allow-Origin', origin);
          } else if (!origin) {
            c.header('Access-Control-Allow-Origin', '*');
          }
          c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          c.header('Access-Control-Allow-Credentials', 'true');
          if (c.req.method === 'OPTIONS') {
            return new Response(null, { status: 204 });
          }
          await next();
        },
      },
    ],
    apiRoutes: [
      chatRoute({
        path: "/chat",
        agent: "majiangAnalysisAgent",
      }),
      registerApiRoute("/generate/imageRecognitionAgent/generate", {
        method: "POST",
        requiresAuth: false,
        handler: async (c) => {
          const mastra = c.get("mastra");
          const agent = await mastra.getAgent("imageRecognitionAgent");
          if (!agent) {
            return c.json({ error: { message: "imageRecognitionAgent not found" } }, 404);
          }
          const body = (await c.req.json()) as { messages?: Array<{ role: "user" | "assistant" | "system"; content: string }> };
          const messages = body.messages ?? [];
          const output = await agent.generate(messages as Parameters<typeof agent.generate>[0]);
          return c.json({
            text: output.text,
            usage: output.usage,
            finishReason: output.finishReason,
            error: output.error ? { message: output.error.message } : undefined,
          });
        },
      }),
    ]
  },
  // vercel storage is not supported yet
  // storage: new LibSQLStore({
  //   // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
  //   url: ":memory:",
  // }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
