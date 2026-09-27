import React from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Wrench,
  Wind,
  Car,
  Sparkles,
  Laptop,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const iconMap = {
  Zap: Zap,
  Wrench: Wrench,
  Wind: Wind,
  Car: Car,
  Sparkles: Sparkles,
  Laptop: Laptop,
  Electrician: Zap,
  Plumber: Wrench,
  'AC Technician': Wind,
  Mechanic: Car,
  Cleaner: Sparkles,
  'Computer Repair': Laptop,
};

const categoryBadgeColors = {
  Electrician: 'bg-amber-100 text-amber-800 border-amber-200',
  Plumber: 'bg-blue-100 text-blue-800 border-blue-200',
  'AC Technician': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Mechanic: 'bg-rose-100 text-rose-800 border-rose-200',
  Cleaner: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Computer Repair': 'bg-violet-100 text-violet-800 border-violet-200',
};

const ServiceCard = ({ service }) => {
  const IconComponent =
    iconMap[service.icon] || iconMap[service.category] || Wrench;
  const badgeStyle =
    categoryBadgeColors[service.category] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <div className="group bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
            <IconComponent className="w-6 h-6" />
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeStyle}`}
          >
            {service.category}
          </span>
        </div>

        <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
          {service.name}
        </h3>

        <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2">
          {service.description || 'Professional on-demand service backed by verified experts.'}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100 mt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">
              Starts at
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              ₹{service.basePrice}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified</span>
          </div>
        </div>

        <Link
          to={`/providers?service=${encodeURIComponent(service.name)}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 group-hover:shadow-md"
        >
          <span>Find Providers</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default ServiceCard;
