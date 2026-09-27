import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
        <Wrench className="w-8 h-8 stroke-[2.5]" />
      </div>
      <h1 className="text-6xl font-black text-slate-900 tracking-tight">404</h1>
      <h2 className="text-2xl font-bold text-slate-800 mt-2 mb-3">
        Page Not Found
      </h2>
      <p className="text-slate-600 max-w-md text-sm mb-8">
        We looked everywhere, but couldn't find the page you were looking for. Perhaps you'd like to return to the home page or search for services?
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-500/20"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          to="/services"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition"
        >
          <Wrench className="w-4 h-4" />
          <span>Browse Services</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
