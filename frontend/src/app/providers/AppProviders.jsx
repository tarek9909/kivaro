import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { ApiError } from '@/api/index.js';
import { useLanguageStore } from '@/app/i18n.js';

function buildQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status && error.status < 500) return false;
          return failureCount < 2;
        }
      },
      mutations: {
        retry: false
      }
    }
  });
}

export function AppProviders({ children }) {
  const [queryClient] = useState(buildQueryClient);
  const language = useLanguageStore((state) => state.language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4500,
          style: {
            background: 'rgba(11, 16, 32, 0.85)',
            color: '#e5eaf3',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.6)'
          }
        }}
      />
    </QueryClientProvider>
  );
}
