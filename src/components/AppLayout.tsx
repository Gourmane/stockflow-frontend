import { Outlet } from 'react-router';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] content-start lg:grid-cols-[14.75rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
      <AppHeader />
      <Sidebar />
      <main className="min-w-0 px-4 py-5 sm:p-7 lg:col-start-2 lg:row-start-2 xl:px-9 xl:py-8">
        <Outlet />
      </main>
    </div>
  );
}
