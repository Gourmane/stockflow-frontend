import { Outlet } from 'react-router';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] content-start lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] xl:grid-cols-[13.5rem_minmax(0,1fr)]">
      <AppHeader />
      <Sidebar />
      <main className="min-w-0 px-3 py-5 sm:p-6 lg:col-start-2 lg:row-start-2 xl:px-8 xl:py-7">
        <Outlet />
      </main>
    </div>
  );
}
