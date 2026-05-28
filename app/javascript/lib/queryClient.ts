import { QueryClient } from '@tanstack/react-query';

// REFERENCE PATTERN: query-client-defaults — see AGENTS.md
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
