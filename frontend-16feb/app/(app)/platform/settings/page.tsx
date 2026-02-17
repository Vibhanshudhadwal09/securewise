'use client';

import { Bell, Settings, Shield, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export default function PlatformSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <PageHeader
        title="Settings"
        description="Manage organization preferences, users, integrations, and security controls."
        icon={Settings}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Settings' },
        ]}
      />

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button className="text-left bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover border-2 border-gray-200 hover:border-primary-300 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Team & Users</h3>
            <p className="text-gray-600 text-sm">Manage team members and permissions</p>
          </button>

          <button className="text-left bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover border-2 border-gray-200 hover:border-primary-300 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Notifications</h3>
            <p className="text-gray-600 text-sm">Configure alert preferences</p>
          </button>

          <button className="text-left bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover border-2 border-gray-200 hover:border-primary-300 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Security</h3>
            <p className="text-gray-600 text-sm">Authentication, access, and security settings</p>
          </button>
        </div>
      </div>
    </div>
  );
}

