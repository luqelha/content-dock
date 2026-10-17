"use client";
import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectWorkspace } from "@/actions/workspace";

export type Tenant = {
  id: string;
  name: string;
  domain: string | null;
  role: string;
};
export type User = {
  id?: string;
  userId?: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};
type TenantContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  tenants: Tenant[];
  activeTenant: Tenant | null;
  setActiveTenant: (tenant: Tenant) => void;
  switching: boolean;
};
const TenantContext = createContext<TenantContextType>({
  user: null,
  setUser: () => {},
  tenants: [],
  activeTenant: null,
  setActiveTenant: () => {},
  switching: false,
});
export const useTenant = () => useContext(TenantContext);
export function TenantProvider({
  children,
  initialUser,
  initialTenants,
  initialActiveTenantId,
}: {
  children: React.ReactNode;
  initialUser: User | null;
  initialTenants: Tenant[];
  initialActiveTenantId?: string;
}) {
  const router = useRouter();
  const [override, setUser] = useState<User | null>(null);
  const [switching, startTransition] = useTransition();
  const [error, setError] = useState("");
  const activeTenant =
    initialTenants.find((t) => t.id === initialActiveTenantId) ||
    initialTenants[0] ||
    null;
  const setActiveTenant = (tenant: Tenant) => {
    if (tenant.id === activeTenant?.id) return;
    setError("");
    startTransition(async () => {
      const result = await selectWorkspace(tenant.id);
      if (result.error) setError(result.error);
      else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  };
  return (
    <TenantContext.Provider
      value={{
        user: override || initialUser,
        setUser,
        tenants: initialTenants,
        activeTenant,
        setActiveTenant,
        switching,
      }}
    >
      {error && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 rounded-md border bg-background p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {children}
    </TenantContext.Provider>
  );
}
