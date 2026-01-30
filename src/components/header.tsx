'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Mail,
  BarChart3,
  Settings,
  LogOut,
  Bot,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

type TabType = 'inbox' | 'metrics' | 'ai-agent' | 'ai-brain' | 'settings';

interface HeaderProps {
  activeTab?: TabType;
  className?: string;
}

const allTabs = [
  { id: 'inbox' as const, label: 'Inbox', icon: Mail, href: '/', roles: ['admin', 'manager', 'sdr'] },
  { id: 'metrics' as const, label: 'Metrics', icon: BarChart3, href: '/metrics', roles: ['admin', 'manager', 'sdr'] },
  { id: 'ai-agent' as const, label: 'AI Agent', icon: Bot, href: '/ai-agent', roles: ['admin', 'manager', 'sdr'] },
  { id: 'ai-brain' as const, label: 'AI Brain', icon: Brain, href: '/ai-brain', roles: ['admin'] },
  { id: 'settings' as const, label: 'Settings', icon: Settings, href: '/settings', roles: ['admin', 'manager'] },
];

export function Header({ activeTab = 'inbox', className }: HeaderProps) {
  const { user, logout } = useAuth();
  const userRole = (user?.role || '').toLowerCase();

  // Filter tabs based on user role (case-insensitive)
  const tabs = allTabs.filter(tab => tab.roles.includes(userRole));

  return (
    <>
      {/* Desktop Header */}
      <header className={cn('h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4', className)}>
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
            <span className="font-semibold text-gray-900 dark:text-white">Savio</span>
          </Link>

          {/* Desktop Tabs - Hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User & Logout - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-3">
          {user && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{user.email}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around pt-3 pb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-1 transition-colors',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
