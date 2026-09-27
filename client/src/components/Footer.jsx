import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Shield, CheckCircle2, Phone, Mail, Heart } from 'lucide-react';
import { SERVICE_CATEGORIES } from '../utils/constants';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Wrench className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                FIX<span className="text-blue-500">IT</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Your trusted on-demand local home service platform. Connecting skilled, background-verified professionals directly with households and businesses.
            </p>
            <div className="flex flex-col gap-2 pt-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                <span>+91 (800) 123-FIXIT (34948)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>support@fixit-platform.local</span>
              </div>
            </div>
          </div>

          {/* Service Categories */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Services
            </h4>
            <ul className="space-y-2.5 text-sm">
              {SERVICE_CATEGORIES.map((cat) => (
                <li key={cat.name}>
                  <Link
                    to={`/services?category=${encodeURIComponent(cat.name)}`}
                    className="text-slate-400 hover:text-white transition"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Roles */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              For Users
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/register?role=customer" className="text-slate-400 hover:text-white transition">
                  Book a Service
                </Link>
              </li>
              <li>
                <Link to="/register?role=provider" className="text-slate-400 hover:text-white transition">
                  Join as Service Provider
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-400 hover:text-white transition">
                  Provider Portal Login
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-400 hover:text-white transition">
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Our Promise
            </h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>100% Background-checked experts</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Transparent standard rates</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Service guarantee & support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} FIXIT Technologies Inc. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for local communities
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
