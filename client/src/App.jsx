import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DriverDashboard from './pages/DriverDashboard';
import LeaguePage from './pages/LeaguePage';
import EmbedStandings from './pages/EmbedStandings';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Schedule from './pages/admin/Schedule';
import Results from './pages/admin/Results';
import Drivers from './pages/admin/Drivers';
import Standings from './pages/admin/Standings';
import IRacingConfig from './pages/admin/IRacingConfig';
import DiscordConfig from './pages/admin/DiscordConfig';
import Settings from './pages/admin/Settings';
import IRT from './pages/admin/IRT';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
          <Route path="/league/:slug" element={<LeaguePage />} />
          <Route path="/embed/standings" element={<EmbedStandings />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="results" element={<Results />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="standings" element={<Standings />} />
            <Route path="iracing" element={<IRacingConfig />} />
            <Route path="discord" element={<DiscordConfig />} />
            <Route path="settings" element={<Settings />} />
            <Route path="irt" element={<IRT />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
