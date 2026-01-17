'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Mail,
  BarChart3,
  FlaskConical,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

type TabType = 'inbox' | 'metrics' | 'experiments' | 'settings' | 'admin';

interface HeaderProps {
  activeTab?: TabType;
  className?: string;
}

const tabs = [
  { id: 'inbox' as const, label: 'Inbox', icon: Mail, href: '/', adminOnly: false },
  { id: 'metrics' as const, label: 'Metrics', icon: BarChart3, href: '/metrics', adminOnly: false },
  { id: 'experiments' as const, label: 'Experiments', icon: FlaskConical, href: '/experiments', adminOnly: false },
  { id: 'settings' as const, label: 'Settings', icon: Settings, href: '/settings', adminOnly: false },
  { id: 'admin' as const, label: 'Administration', icon: Shield, href: '/admin', adminOnly: true },
];

export function Header({ activeTab = 'inbox', className }: HeaderProps) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <header className={cn('h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4', className)}>
      {/* Logo and Tabs */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/savio-logo-DdP6MEtP.png"
            alt="Savio"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="font-semibold text-gray-900">Savio</span>
        </Link>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User & Logout */}
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm text-gray-500">{user.email}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-gray-500 hover:text-gray-900"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
