
import { Mastra } from '@mastra/core/mastra';
// import { LibSQLStore } from '@mastra/libsql';
import { VercelDeployer } from '@mastra/deployer-vercel';
import { PinoLogger } from '@mastra/loggers';
import { majiangAnalysisAgent } from './agents/majiang-analysis-agent';
import { evaluateShoupaiWorkflow } from './workflows/evaluate-shoupai';

export const mastra = new Mastra({
  workflows: { evaluateShoupaiWorkflow },
  agents: { majiangAnalysisAgent },
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
  deployer: new VercelDeployer({
    maxDuration: 60,
    memory: 1024,
    regions: ['us-east-1'],
  }),
});
