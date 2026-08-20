"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
};

const TenantContext = createContext<TenantContextType>({
  user: null,
  setUser: () => {},
  tenants: [],
  activeTenant: null,
  setActiveTenant: () => {},
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
  const [user, setUser] = useState<User | null>(initialUser);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(initialUser);
  }, [initialUser]);

  const [activeTenant, setActiveTenant] = useState<Tenant | null>(() => {
    if (initialTenants.length === 0) return null;

    if (initialActiveTenantId) {
      const found = initialTenants.find((t) => t.id === initialActiveTenantId);
      if (found) return found;
    }

    return initialTenants[0];
  });

  const handleSetActiveTenant = (tenant: Tenant) => {
    setActiveTenant(tenant);
    document.cookie = `atlas_active_tenant_id=${tenant.id}; path=/; max-age=31536000`; // 1 year expiry
  };

  useEffect(() => {
    if (activeTenant && !initialActiveTenantId) {
      document.cookie = `atlas_active_tenant_id=${activeTenant.id}; path=/; max-age=31536000`;
    }
  }, [activeTenant, initialActiveTenantId]);

  return (
    <TenantContext.Provider
      value={{
        user,
        setUser,
        tenants: initialTenants,
        activeTenant,
        setActiveTenant: handleSetActiveTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}
