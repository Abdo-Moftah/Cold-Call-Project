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
  theme: 'default',
  cheatSheet: '',

  setTheme: (theme) => set({ theme }),
  updateCheatSheet: (text) => set({ cheatSheet: text }),
  
  fetchProfile: async () => {
    const dummy = { id: 'dummy-admin', role: 'admin', full_name: 'Admin User' };
    set({ user: { id: 'dummy-admin' }, profile: dummy });
    return dummy;
  },

  login: async () => ({ error: null }),
  logout: async () => {},

  fetchLeads: async () => {
    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (leadsError) throw leadsError;

      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      
      const enrichedLeads = (leads || []).map(lead => ({
        ...lead,
        status: lead.status || 'Not Contacted',
        notes: (notes || []).filter(n => n.lead_id === lead.id)
      }));

      set({ leads: enrichedLeads });
    } catch (err) {
      console.error("Critical Store Error (fetchLeads):", err);
      // Ensure leads is never null
      set({ leads: [] });
    }
  },

  addLeads: async (newLeads) => {
    set({ isUploading: true });
    try {
      const { data, error } = await supabase.from('leads').insert(newLeads).select();
      if (!error) await get().fetchLeads();
      return { data, error };
    } finally {
      set({ isUploading: false });
    }
  },

  updateLeadStatus: async (leadId, status, callbackDate = null) => {
    try {
      await supabase.from('leads').update({ status, callbackDate }).eq('id', leadId);
      await get().fetchLeads();
    } catch (err) {
      console.error("Update Error:", err);
    }
  },

  deleteLead: async (leadId) => {
    await supabase.from('leads').delete().eq('id', leadId);
    await get().fetchLeads();
  },

  deleteSelectedLeads: async () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    await supabase.from('leads').delete().in('id', selectedIds);
    set({ selectedIds: [] });
    await get().fetchLeads();
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),
  nextLead: () => {
    const { currentIndex } = get();
    const filtered = get().filteredLeads();
    if (currentIndex < filtered.length - 1) set({ currentIndex: currentIndex + 1 });
  },
  prevLead: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  setSearchQuery: (query) => set({ searchQuery: query, currentIndex: 0 }),
  setStatusFilter: (filter) => set({ statusFilter: filter, currentIndex: 0 }),
  
  filteredLeads: () => {
    const { leads = [], searchQuery = '', statusFilter = 'All' } = get();
    return leads.filter(lead => {
      if (!lead) return false;
      const name = lead.name || '';
      const company = lead.company || '';
      const phone = lead.phone || '';
      
      const matchesSearch = 
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  },

  toggleLeadSelection: (id) => {
    const { selectedIds } = get();
    set({ selectedIds: selectedIds.includes(id) ? selectedIds.filter(sid => sid !== id) : [...selectedIds, id] });
  },

  selectAllVisible: () => set({ selectedIds: get().filteredLeads().map(l => l.id) }),
  clearSelection: () => set({ selectedIds: [] })
}));
