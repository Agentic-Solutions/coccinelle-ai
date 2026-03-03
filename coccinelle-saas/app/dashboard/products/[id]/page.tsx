import ProductDetailClient from './ProductDetailClient';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}
