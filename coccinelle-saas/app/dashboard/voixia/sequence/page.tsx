import { redirect } from 'next/navigation';

export default function VoixIASequenceRedirect() {
  redirect('/dashboard/agents/nodes');
}
