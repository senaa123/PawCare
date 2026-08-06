import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

const [queryClient] = [
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            60_000,
        retry:                1,
        refetchOnWindowFocus: false,
      },
    },
  }),
]

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient)
  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
