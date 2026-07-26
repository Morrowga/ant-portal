import { useQuery } from "@tanstack/react-query";
import { api } from "./api-client";

export interface MyModule {
  module_key: string;
  status: string;
}

/** GET /me/modules -- open to any authenticated user, unlike the
 * Owner-only /billing/companies/me/modules. Only ever returns
 * active/trialing rows (the backend filters, not this hook). */
export function useMyModules() {
  return useQuery({
    queryKey: ["me", "modules"],
    queryFn: async () => (await api.get<MyModule[]>("/me/modules")).data,
  });
}