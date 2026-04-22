"use client";

import { useLeadStore } from "@/stores/useLeadStore";
import { format } from "date-fns";
import { Search, Upload, Filter, Users, PhoneCall, Calendar, XCircle, Phone, Download, Trash2, LogOut, MapPin, BarChart3 } from "lucide-react";
import Papa from "papaparse";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LeftSidebar() {
  const { 
    leads, 
    addLeads, 
    isUploading, 
    searchQuery, 
    setSearchQuery, 
    statusFilter, 
    setStatusFilter, 
    filteredLeads, 
    currentIndex, 
    setCurrentIndex,
    selectedIds,
    toggleLeadSelection,
    selectAllVisible,
    clearSelection,
    deleteSelectedLeads,
    user,
    profile,
    logout,
    fetchProfile
  } = useLeadStore();
  
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!user) {
      fetchProfile().then(p => {
        if (!p) router.push("/login");
      });
    }
  }, [user, fetchProfile, router]);

  if (!mounted) return null;

  const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor';
  const isAdmin = profile?.role === 'admin';
  const fileInputRef = useRef(null);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const handleExitSelect = () => {
    clearSelection();
    setIsSelectMode(false);
  };

  useEffect(() => {
    const activeElement = document.getElementById(`lead-item-${currentIndex}`);
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const getVal = (row, matchers) => {
          const key = Object.keys(row).find(k => matchers.some(m => k.toLowerCase().includes(m)));
          return key ? row[key] : '';
        };

        const parsedLeads = results.data.map((row, index) => {
          const company = getVal(row, ['company', 'business', 'account', 'handle', 'org']);
          const name = getVal(row, ['name', 'contact', 'person', 'lead', 'first', 'last']) || company || 'Unknown';
          const tagsStr = getVal(row, ['tag', 'category', 'type', 'industry', 'niche', 'price']);
          
          let rawSocial = getVal(row, ['instagram', 'social', 'link', 'url', 'profile', 'account', 'ig']);
          let socialLink = rawSocial;
          const mdMatch = rawSocial.match(/\]\((.*?)\)/);
          if (mdMatch && mdMatch[1]) socialLink = mdMatch[1];
          
          const activity = getVal(row, ['description', 'activity', 'notes', 'memo']);
          const website = getVal(row, ['website', 'site', 'web']);
          
          const initialNotes = [];
          const noteParts = [];
          if (row.Notes) noteParts.push(row.Notes);
          if (activity) noteParts.push(`Description: ${activity}`);
          
          if (noteParts.length > 0) {
            initialNotes.push({ id: Date.now() + index, content: noteParts.join('\n\n'), created_at: new Date().toISOString() });
          }

          return {
            name,
            phone: getVal(row, ['phone', 'number', 'tel', 'mobile', 'cell']) || 'No Phone',
            company,
            email: getVal(row, ['email', 'mail']),
            socialLink,
            website,
            tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
            status: 'Not Contacted',
            notes: initialNotes,
            callbackDate: null,
          };
        });
        addLeads(parsedLeads);
      }
    });
    // Reset file input so same file can be re-imported
    e.target.value = '';
  };

  const currentStats = {
    total: leads.length,
    contacted: leads.filter(l => l.status !== 'Not Contacted').length,
    meetings: leads.filter(l => l.status === 'Meeting Booked').length,
    callbacks: leads.filter(l => l.status === 'Callback').length,
    notInterested: leads.filter(l => l.status === 'Not Interested').length,
  };

  const handleExportCSV = () => {
    const dataToExport = selectedIds.length > 0 
      ? leads.filter(l => selectedIds.includes(l.id))
      : leads;

    if (dataToExport.length === 0) return alert('No leads to export.');
    
    const exportData = dataToExport.map(lead => ({
      Name: lead.name,
      Company: lead.company,
      Phone: lead.phone,
      Email: lead.email,
      'Social Link': lead.socialLink,
      Website: lead.website,
      Status: lead.status,
      Tags: lead.tags?.join(', ') || '',
      'Recent Note': lead.notes && lead.notes.length > 0 ? lead.notes[0].content : '',
      'Note Count': lead.notes ? lead.notes.length : 0,
      'Callback Date': lead.callbackDate ? new Date(lead.callbackDate).toLocaleString() : ''
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Leads_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <aside className="sidebar-left">
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
        <img src="/logo.png" alt="Outreach OS Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
        <span>Outreach OS</span>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Import & Export & Tools Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {isAdminOrSupervisor && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="file" 
                  accept=".csv" 
                  style={{ display: 'none' }} 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', opacity: isUploading ? 0.7 : 1 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload size={16} className={isUploading ? "spinning" : ""} /> 
                  {isUploading ? "Uploading..." : "Import CSV"}
                </button>
              </div>
              <button 
                className="btn btn-outline" 
                style={{ padding: '0 0.75rem' }}
                title="Export updated leads to CSV"
                onClick={handleExportCSV}
              >
                <Download size={16} /> Export
              </button>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {isAdminOrSupervisor && (
              <>
                <Link href="/extractor" style={{ textDecoration: 'none' }}>
                  <div className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <MapPin size={16} color="var(--accent-primary)" /> Lead Extractor
                  </div>
                </Link>
                <Link href="/performance" style={{ textDecoration: 'none' }}>
                  <div className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <BarChart3 size={16} /> Performance
                  </div>
                </Link>
              </>
            )}
            {isAdmin && (
              <Link href="/team" style={{ textDecoration: 'none' }}>
                <div className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <Users size={16} /> Team Management
                </div>
              </Link>
            )}
          </div>
        </section>

        {/* Dashboard Stats */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div 
            onClick={() => setStatusFilter('All')}
            style={{ background: statusFilter === 'All' ? 'var(--bg-hover)' : 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: statusFilter === 'All' ? '1px solid var(--accent-primary)' : '1px solid transparent' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Leads</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{currentStats.total}</div>
          </div>
          <div 
            onClick={() => setStatusFilter('Contacted')}
            style={{ background: statusFilter === 'Contacted' ? 'var(--bg-hover)' : 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: statusFilter === 'Contacted' ? '1px solid var(--status-contacted)' : '1px solid transparent' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contacted</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{currentStats.contacted}</div>
          </div>
          <div 
            onClick={() => setStatusFilter('Callback')}
            style={{ background: statusFilter === 'Callback' ? 'var(--bg-hover)' : 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: statusFilter === 'Callback' ? '1px solid var(--status-callback)' : '1px solid transparent' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Callbacks</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--status-callback)' }}>{currentStats.callbacks}</div>
          </div>
          <div 
            onClick={() => setStatusFilter('Meeting Booked')}
            style={{ background: statusFilter === 'Meeting Booked' ? 'var(--bg-hover)' : 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: statusFilter === 'Meeting Booked' ? '1px solid var(--status-meeting)' : '1px solid transparent' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meetings</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--status-meeting)' }}>{currentStats.meetings}</div>
          </div>
          <div 
            onClick={() => setStatusFilter('Not Interested')}
            style={{ background: statusFilter === 'Not Interested' ? 'var(--bg-hover)' : 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: statusFilter === 'Not Interested' ? '1px solid var(--status-not-interested)' : '1px solid transparent' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rejected</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--status-not-interested)' }}>{currentStats.notInterested}</div>
          </div>
        </section>

        {/* Search & Filter */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search leads..." 
              style={{ paddingLeft: '2.5rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['All', 'Not Contacted', 'Contacted', 'Callback', 'Meeting Booked'].map(status => (
              <button
                key={status}
                className="btn"
                style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.6rem',
                  background: statusFilter === status ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: 'white',
                  borderRadius: '1rem'
                }}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        {/* Filtered Leads List */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Leads ({filteredLeads().length})
            </h3>
            {filteredLeads().length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!isSelectMode ? (
                  <button
                    onClick={() => setIsSelectMode(true)}
                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, padding: '0.15rem 0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                  >
                    Select
                  </button>
                ) : (
                  <button
                    onClick={selectedIds.length === filteredLeads().length ? clearSelection : selectAllVisible}
                    style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, padding: '0.15rem 0.4rem', border: '1px solid var(--accent-primary)', borderRadius: '4px' }}
                  >
                    {selectedIds.length === filteredLeads().length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredLeads().map((lead, index) => (
              <div 
                key={lead.id}
                id={`lead-item-${index}`}
                onClick={() => setCurrentIndex(index)}
                style={{ 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-md)', 
                  cursor: 'pointer',
                  background: currentIndex === index ? 'var(--bg-hover)' : 'transparent',
                  borderLeft: currentIndex === index ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                {isSelectMode && (
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(lead.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleLeadSelection(lead.id);
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer', flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</span>
                    {lead.phone && !lead.phone.toUpperCase().includes('NA') && /\d/.test(lead.phone) && <Phone size={14} color="var(--status-meeting)" style={{ flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lead.status === 'Callback' ? <span style={{color: 'var(--status-callback)', fontWeight: 600}}>Needs Callback</span> : (lead.company || (!lead.phone.toUpperCase().includes('NA') ? lead.phone : ''))}
                  </div>
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: lead.status === 'Meeting Booked' ? 'var(--status-meeting)' : `var(--status-${lead.status.toLowerCase().replace(' ', '-')})`, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{ 
          position: 'absolute', 
          bottom: '1rem', 
          left: '1rem', 
          right: '1rem', 
          background: 'var(--accent-primary)', 
          color: 'white', 
          padding: '0.75rem 1rem', 
          borderRadius: 'var(--radius-md)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 100,
          animation: 'slideUp 0.3s ease'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {selectedIds.length} Selected
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleExportCSV} title="Export Selected" style={{ color: 'white' }}><Download size={18} /></button>
            <button 
              onClick={() => {
                if(window.confirm(`Delete ${selectedIds.length} leads permanently?`)) {
                  deleteSelectedLeads();
                }
              }} 
              title="Delete Selected" 
              style={{ color: 'white' }}
            >
              <Trash2 size={18} />
            </button>
            <button onClick={handleExitSelect} style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Done</button>
          </div>
        </div>
      )}

      <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'User'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{profile?.role || 'Agent'}</div>
          </div>
          <button onClick={() => { logout(); router.push("/login"); }} style={{ color: 'var(--text-muted)', padding: '0.5rem' }} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
