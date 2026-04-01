import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const message = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

export default api;

// Convenience methods
export const league = {
  get: () => api.get('/league'),
  update: (data) => api.put('/league', data),
};

export const seasons = {
  list: () => api.get('/seasons'),
  create: (data) => api.post('/seasons', data),
  update: (id, data) => api.put(`/seasons/${id}`, data),
};

export const drivers = {
  list: () => api.get('/drivers'),
  get: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  delete: (id) => api.delete(`/drivers/${id}`),
};

export const races = {
  list: (params) => api.get('/races', { params }),
  create: (data) => api.post('/races', data),
  update: (id, data) => api.put(`/races/${id}`, data),
  delete: (id) => api.delete(`/races/${id}`),
  getResults: (id) => api.get(`/races/${id}/results`),
  importResults: (id, subsession_id) => api.post(`/races/${id}/results/import`, { subsession_id }),
  updateResult: (raceId, driverId, data) => api.put(`/races/${raceId}/results/${driverId}`, data),
};

export const standings = {
  get: (season_id) => api.get('/standings', { params: { season_id } }),
  progression: (season_id) => api.get('/standings/progression', { params: { season_id } }),
};

export const iracing = {
  connect: (email, password) => api.post('/iracing/connect', { email, password }),
  status: () => api.get('/iracing/status'),
  sync: (raceId) => api.post(`/iracing/sync/${raceId}`),
  getConfig: () => api.get('/iracing/config'),
  updateConfig: (data) => api.put('/iracing/config', data),
  importSchedule: (data) => api.post('/iracing/import-schedule', data),
};

export const discord = {
  saveConfig: (data) => api.post('/discord/config', data),
  status: () => api.get('/discord/status'),
  test: () => api.post('/discord/test'),
  getLogs: () => api.get('/discord/logs'),
  getChannels: () => api.get('/discord/channels'),
  saveChannels: (data) => api.post('/discord/channels', data),
  postStandings: (channel) => api.post('/discord/post-standings', { channel }),
  inviteUrl: () => api.get('/discord/invite-url'),
};

export const activity = {
  list: (params) => api.get('/activity', { params }),
};

export const members = {
  list: (leagueId) => api.get(`/members/${leagueId}`),
  invite: (leagueId, iracing_cust_id) => api.post(`/members/${leagueId}/invite`, { iracing_cust_id }),
  update: (leagueId, membershipId, data) => api.put(`/members/${leagueId}/${membershipId}`, data),
  remove: (leagueId, membershipId) => api.delete(`/members/${leagueId}/${membershipId}`),
  getCarNumbers: (leagueId) => api.get(`/members/${leagueId}/car-numbers`),
};

export const userApi = {
  dashboard: () => api.get('/user/dashboard'),
  acceptInvite: (id, data) => api.post(`/user/invites/${id}/accept`, data),
  declineInvite: (id) => api.post(`/user/invites/${id}/decline`),
  getInviteCarNumbers: (id) => api.get(`/user/invites/${id}/car-numbers`),
};
