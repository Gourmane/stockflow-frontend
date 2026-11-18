import { NavLink } from 'react-router';
import { useAuth } from '../context/useAuth';

const navigation = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products', label: 'Produits' },
  { to: '/categories', label: 'Categories' },
  { to: '/stock-movements', label: 'Mouvements de stock' },
  { to: '/employees', label: 'Employees', adminOnly: true },
];

export default function Sidebar() {
  const { session } = useAuth();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';
  const visibleNavigation = navigation.filter(({ adminOnly }) => !adminOnly || isAdmin);

  return (
    <nav
      aria-label="Navigation principale"
      className="border-b border-slate-200 bg-white p-4 md:w-56 md:shrink-0 md:border-r md:border-b-0"
    >
      <ul className="grid grid-cols-2 gap-1 md:grid-cols-1">
        {visibleNavigation.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex min-h-11 items-center rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isActive ? 'bg-blue-50 font-semibold text-blue-800' : 'font-medium text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
