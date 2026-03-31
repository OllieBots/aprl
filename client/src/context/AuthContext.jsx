import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ownedLeague, setOwnedLeague] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aprl_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(data => { setUser(data); setOwnedLeague(data.ownedLeague || null); })
        .catch(() => { localStorage.removeItem('aprl_token'); delete api.defaults.headers.common['Authorization']; })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function login(token, userData, leagueData) {
    localStorage.setItem('aprl_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    setOwnedLeague(leagueData || null);
  }

  function logout() {
    localStorage.removeItem('aprl_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setOwnedLeague(null);
  }

  return (
    <AuthContext.Provider value={{ user, ownedLeague, setOwnedLeague, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
