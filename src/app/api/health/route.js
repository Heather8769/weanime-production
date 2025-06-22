import { performanceUtils } from '../../../utils/performance';


// Required for static export
export const dynamic = 'force-static'
export async function GET(request) {
  performanceUtils.logMemory('Health Check');
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    memory: typeof process !== 'undefined' ? {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    } : null,
    uptime: typeof process !== 'undefined' ? Math.round(process.uptime()) + 's' : null,
    deployment: 'serverless-optimized'
  };
  
  return Response.json(healthData);
}
