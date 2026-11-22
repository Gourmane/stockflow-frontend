import { NavLink } from 'react-router';
import { ArrowLeftRight, LayoutDashboard, Layers3, Package, UsersRound } from 'lucide-react';
import Brand from './Brand';
import { useAuth } from '../context/useAuth';

const navigation = [
  { to: '/dashboard', label: 'Tableau de bord', shortLabel: 'Accueil', icon: LayoutDashboard },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/categories', label: 'Catégories', icon: Layers3 },
  { to: '/stock-movements', label: 'Mouvements de stock', shortLabel: 'Mouvements', icon: ArrowLeftRight },
  { to: '/employees', label: 'Utilisateurs', icon: UsersRound, adminOnly: true },
];

export default function Sidebar() {
  const { session } = useAuth();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';
  const visibleNavigation = navigation.filter(({ adminOnly }) => !adminOnly || isAdmin);

  return (
    <nav
      aria-label="Navigation principale"
      className="min-w-0 border-b border-line bg-white px-1 sm:px-4 lg:sticky lg:top-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:h-dvh lg:flex-col lg:self-start lg:overflow-y-auto lg:border-0 lg:bg-ink lg:px-3 lg:py-4 xl:px-4"
    >
      <div className="mb-5 hidden border-b border-white/12 px-2 pb-4 lg:block"><Brand compact /></div>
      <ul role="list" className="flex lg:grid lg:gap-1">
        {visibleNavigation.map(({ to, label, shortLabel, icon: Icon }) => (
          <li key={to} className="min-w-0 flex-1 lg:flex-initial">
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 border-b-2 px-0.5 text-[0.625rem] leading-tight font-semibold outline-offset-[-3px] transition-colors sm:flex-row sm:gap-2 sm:px-2 sm:text-sm lg:min-h-10 lg:justify-start lg:rounded-md lg:border-b-0 lg:border-s-2 lg:px-2 lg:text-[0.8125rem] lg:whitespace-nowrap lg:focus-visible:outline-rose-200 motion-reduce:transition-none ${
                  isActive
                    ? 'border-brand bg-brand-tint text-brand lg:border-rose-400 lg:bg-white/10 lg:text-white'
                    : 'border-transparent text-muted hover:bg-canvas hover:text-ink lg:text-zinc-300 lg:hover:bg-white/7 lg:hover:text-white'
                }`
              }
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              {shortLabel
                ? <><span className="sm:hidden">{shortLabel}</span><span className="hidden sm:inline">{label}</span></>
                : <span>{label}</span>}
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
