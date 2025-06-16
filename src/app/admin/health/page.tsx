import { Metadata } from 'next'
import SystemHealthDashboard from '@/components/admin/SystemHealthDashboard'

export const metadata: Metadata = {
  title: 'System Health - WeAnime Admin',
  description: 'Monitor the health and status of all WeAnime services',
}

export default function HealthPage() {
  return (
    <div className="container mx-auto py-6">
      <SystemHealthDashboard />
    </div>
  )
}
