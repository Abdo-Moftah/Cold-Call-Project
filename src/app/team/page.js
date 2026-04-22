"use client";

import { useEffect, useState } from "react";
import { useLeadStore } from "@/stores/useLeadStore";
import { Users, UserPlus, Shield, User, ArrowLeft, Loader2, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function TeamPage() {
  const { leads, selectedIds, clearSelection } = useLeadStore();
  const router = useRouter();

  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'agent'
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setTeam(data);
    setLoading(false);
  };

  const handleAssignLeads = async (agentId) => {
    if (selectedIds.length === 0) {
      alert("Please select leads in the sidebar first!");
      return;
    }

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: agentId })
        .in('id', selectedIds);

      if (error) throw error;
      
      alert(`Successfully assigned ${selectedIds.length} leads!`);
      clearSelection();
      useLeadStore.getState().fetchLeads();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      alert("User created successfully!");
      setShowAddModal(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'agent' });
      fetchTeam();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Users size={32} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Team Management</h1>
        </div>
        <Link href="/" className="btn btn-outline">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </header>

      {selectedIds.length > 0 && (
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="var(--accent-primary)" />
            <span><strong>{selectedIds.length} leads</strong> selected in sidebar. Click an agent's "Assign" button to distribute them.</span>
          </div>
          <button className="btn btn-outline" onClick={clearSelection}>Cancel Selection</button>
        </div>
      )}

      <section style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Users ({team.length})</h2>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} /> Add New User
          </button>
        </div>

        {showAddModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '450px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Create New Account</h3>
                <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
              </div>
              
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
                  <input className="input" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Email</label>
                  <input className="input" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Password</label>
                  <input className="input" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Role</label>
                  <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="agent">Agent (Calling Only)</option>
                    <option value="supervisor">Supervisor (Manager)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem' }} disabled={isCreating}>
                  {isCreating ? <Loader2 className="spinning" size={18} /> : "Create Account"}
                </button>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 className="spinning" /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'var(--bg-tertiary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500 }}>{user.full_name || 'Unnamed User'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {user.id.slice(0,8)}...</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.7rem', 
                      fontWeight: 600,
                      background: user.role === 'admin' ? 'rgba(139, 92, 246, 0.1)' : user.role === 'supervisor' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(113, 113, 122, 0.1)',
                      color: user.role === 'admin' ? '#8b5cf6' : user.role === 'supervisor' ? '#3b82f6' : 'var(--text-muted)',
                      textTransform: 'uppercase'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                        disabled={isAssigning || selectedIds.length === 0}
                        onClick={() => handleAssignLeads(user.id)}
                      >
                        Assign Selected
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
