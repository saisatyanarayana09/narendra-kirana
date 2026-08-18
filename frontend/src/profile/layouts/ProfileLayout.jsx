import { useEffect } from 'react';
import { useNavigate, Outlet, Link } from 'react-router-dom';
import { useCart } from '../../cart-context';
import { CustomerLayout } from '../../customer-layout';

export default function ProfileLayout() {
  const navigate = useNavigate();
  const { isCustomer } = useCart();

  useEffect(() => {
    if (!isCustomer) {
      navigate('/login');
    }
  }, [isCustomer, navigate]);

  if (!isCustomer) return null;

  return (
    <CustomerLayout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-[70vh]">
        <div className="mb-6">
          <Link to="/products" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
            Back to shop
          </Link>
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Outlet />
        </div>
      </main>
    </CustomerLayout>
  );
}
