import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

export function RoleGate({ roles, children, fallback = null }: { roles: string[]; children: ReactNode; fallback?: ReactNode }) {
  const { user } = useAuth();
  if (!user?.role || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
