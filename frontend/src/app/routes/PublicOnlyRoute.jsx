import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getDefaultAuthenticatedPath } from '@/app/routes/destinations.js';
import { LoadingState } from '@/components/ui/StateViews.jsx';

export function PublicOnlyRoute({ children }) {
  const status = useAuthStore((state) => state.status);
  const hydrating = useAuthStore((state) => state.hydrating);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (hydrating) {
    return (
      <div className="flex min-h-screen w-full min-w-0 items-center justify-center px-4 sm:px-6">
        <LoadingState label="Restoring your session..." />
      </div>
    );
  }

  if (status === 'authenticated') {
    const target = location.state?.from?.pathname || getDefaultAuthenticatedPath(user);
    return <Navigate to={target} replace />;
  }

  return children;
}
