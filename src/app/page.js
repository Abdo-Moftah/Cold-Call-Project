"use client";

import { useEffect, useState } from "react";
import LeftSidebar from "@/components/LeftSidebar";
import MainFocus from "@/components/MainFocus";
import RightSidebar from "@/components/RightSidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLeadStore } from "@/stores/useLeadStore";
import { useRouter } from "next/navigation";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const user = useLeadStore(state => state.user);
  const fetchProfile = useLeadStore(state => state.fetchProfile);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (!user) {
      fetchProfile().then(p => {
        if (!p) router.push("/login");
      });
    } else {
      useLeadStore.getState().fetchLeads();
    }
  }, [user, fetchProfile, router]);

  useKeyboardShortcuts();

  if (!mounted || !user) return null;

  return (
    <div className="app-container">
      <LeftSidebar />
      <MainFocus />
      <RightSidebar />
    </div>
  );
}
