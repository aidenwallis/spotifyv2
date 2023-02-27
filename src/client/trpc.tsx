import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { PropsWithChildren, useMemo } from "react";
import type { AppRouter } from "../server/trpc";
import { useAuth } from "./auth";

export const trpc = createTRPCReact<AppRouter>();

export const TrpcClient = ({ children }: PropsWithChildren<{}>) => {
  const { isAuthenticated, token } = useAuth();
  const queryClient = useMemo(() => new QueryClient(), []);
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: "http://localhost:8787/trpc",
            headers: () => {
              const headers: Record<string, string> = {};
              isAuthenticated && (headers.Authorization = `Bearer ${token}`);
              return headers;
            },
          }),
        ],
      }),
    [isAuthenticated, token]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
