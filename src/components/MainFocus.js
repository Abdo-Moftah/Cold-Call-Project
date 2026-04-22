"use client";

import { useLeadStore } from "@/stores/useLeadStore";
import { User, Phone, Briefcase, Mail, Tag, ChevronLeft, ChevronRight, CheckCircle2, Clock, Calendar, XCircle, ExternalLink, Copy, Globe, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MainFocus() {
  const { filteredLeads, currentIndex, nextLead, prevLead, updateLeadStatus, deleteLead, profile } = useLeadStore();
  const leads = filteredLeads();
  const currentLead = leads.length > 0 ? leads[currentIndex] : null;

  const [agents, setAgents] = useState([]);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'supervisor') {
      supabase.from('profiles').select('id, full_name').then(({ data }) => {
        if (data) setAgents(data);
      });
    }
  }, [profile]);

  const handleAssignChange = async (agentId) => {
    if (!currentLead) return;
    const { error } = await supabase.from('leads').update({ assigned_to: agentId }).eq('id', currentLead.id);
    if (!error) {
      useLeadStore.getState().fetchLeads();
    }
  };

  const handleAction = (status) => {
    if (!currentLead) return;
    
    if (status === 'Meeting Booked') {
      const title = encodeURIComponent(`Meeting with ${currentLead.name} (${currentLead.company})`);
      const details = encodeURIComponent(`Phone: ${currentLead.phone}\nEmail: ${currentLead.email}\nNotes: ${currentLead.notes?.[0]?.content || ''}`);
      const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
      window.open(calUrl, '_blank');
    }
    
    if (status === 'Callback') {
      // For simplicity, auto-set callback to tomorrow at same time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      updateLeadStatus(currentLead.id, status, tomorrow.toISOString());
    } else {
      updateLeadStatus(currentLead.id, status);
    }
    
    // Auto-advance to next lead after action (unless it's the last one)
    if (currentIndex < leads.length - 1) {
      setTimeout(() => nextLead(), 300); // Small delay for visual feedback
    }
  };

  if (leads.length === 0) {
    return (
      <main className="main-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <User size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h2>No Leads Found</h2>
          <p>Import a CSV file to get started.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content" style={{ position: 'relative' }}>
      
      {/* Top Navigation Bar */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none', padding: '1rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Lead {currentIndex + 1} of {leads.length}
          </div>
          { (profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
              <Users size={14} color="var(--text-muted)" />
              <select 
                value={currentLead?.assigned_to || ''} 
                onChange={(e) => handleAssignChange(e.target.value)}
                style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Unassigned</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-outline" 
            style={{ borderColor: 'var(--status-not-interested)', color: 'var(--status-not-interested)' }}
            onClick={() => {
              if(window.confirm("Are you sure you want to permanently delete this lead?")) {
                deleteLead(currentLead.id);
              }
            }}
          >
            <Trash2 size={16} /> Delete
          </button>
          <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 0.5rem' }} />
          <button className="btn btn-outline" onClick={prevLead} disabled={currentIndex === 0}>
            <ChevronLeft size={16} /> Prev
          </button>
          <button className="btn btn-outline" onClick={nextLead} disabled={currentIndex === leads.length - 1}>
             Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Focus Area */}
      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '2rem 4rem', justifyContent: 'center' }}>
        
        {/* Lead Details */}
        <div style={{ marginBottom: '3rem', minWidth: 0 }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', wordBreak: 'break-word' }}>
            {currentLead.name}
            {currentLead.socialLink && (() => {
              let finalLink = currentLead.socialLink;
              if (!finalLink.startsWith('http')) {
                if (finalLink.startsWith('@') || !finalLink.includes('.')) {
                  finalLink = `https://instagram.com/${finalLink.replace('@', '')}`;
                } else {
                  finalLink = `https://${finalLink}`;
                }
              }
              return (
              <a 
                href={finalLink} 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  fontSize: '1rem', 
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', 
                  color: 'white', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '2rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={16} /> Open Social Profile
              </a>
              );
            })()}
          </h1>
          
          <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)', fontSize: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', wordBreak: 'break-all' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={20} /> {currentLead.company || 'No Company'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={20} /> <a href={`tel:${currentLead.phone}`} style={{ color: 'var(--accent-primary)' }}>{currentLead.phone}</a>
              {currentLead.phone && !currentLead.phone.toUpperCase().includes('NA') && /\d/.test(currentLead.phone) && (
                <button 
                  onClick={() => navigator.clipboard.writeText(currentLead.phone)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '0.25rem', padding: '0.3rem', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}
                  title="Copy Phone Number"
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                ><Copy size={16} /></button>
              )}
            </div>
            {currentLead.email && currentLead.email.toLowerCase() !== 'na' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={20} /> <a href={`mailto:${currentLead.email}`}>{currentLead.email}</a>
                <button 
                  onClick={() => navigator.clipboard.writeText(currentLead.email)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '0.25rem', padding: '0.3rem', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}
                  title="Copy Email"
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                ><Copy size={16} /></button>
              </div>
            )}
            {currentLead.website && currentLead.website.toLowerCase() !== 'na' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={20} /> <a href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>{currentLead.website}</a>
                <button 
                  onClick={() => navigator.clipboard.writeText(currentLead.website)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '0.25rem', padding: '0.3rem', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}
                  title="Copy Website"
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                ><Copy size={16} /></button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {currentLead.tags?.map(tag => (
              <span key={tag} style={{ background: 'var(--bg-tertiary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
                <Tag size={12} style={{ display: 'inline', marginRight: '0.25rem' }}/> {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Current Status: <span style={{ fontWeight: 600, color: `var(--status-${currentLead.status.toLowerCase().replace(' ', '-')})` }}>{currentLead.status}</span>
          {currentLead.callbackDate && ` (Scheduled: ${format(new Date(currentLead.callbackDate), "MMM d, h:mm a")})`}
        </div>

        {/* Quick Actions Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <button 
            className="btn" 
            style={{ padding: '1rem', fontSize: '1.1rem', background: 'var(--bg-tertiary)', flexDirection: 'column', gap: '0.5rem', border: '1px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--status-contacted)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            onClick={() => handleAction('Contacted')}
          >
            <CheckCircle2 size={24} color="var(--status-contacted)" />
            Contacted
          </button>
          
          <button 
            className="btn" 
            style={{ padding: '1rem', fontSize: '1.1rem', background: 'var(--bg-tertiary)', flexDirection: 'column', gap: '0.5rem', border: '1px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--status-callback)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            onClick={() => handleAction('Callback')}
          >
            <Clock size={24} color="var(--status-callback)" />
            Callback (Tmw)
          </button>

          <button 
            className="btn" 
            style={{ padding: '1rem', fontSize: '1.1rem', background: 'var(--bg-tertiary)', flexDirection: 'column', gap: '0.5rem', border: '1px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--status-meeting)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            onClick={() => handleAction('Meeting Booked')}
          >
            <Calendar size={24} color="var(--status-meeting)" />
            Meeting
          </button>

          <button 
            className="btn" 
            style={{ padding: '1rem', fontSize: '1.1rem', background: 'var(--bg-tertiary)', flexDirection: 'column', gap: '0.5rem', border: '1px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--status-not-interested)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            onClick={() => handleAction('Not Interested')}
          >
            <XCircle size={24} color="var(--status-not-interested)" />
            Not Interested
          </button>
        </div>

      </div>
    </main>
  );
}
