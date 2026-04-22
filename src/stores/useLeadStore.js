import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';

export const useLeadStore = create(
  persist(
    (set, get) => ({
  leads: [],
  currentIndex: 0,
  searchQuery: '',
  statusFilter: 'All', // 'All', 'Not Contacted', 'Contacted', 'Callback', 'Meeting Booked', 'Not Interested'
  theme: 'default',
  cheatSheet: 'Common Objections:\n\n"Not Interested":\n"I completely understand, [Name]. Just so I don\'t bother you again, was it bad timing, or are you guys already squared away with [Service]?"\n\n"Send me an email":\n"I can definitely do that. But just to make sure I don\'t send you spam, what specifically are you guys struggling with right now?"',
  isUploading: false,
  selectedIds: [],
  
  fetchLeads: async () => {
    const { data: leads, error: leadsError } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const { data: notes, error: notesError } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
    
    if (leads && !leadsError) {
      const enrichedLeads = leads.map(lead => ({
        ...lead,
        notes: notes?.filter(n => n.lead_id === lead.id) || []
      }));
      set({ leads: enrichedLeads });
    }
  },

  // Getters
  filteredLeads: () => {
    const { leads, searchQuery, statusFilter } = get();
    return leads.filter((lead) => {
      const name = lead?.name || '';
      const company = lead?.company || '';
      const phone = lead?.phone || '';
      
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  },

  getCurrentLead: () => {
    const filtered = get().filteredLeads();
    return filtered.length > 0 ? filtered[get().currentIndex] : null;
  },

  // Actions
  setTheme: (theme) => set({ theme }),
  updateCheatSheet: (cheatSheet) => set({ cheatSheet }),
  
  setLeads: (leads) => set({ leads, currentIndex: 0 }),
  
  addLeads: async (newLeads) => {
    set({ isUploading: true });
    try {
      const existingLeads = [...get().leads];

      for (const newLead of newLeads) {
        const isVal = (val) => val && val.toString().trim() !== '' && val.toString().toLowerCase() !== 'na' && val.toString().toLowerCase() !== 'no phone';

        const duplicateIndex = existingLeads.findIndex(existing => {
          const hasPhoneMatch = isVal(newLead.phone) && existing.phone === newLead.phone;
          const hasEmailMatch = isVal(newLead.email) && existing.email === newLead.email;
          const hasSocialMatch = isVal(newLead.socialLink) && existing.socialLink === newLead.socialLink;
          const hasNameCompanyMatch = isVal(newLead.name) && newLead.name !== 'Unknown' && existing.name === newLead.name && existing.company === newLead.company;
          const isIdenticalClone = newLead.name === existing.name && newLead.company === existing.company && newLead.phone === existing.phone && newLead.email === existing.email && newLead.socialLink === existing.socialLink;
          
          return hasPhoneMatch || hasEmailMatch || hasSocialMatch || hasNameCompanyMatch || isIdenticalClone;
        });

        let targetLeadId;

        if (duplicateIndex >= 0) {
          let existing = existingLeads[duplicateIndex];
          const updatedDbLead = {
            name: (newLead.name && newLead.name !== 'Unknown') ? newLead.name : existing.name,
            company: newLead.company || existing.company,
            phone: (newLead.phone && newLead.phone !== 'No Phone') ? newLead.phone : existing.phone,
            email: newLead.email || existing.email,
            socialLink: newLead.socialLink || existing.socialLink,
            website: newLead.website || existing.website,
            tags: [...new Set([...(existing.tags || []), ...(newLead.tags || [])])],
            updated_at: new Date().toISOString()
          };
          const { error } = await supabase.from('leads').update(updatedDbLead).eq('id', existing.id);
          if (error) console.error("Error updating lead:", error);
          targetLeadId = existing.id;
        } else {
          const { data, error } = await supabase.from('leads').insert({
            name: newLead.name,
            company: newLead.company,
            phone: newLead.phone,
            email: newLead.email,
            socialLink: newLead.socialLink,
            website: newLead.website,
            tags: newLead.tags || [],
          }).select().single();
          
          if (error) {
            console.error("Error inserting lead:", error);
            continue;
          }
          if (data) {
            targetLeadId = data.id;
            existingLeads.push({ ...data, notes: [] }); // Track it so duplicates in the same batch are caught
          }
        }

        if (targetLeadId && newLead.notes && newLead.notes.length > 0) {
          for (const note of newLead.notes) {
            const { data: existingNotes } = await supabase.from('notes').select('id').eq('lead_id', targetLeadId).eq('content', note.content);
            if (!existingNotes || existingNotes.length === 0) {
              const { error: noteError } = await supabase.from('notes').insert({ lead_id: targetLeadId, content: note.content });
              if (noteError) console.error("Error inserting note:", noteError);
            }
          }
        }
      }
      
      await get().fetchLeads();
    } catch (err) {
      console.error("Critical Upload Error:", err);
      alert("Something went wrong during the upload. Check console (F12) for details.");
    } finally {
      set({ isUploading: false });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query, currentIndex: 0 }),
  
  setStatusFilter: (filter) => set({ statusFilter: filter, currentIndex: 0 }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  toggleLeadSelection: (id) => {
    const { selectedIds } = get();
    const newSelected = selectedIds.includes(id) 
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id];
    set({ selectedIds: newSelected });
  },

  selectAllVisible: () => {
    const visibleIds = get().filteredLeads().map(l => l.id);
    set({ selectedIds: visibleIds });
  },

  clearSelection: () => set({ selectedIds: [] }),

  deleteSelectedLeads: async () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    
    set({ isUploading: true });
    try {
      // Bulk delete leads (CASCADE will handle notes if configured, otherwise we delete them too)
      await supabase.from('leads').delete().in('id', selectedIds);
      
      set((state) => {
        const remainingLeads = state.leads.filter(l => !selectedIds.includes(l.id));
        return { 
          leads: remainingLeads, 
          selectedIds: [],
          currentIndex: 0
        };
      });
    } catch (err) {
      console.error("Error during bulk delete:", err);
      alert("Failed to delete some leads. Check console.");
    } finally {
      set({ isUploading: false });
    }
  },

  nextLead: () => set((state) => {
    const filtered = get().filteredLeads();
    if (state.currentIndex < filtered.length - 1) {
      return { currentIndex: state.currentIndex + 1 };
    }
    return state;
  }),

  prevLead: () => set((state) => {
    if (state.currentIndex > 0) {
      return { currentIndex: state.currentIndex - 1 };
    }
    return state;
  }),

  updateLeadStatus: async (id, status, callbackDate = null) => {
    set((state) => ({ leads: state.leads.map(l => l.id === id ? { ...l, status, callbackDate } : l) }));
    await supabase.from('leads').update({ status, callbackDate, updated_at: new Date().toISOString() }).eq('id', id);
  },

  addNoteToLead: async (id, noteContent) => {
    const { data } = await supabase.from('notes').insert({ lead_id: id, content: noteContent }).select().single();
    if (data) {
       set((state) => ({ leads: state.leads.map(l => l.id === id ? { ...l, notes: [data, ...(l.notes || [])] } : l) }));
    }
  },

  deleteNoteFromLead: async (leadId, noteId) => {
    set((state) => ({ leads: state.leads.map(l => l.id === leadId ? { ...l, notes: l.notes.filter(n => String(n.id) !== String(noteId)) } : l) }));
    await supabase.from('notes').delete().eq('id', noteId);
  },

  deleteLead: async (id) => {
    set((state) => {
      const updatedLeads = state.leads.filter(lead => lead.id !== id);
      let newIndex = state.currentIndex;
      if (newIndex >= updatedLeads.length) newIndex = Math.max(0, updatedLeads.length - 1);
      return { leads: updatedLeads, currentIndex: newIndex };
    });
    await supabase.from('leads').delete().eq('id', id);
  },
}),
{
  name: 'cold-caller-storage',
  partialize: (state) => ({ theme: state.theme, cheatSheet: state.cheatSheet }),
}
)
);
