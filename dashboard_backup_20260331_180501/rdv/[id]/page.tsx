import RdvDetailClient from './RdvDetailClient';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function RdvDetailPage() {
  return <RdvDetailClient />;
}
