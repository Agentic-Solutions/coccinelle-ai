import { redirect } from 'next/navigation';

export default function VoixIARedirect() {
  redirect('/dashboard/agents/configuration');
}
