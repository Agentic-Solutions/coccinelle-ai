import { redirect } from 'next/navigation';

export default function AppointmentsRedirect() {
  redirect('/dashboard/rdv');
}
