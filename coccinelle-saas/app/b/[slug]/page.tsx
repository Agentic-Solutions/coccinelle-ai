// Route COURTE de reservation : /b/{slug}
//
// Meme page que /booking/{slug}, sept caracteres de moins dans l'URL. Sur un
// SMS ou 160 caracteres decident du nombre de segments factures, ces sept
// caracteres se paient comptant. /booking/{slug} reste valable : les liens
// deja envoyes ne doivent pas casser.
import BookingClient from '../../booking/[slug]/BookingClient';

export function generateStaticParams() {
  return [{ slug: '_' }];
}

export default function PageReservationCourte() {
  return <BookingClient />;
}
