"use client";

import { useLeadStore } from "@/stores/useLeadStore";
import { format } from "date-fns";
import { Trash2, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

export default function RightSidebar() {
  const leads = useLeadStore(state => state.leads);
  const currentIndex = useLeadStore(state => state.currentIndex);
  const statusFilter = useLeadStore(state => state.statusFilter);
  const searchQuery = useLeadStore(state => state.searchQuery);
  const addNoteToLead = useLeadStore(state => state.addNoteToLead);
  const deleteNoteFromLead = useLeadStore(state => state.deleteNoteFromLead);
  const theme = useLeadStore(state => state.theme);
  const setTheme = useLeadStore(state => state.setTheme);
  const cheatSheet = useLeadStore(state => state.cheatSheet);
  const updateCheatSheet = useLeadStore(state => state.updateCheatSheet);

  const [showCheatSheet, setShowCheatSheet] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const currentLead = filteredLeads.length > 0 ? filteredLeads[currentIndex] : null;

  const handleNoteSubmit = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const value = e.target.value.trim();
      if (value && currentLead) {
        addNoteToLead(currentLead.id, value);
        e.target.value = '';
      }
    }
  };

  return (
    <aside className="sidebar-right">
      <div className="panel-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Fast Notes</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.2rem 0.5rem', background: showCheatSheet ? 'var(--accent-primary)' : 'transparent', color: showCheatSheet ? 'white' : 'var(--text-primary)', border: showCheatSheet ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)'}}
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              title="Toggle Call Script Cheat Sheet"
            >
              <BookOpen size={14} />
            </button>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="default">Default Dark</option>
              <option value="earth">Earth / Stone</option>
              <option value="sky">Sky / Light Beige</option>
              <option value="midnight">Midnight Purple</option>
              <option value="forest">Forest Green</option>
            </select>
          </div>
        </div>
      </div>

      {showCheatSheet && (
        <div style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Call Script & Objections
          </div>
          <textarea
            className="textarea"
            value={cheatSheet}
            onChange={(e) => updateCheatSheet(e.target.value)}
            style={{ border: 'none', borderRadius: 0, height: '200px', resize: 'vertical', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}
            placeholder="Write your objection handlers or intros here..."
          />
        </div>
      )}
      
      {!currentLead ? (
        <div className="panel-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          No active lead
        </div>
      ) : (
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <textarea 
          className="textarea" 
          placeholder="Start typing... Press Enter to save"
          style={{ height: '120px', resize: 'none' }}
          onKeyDown={handleNoteSubmit}
        ></textarea>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pro tip: Shift+Enter for new line. Auto-saves on Enter.</div>

        <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Note History</h3>
          
          {currentLead.notes && currentLead.notes.length > 0 ? (
            currentLead.notes.map(note => (
              <div key={note.id} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {format(new Date(note.created_at), "MMM d, h:mm a")}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Are you sure you want to delete this note?")) {
                        deleteNoteFromLead(currentLead.id, note.id);
                      }
                    }}
                    style={{ color: 'var(--text-muted)', background: 'transparent', padding: '0.2rem', cursor: 'pointer', display: 'flex' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--status-not-interested)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Delete Note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {note.content}
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No notes yet. Add one above.</div>
          )}
        </div>
        </div>
      )}
    </aside>
  );
}
