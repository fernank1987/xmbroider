"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, getFirebaseConfigStatus } from "@/lib/firebase/client";
import { isAdminEmailAllowed } from "../lib/adminAllowlist";

type AdminAuthContextValue = {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  isAllowed: boolean;
  signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}

export default function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { isConfigured } = getFirebaseConfigStatus();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [isConfigured]);

  const signOut = useCallback(async () => {
    if (!auth) {
      return;
    }
    await firebaseSignOut(auth);
  }, []);

  const isAllowed = user ? isAdminEmailAllowed(user.email) : false;

  const value = useMemo(
    () => ({
      user,
      loading,
      isConfigured,
      isAllowed,
      signOut,
    }),
    [user, loading, isConfigured, isAllowed, signOut],
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}
