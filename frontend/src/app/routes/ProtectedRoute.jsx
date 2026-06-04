import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/app/stores/authStore.js';
import { LoadingState } from '@/components/ui/StateViews.jsx';

export function ProtectedRoute({ children, anyOfPermissions, moduleKey }) {
  const status = useAuthStore((state) => state.status);
  const hydrating = useAuthStore((state) => state.hydrating);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const location = useLocation();

  if (hydrating || status === 'authenticating') {
    return (
      <div className="flex min-h-screen w-full min-w-0 items-center justify-center px-4 sm:px-6">
        <LoadingState label="Restoring your session..." />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (anyOfPermissions && !hasAnyPermission(anyOfPermissions)) {
    return <Navigate to="/forbidden" replace state={{ from: location }} />;
  }

  if (moduleKey && !hasModule(moduleKey)) {
    return <Navigate to="/forbidden" replace state={{ from: location }} />;
  }

  return children;
}
