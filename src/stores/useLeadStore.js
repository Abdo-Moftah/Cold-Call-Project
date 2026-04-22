import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

export const useLeadStore = create((set, get) => ({
  leads: [],
  user: { id: 'dummy-admin', email: 'admin@local' },
  profile: { id: 'dummy-admin', role: 'admin', full_name: 'Admin User' },
  currentIndex: 0,
  searchQuery: '',
  statusFilter: 'All', 
  isUploading: false,
  selectedIds: [],
  
  fetchProfile: async () => {
    const dummy = { id: 'dummy-admin', role: 'admin', full_name: 'Admin User' };
    set({ user: { id: 'dummy-admin' }, profile: dummy });
    return dummy;
  },

  login: async (email, password) => {
    return { error: null };
  },

  logout: async () => {
    // Do nothing
  },

  fetchLeads: async () => {
    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (leads && !leadsError) {
        const enrichedLeads = leads.map(lead => ({
          ...lead,
          notes: notes?.filter(n => n.lead_id === lead.id) || []
        }));
        set({ leads: enrichedLeads });
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  },

  addLeads: async (newLeads) => {
    set({ isUploading: true });
    const { data, error } = await supabase.from('leads').insert(newLeads).select();
    if (data && !error) {
      await get().fetchLeads();
    }
    set({ isUploading: false });
    return { data, error };
  },

  updateLeadStatus: async (leadId, status, callbackDate = null) => {
    const { error } = await supabase
      .from('leads')
      .update({ status, callbackDate })
      .eq('id', leadId);
    
    if (!error) {
      await get().fetchLeads();
    }
  },

  deleteLead: async (leadId) => {
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (!error) {
      await get().fetchLeads();
    }
  },

  deleteSelectedLeads: async () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    const { error } = await supabase.from('leads').delete().in('id', selectedIds);
    if (!error) {
      set({ selectedIds: [] });
      await get().fetchLeads();
    }
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),
  nextLead: () => {
    const { currentIndex, leads } = get();
    const filtered = get().filteredLeads();
    if (currentIndex < filtered.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },
  prevLead: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query, currentIndex: 0 }),
  setStatusFilter: (filter) => set({ statusFilter: filter, currentIndex: 0 }),
  
  filteredLeads: () => {
    const { leads, searchQuery, statusFilter } = get();
    return leads.filter(lead => {
      const matchesSearch = 
        (lead.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.company?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.phone?.includes(searchQuery));
      
      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  },

  toggleLeadSelection: (id) => {
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter(sid => sid !== id) });
    } else {
      set({ selectedIds: [...selectedIds, id] });
    }
  },

  selectAllVisible: () => {
    const visibleIds = get().filteredLeads().map(l => l.id);
    set({ selectedIds: visibleIds });
  },

  clearSelection: () => set({ selectedIds: [] })
}));
