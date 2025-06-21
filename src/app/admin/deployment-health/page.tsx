import { Metadata } from 'next'
import { DeploymentDiagnostics } from '@/components/deployment-diagnostics'

export const metadata: Metadata = {
  title: 'Deployment Health - WeAnime Admin',
  description: 'Real-time deployment health monitoring and diagnostics'
}

export default function DeploymentHealthPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployment Health</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time monitoring of deployment status and system health
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <DeploymentDiagnostics />
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Deployment Guidelines</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Critical Services Required</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• API Routes - Must respond with 200 status</li>
                <li>• Database Connection - Supabase must be accessible</li>
                <li>• Error Monitoring - Must capture and log errors</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Optional Services</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• Crunchyroll Bridge - Streaming functionality (can be deployed separately)</li>
                <li>• External APIs - AniList and Jikan (fallback available)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Environment Variables Check</h3>
              <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded font-mono">
                <div>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
                <div>NODE_ENV: {process.env.NODE_ENV || 'undefined'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}