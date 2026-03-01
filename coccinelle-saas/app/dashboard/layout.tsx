import DashboardSidebar from '../../components/DashboardSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {children}
      </main>
    </div>
  );
}
