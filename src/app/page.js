"use client";

import { useEffect, useState } from "react";
import LeftSidebar from "@/components/LeftSidebar";
import MainFocus from "@/components/MainFocus";
import RightSidebar from "@/components/RightSidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLeadStore } from "@/stores/useLeadStore";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    useLeadStore.getState().fetchLeads();
  }, []);

  useKeyboardShortcuts();

  if (!mounted) return null; // Avoid hydration mismatch on initial render

  return (
    <div className="app-container">
      <LeftSidebar />
      <MainFocus />
      <RightSidebar />
    </div>
  );
}
