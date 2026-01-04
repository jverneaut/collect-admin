import type { AuthProvider } from "@refinedev/core";

export const authProvider: AuthProvider = {
  login: async () => ({ success: true }),
  logout: async () => ({ success: true }),
  check: async () => ({ authenticated: true }),
  getIdentity: async () => ({
    id: 1,
    name: "Admin",
    avatar: "",
  }),
  getPermissions: async () => null,
  onError: async () => ({ logout: false }),
};

