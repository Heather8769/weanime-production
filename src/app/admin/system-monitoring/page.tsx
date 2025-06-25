import MonitoringDashboard from '@/components/MonitoringDashboard'

export default function SystemMonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <MonitoringDashboard />
    </div>
  )
}

export const metadata = {
  title: 'System Monitoring - WeAnime Admin',
  description: 'Comprehensive system monitoring dashboard for WeAnime application',
}