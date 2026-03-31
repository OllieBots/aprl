import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Schedule from './pages/admin/Schedule';
import Results from './pages/admin/Results';
import Drivers from './pages/admin/Drivers';
import Standings from './pages/admin/Standings';
import IRacingConfig from './pages/admin/IRacingConfig';
import DiscordConfig from './pages/admin/DiscordConfig';
import Settings from './pages/admin/Settings';
import EmbedStandings from './pages/EmbedStandings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="results" element={<Results />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="standings" element={<Standings />} />
          <Route path="iracing" element={<IRacingConfig />} />
          <Route path="discord" element={<DiscordConfig />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/embed/standings" element={<EmbedStandings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
