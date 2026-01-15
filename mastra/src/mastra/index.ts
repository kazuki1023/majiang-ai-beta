
import { Mastra } from '@mastra/core/mastra';
// import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { majiangAnalysisAgent } from './agents/majiang-analysis-agent';
import { weatherAgent } from './agents/weather-agent';
import { completenessScorer, toolCallAppropriatenessScorer, translationScorer } from './scorers/weather-scorer';
import { evaluateShoupaiWorkflow } from './workflows/evaluate-shoupai';
import { weatherWorkflow } from './workflows/weather-workflow';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, evaluateShoupaiWorkflow },
  agents: { weatherAgent, majiangAnalysisAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
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
