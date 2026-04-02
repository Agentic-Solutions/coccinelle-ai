import DashboardSidebar from '../../components/DashboardSidebar';
import NotificationBell from '../../components/NotificationBell';
import PushBanner from '../../components/PushBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="flex justify-end items-center px-4 py-2 lg:px-6">
          <NotificationBell />
        </div>
        <PushBanner />
        {children}
      </main>
    </div>
  );
}
