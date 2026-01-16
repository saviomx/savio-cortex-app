'use client';

import { Header } from '@/components/header';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header activeTab="settings" />

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-500">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
