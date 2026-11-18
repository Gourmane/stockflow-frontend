import { Link } from 'react-router';
import { useAuth } from '../context/useAuth';
import type { Product } from '../types/product';
import { ProductFacts, ProductStatus } from './ProductFacts';

export default function ProductDetails({ product, editPath }: { product: Product; editPath: string }) {
  const { session } = useAuth();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';

  return (
    <section aria-labelledby="product-name" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="product-name" className="min-w-0 text-lg font-semibold wrap-anywhere">{product.name}</h2>
        <ProductStatus isActive={product.is_active} />
      </div>
      <ProductFacts product={product} details />
      {isAdmin && (
        <Link
          to={editPath}
          className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Modifier le produit
        </Link>
      )}
    </section>
  );
}
