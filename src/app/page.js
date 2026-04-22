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
    // Silent fetch
    useLeadStore.getState().fetchLeads().catch(e => console.error("Home Mount Fetch Error:", e));
  }, []);

  useKeyboardShortcuts();

  if (!mounted) {
    return <div style={{ background: '#000', height: '100vh' }} />;
  }

  return (
    <div className="app-container">
      <LeftSidebar />
      <MainFocus />
      <RightSidebar />
    </div>
  );
}
