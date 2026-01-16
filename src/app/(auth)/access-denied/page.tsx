'use client';

import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { ShieldX, LogOut, Mail } from 'lucide-react';

export default function AccessDeniedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3">
              <Image
                src="/savio-logo-DdP6MEtP.png"
                alt="Savio"
                width={48}
                height={48}
                className="rounded-xl"
              />
              <span className="text-2xl font-bold text-gray-900">Savio</span>
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Pending
          </h1>

          <p className="text-gray-500 mb-6">
            Your account has been created but you don&apos;t have access to the platform yet.
            Please contact an administrator to grant you access.
          </p>

          {user && (
            <div className="p-4 rounded-lg bg-gray-50 mb-6">
              <p className="text-sm text-gray-500 mb-1">Logged in as</p>
              <p className="font-medium text-gray-900">{user.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Current role: <span className="font-medium">{user.role || 'None'}</span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <a
              href="mailto:admin@savio.mx?subject=Access%20Request%20for%20Savio%20Platform"
              className="flex items-center justify-center gap-2 w-full"
            >
              <Button variant="default" className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Contact Administrator
              </Button>
            </a>

            <Button
              variant="outline"
              className="w-full"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
