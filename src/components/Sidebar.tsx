import { NavLink } from 'react-router';
import { ArrowLeftRight, LayoutDashboard, Layers3, Package, UsersRound } from 'lucide-react';
import Brand from './Brand';
import { useAuth } from '../context/useAuth';

const navigation = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/categories', label: 'Catégories', icon: Layers3 },
  { to: '/stock-movements', label: 'Mouvements de stock', icon: ArrowLeftRight },
  { to: '/employees', label: 'Utilisateurs', icon: UsersRound, adminOnly: true },
];

export default function Sidebar() {
  const { session } = useAuth();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';
  const visibleNavigation = navigation.filter(({ adminOnly }) => !adminOnly || isAdmin);

  return (
    <nav
      aria-label="Navigation principale"
      className="bg-ink px-3 pb-3 pt-1 text-white lg:sticky lg:top-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:h-dvh lg:flex-col lg:self-start lg:overflow-y-auto lg:px-4 lg:py-6"
    >
      <div className="mb-8 hidden px-2 lg:block"><Brand /></div>
      <ul role="list" className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap lg:grid lg:grid-cols-1">
        {visibleNavigation.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium focus-visible:outline-rose-300 lg:px-3 ${
                  isActive ? 'bg-brand text-white' : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <p className="mt-auto hidden border-t border-white/15 px-2 pt-4 text-xs text-zinc-300 lg:block">
        Gestion de stock informatique
      </p>
    </nav>
  );
}
