"use client";

import { useEffect, useState } from "react";
import { useLeadStore } from "@/stores/useLeadStore";
import { BarChart3, Users, CheckCircle, XCircle, Calendar, Phone, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PerformancePage() {
  const { profile, leads } = useLeadStore();
  const [stats, setStats] = useState({
    total: 0,
    contacted: 0,
    meetings: 0,
    rejected: 0,
    callbacks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (leads.length > 0) {
      setStats({
        total: leads.length,
        contacted: leads.filter(l => l.status !== 'Not Contacted').length,
        meetings: leads.filter(l => l.status === 'Meeting Booked').length,
        rejected: leads.filter(l => l.status === 'Not Interested').length,
        callbacks: leads.filter(l => l.status === 'Callback').length
      });
      setLoading(false);
    }
  }, [leads]);

  if (profile?.role === 'agent') return <div style={{ padding: '2rem' }}>Access Denied</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <BarChart3 size={32} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Performance Dashboard</h1>
        </div>
        <Link href="/" className="btn btn-outline">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <StatCard title="Total Leads" value={stats.total} icon={<Users size={20} />} color="var(--accent-primary)" />
        <StatCard title="Contacted" value={stats.contacted} icon={<Phone size={20} />} color="var(--status-contacted)" />
        <StatCard title="Meetings Booked" value={stats.meetings} icon={<Calendar size={20} />} color="var(--status-meeting)" />
        <StatCard title="Callbacks" value={stats.callbacks} icon={<CheckCircle size={20} />} color="var(--status-callback)" />
        <StatCard title="Not Interested" value={stats.rejected} icon={<XCircle size={20} />} color="var(--status-not-interested)" />
      </div>

      <section style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Agent Overview</h2>
        <p style={{ color: 'var(--text-muted)' }}>Detailed per-agent breakdown is being calculated based on assigned leads...</p>
        {/* We can add a table here showing stats per user if we fetch profiles and aggregate leads */}
      </section>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{title}</div>
        <div style={{ color }}>{icon}</div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700 }}>{value}</div>
      <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${(value / 100) * 100}%`, height: '100%', background: color }}></div>
      </div>
    </div>
  );
}
