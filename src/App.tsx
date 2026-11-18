
import { Routes, Route, Navigate } from 'react-router';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Redirection vers Login */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* Route publique */}
      <Route path="/login" element={<Login />} />

      {/* Routes protégées */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Page inconnue */}
      <Route
        path="*"
        element={<h1>404 - Page introuvable</h1>}
      />
    </Routes>
  );
}
