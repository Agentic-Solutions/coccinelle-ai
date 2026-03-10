import BookingClient from './BookingClient';

export function generateStaticParams() {
  return [{ slug: '_' }];
}

export default function BookingPage() {
  return <BookingClient />;
}
