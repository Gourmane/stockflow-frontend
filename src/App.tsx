
import { Routes, Route, Navigate } from 'react-router';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import ProductPage from './pages/ProductPage';
import StockMovementPage from './pages/StockMovementPage';
import StockMovements from './pages/StockMovements';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Users from './pages/Users';

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
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductPage mode="details" />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/stock-movements" element={<StockMovements />} />
          <Route path="/stock-movements/new/:productId" element={<StockMovementPage />} />
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/products/new" element={<ProductPage mode="create" />} />
            <Route path="/products/:productId/edit" element={<ProductPage mode="edit" />} />
            <Route path="/employees" element={<Users />} />
          </Route>
        </Route>
      </Route>

      {/* Page inconnue */}
      <Route
        path="*"
        element={
          <main className="mx-auto max-w-lg px-4 py-8">
            <h1 className="panel page-title p-6">404 – Page introuvable</h1>
          </main>
        }
      />
    </Routes>
  );
}
