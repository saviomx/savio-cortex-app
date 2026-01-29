'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Home, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

export default function NotFound() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Simple header with logo */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4">
        <Link href={isAuthenticated ? "/" : "/login"} className="flex items-center gap-2">
          <Image
            src="/savio-logo-DdP6MEtP.png"
            alt="Savio"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="font-semibold text-gray-900">Savio</span>
        </Link>
      </header>

      {/* 404 content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <span className="text-8xl font-bold text-gray-200">404</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Page not found
          </h1>
          <p className="text-gray-500 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </Button>
            {!isLoading && (
              isAuthenticated ? (
                <Button asChild className="gap-2">
                  <Link href="/">
                    <Home className="w-4 h-4" />
                    Back to Inbox
                  </Link>
                </Button>
              ) : (
                <Button asChild className="gap-2">
                  <Link href="/login">
                    <LogIn className="w-4 h-4" />
                    Go to Login
                  </Link>
                </Button>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
