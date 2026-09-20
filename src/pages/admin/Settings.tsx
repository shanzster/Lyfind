import { Settings as SettingsIcon, Shield, Bell, Mail, Database } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function Settings() {
  return (
    <>
      <AdminSidebar />
      
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              System Settings
            </h1>
            <p className="text-white/60">Configure platform settings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Settings */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">General Settings</h3>
              </div>
              <p className="text-white/60 text-sm">Platform name, contact info, and basic configuration</p>
            </div>

            {/* Security */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Security</h3>
              </div>
              <p className="text-white/60 text-sm">Password policies, 2FA, and access control</p>
            </div>

            {/* Notifications */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
              </div>
              <p className="text-white/60 text-sm">Email and push notification settings</p>
            </div>

            {/* Email Templates */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Email Templates</h3>
              </div>
              <p className="text-white/60 text-sm">Customize email templates for notifications</p>
            </div>

            {/* Database */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Database</h3>
              </div>
              <p className="text-white/60 text-sm">Backup, restore, and maintenance</p>
            </div>
          </div>

          <div className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <SettingsIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Settings Configuration</h3>
            <p className="text-white/60">Detailed settings panels coming soon</p>
          </div>
        </div>
      </main>
    </>
  );
}
