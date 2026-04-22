"use client";

import { useEffect, useState } from "react";
import { useLeadStore } from "@/stores/useLeadStore";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthProvider({ children }) {
  const { user, profile, fetchProfile, theme } = useLeadStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const initAuth = async () => {
      const p = await fetchProfile();
      
      if (!p && pathname !== "/login") {
        router.push("/login");
      }
      setLoading(false);
    };

    initAuth();
  }, [fetchProfile, router, pathname]);

  // If we are on the login page, just show it
  if (pathname === "/login") return <>{children}</>;

  // If we are loading and not on login page, show loader
  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <Loader2 className="spinning" size={48} color="var(--accent-primary)" />
      </div>
    );
  }

  // If not logged in and not on login page, show nothing (will redirect)
  if (!user && pathname !== "/login") return null;

  return <>{children}</>;
}
