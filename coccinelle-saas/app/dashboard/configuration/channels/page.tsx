import { redirect } from 'next/navigation';

export default function ChannelsConfigRedirect() {
  redirect('/dashboard/channels');
}
