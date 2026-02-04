import { Mastra } from '@mastra/core/mastra';
// import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { imageRecognitionAgent } from './agents/image-recognition-agent';
import { imageRecognitionGpt4oAgent } from './agents/image-recognition-gpt4o-agent';
import { majiangAnalysisAgent } from './agents/majiang-analysis-agent';
import { weatherAgent } from './agents/weather-agent';
import { completenessScorer, toolCallAppropriatenessScorer, translationScorer } from './scorers/weather-scorer';
import { evaluateShoupaiWorkflow } from './workflows/evaluate-shoupai';
import { weatherWorkflow } from './workflows/weather-workflow';

const allowedOrigins = [
  process.env.FRONTEND_URL ?? 'https://majiang-ai-xxxxx.a.run.app',
  'http://localhost:3000',
];

export const mastra = new Mastra({
  workflows: { weatherWorkflow, evaluateShoupaiWorkflow },
  agents: { weatherAgent, majiangAnalysisAgent, imageRecognitionAgent, imageRecognitionGpt4oAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
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
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
});
