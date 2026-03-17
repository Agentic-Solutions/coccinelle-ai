import { redirect } from 'next/navigation';

export default function AppointmentsSettingsRedirect() {
  redirect('/dashboard/availability');
}
