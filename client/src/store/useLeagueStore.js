import { create } from 'zustand';
import { league, seasons, activity } from '../lib/api';

const useLeagueStore = create((set, get) => ({
  league: null,
  seasons: [],
  activeSeason: null,
  activityLog: [],
  loading: false,
  error: null,

  fetchLeague: async () => {
    try {
      const data = await league.get();
      set({ league: data });
    } catch (err) {
      set({ error: err.message });
    }
  },

  fetchSeasons: async () => {
    try {
      const data = await seasons.list();
      const active = data.find(s => s.is_active) || data[0];
      set({ seasons: data, activeSeason: active });
    } catch (err) {
      set({ error: err.message });
    }
  },

  fetchActivity: async () => {
    try {
      const data = await activity.list({ limit: 15 });
      set({ activityLog: data });
    } catch (err) {
      set({ error: err.message });
    }
  },

  updateLeague: async (data) => {
    await league.update(data);
    set(state => ({ league: { ...state.league, ...data } }));
  },
}));

export default useLeagueStore;
