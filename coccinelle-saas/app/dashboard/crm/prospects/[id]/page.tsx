import ProspectDetailClient from './ProspectDetailClient';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function ProspectDetailPage() {
  return <ProspectDetailClient />;
}
