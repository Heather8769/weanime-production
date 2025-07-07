'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale time for all queries
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Default cache time for all queries
        gcTime: 1000 * 60 * 15, // 15 minutes
        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes('4')) {
            return false;
          }
          return failureCount < 3;
        },
        // Refetch configuration
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}