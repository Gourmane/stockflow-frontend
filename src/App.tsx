
import { Routes, Route, Navigate } from 'react-router';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import PlaceholderPage from './pages/PlaceholderPage';

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
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<PlaceholderPage title="Products" />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/stock-movements" element={<PlaceholderPage title="Stock Movements" />} />
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/employees" element={<PlaceholderPage title="Employees" />} />
          </Route>
        </Route>
      </Route>

      {/* Page inconnue */}
      <Route
        path="*"
        element={<h1>404 - Page introuvable</h1>}
      />
    </Routes>
  );
}
