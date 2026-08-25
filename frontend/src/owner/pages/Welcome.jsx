import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically redirect to the actual dashboard after 2.5 seconds
    const timer = setTimeout(() => {
      navigate('/owner');
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  const getOwnerName = () => {
    try {
      const user = JSON.parse(localStorage.getItem('smart-kirana-owner-user'));
      return user?.first_name || user?.username || 'Owner';
    } catch {
      return 'Owner';
    }
  };
  const ownerName = getOwnerName();

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-50">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <span className="text-5xl animate-bounce">👋</span>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
        Welcome Back, {ownerName}!
      </h1>
      <p className="text-slate-500 text-lg mb-8">We're glad to see you again.</p>
      
      <div className="flex items-center gap-3 text-emerald-600 font-bold bg-emerald-50 px-6 py-3 rounded-full border border-emerald-100">
        <div className="w-5 h-5 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        Loading your store...
      </div>
    </div>
  );
};
export default Welcome;
