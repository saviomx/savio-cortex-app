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

type TabType = 'inbox' | 'funnel' | 'ai-agent' | 'ai-brain' | 'settings';

interface HeaderProps {
  activeTab?: TabType;
  className?: string;
}

const tabs = [
  { id: 'inbox' as const, label: 'Inbox', icon: Mail, href: '/' },
  { id: 'funnel' as const, label: 'Funnel', icon: BarChart3, href: '/funnel' },
  { id: 'ai-agent' as const, label: 'AI Agent', icon: Bot, href: '/ai-agent' },
  { id: 'ai-brain' as const, label: 'AI Brain', icon: Brain, href: '/ai-brain' },
  { id: 'settings' as const, label: 'Settings', icon: Settings, href: '/settings' },
];

export function Header({ activeTab = 'inbox', className }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
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

        {/* Tabs */}
        <nav className="flex items-center gap-1">
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

      {/* User & Logout */}
      <div className="flex items-center gap-3">
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
  );
}
