'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'manager' | 'member' | 'viewer';
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }

    if (!loading && user && requireRole) {
      const roleHierarchy = { admin: 4, manager: 3, member: 2, viewer: 1 };
      const userLevel = roleHierarchy[user.role];
      const requiredLevel = roleHierarchy[requireRole];

      if (userLevel < requiredLevel) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, requireRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}