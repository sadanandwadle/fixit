import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
  Zap,
  Wrench,
  Wind,
  Car,
  Sparkles,
  Laptop,
  Users,
  Award,
  RefreshCw,
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '../utils/constants';
import { serviceAPI } from '../services/api';
import ServiceCard from '../components/ServiceCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';

const categoryIcons = {
  Electrician: Zap,
  Plumber: Wrench,
  'AC Technician': Wind,
  Mechanic: Car,
  Cleaner: Sparkles,
  'Computer Repair': Laptop,
};

const HomePage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();

  const fetchFeaturedServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await serviceAPI.getAll({ limit: 6 });
      if (res.data?.success) {
        setServices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
      setError('Could not connect to services catalog. Please verify backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedServices();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() || selectedCategory !== 'All') {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      navigate(`/services?${params.toString()}`);
    } else {
      navigate('/services');
    }
  };

  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-16 pb-20 border-b border-slate-200/60">
        {/* Background decorative circles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-emerald-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold tracking-wide uppercase shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Verified Local Technicians at Your Doorstep
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Reliable Home Repairs & Services,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
                Fixed Right.
              </span>
            </h1>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              Book skilled electricians, plumbers, AC mechanics, cleaners, and computer technicians. Upfront pricing, background-verified pros, and hassle-free service.
            </p>

            {/* Hero Search Box */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 p-2 sm:p-3 bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-200/90 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
            >
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What service do you need? (e.g. AC servicing, wiring)"
                  className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3 flex items-center">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none cursor-pointer pr-3"
                >
                  <option value="All">All Categories</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Find Help</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick trust metrics */}
            <div className="pt-6 grid grid-cols-3 gap-4 max-w-lg mx-auto text-center border-t border-slate-200/60 mt-10">
              <div>
                <div className="text-2xl font-black text-slate-900">6</div>
                <div className="text-xs font-semibold text-slate-500">Core Services</div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">100%</div>
                <div className="text-xs font-semibold text-slate-500">Verified Pros</div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">4.9/5</div>
                <div className="text-xs font-semibold text-slate-500">Average Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE 6 SERVICE CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">
              Browse Categories
            </div>
            <h2 className="text-3xl font-black text-slate-900">
              Explore Our Core Services
            </h2>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICE_CATEGORIES.map((category) => {
            const Icon = categoryIcons[category.name] || Wrench;
            return (
              <Link
                key={category.name}
                to={`/providers?service=${encodeURIComponent(category.name)}`}
                className="group relative bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-14 h-14 rounded-2xl ${category.bgColor} ${category.textColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {category.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                    {category.name}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {category.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>Browse Experts</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED / POPULAR SERVICES FROM API */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
              Top Booked Services
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Popular Home Solutions
            </h2>
          </div>
          <button
            onClick={fetchFeaturedServices}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 p-2 rounded-lg hover:bg-slate-100 transition"
            title="Refresh Services Catalog"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {error && <Alert type="error" message={error} className="mb-6" />}

        {loading ? (
          <LoadingSpinner text="Loading service catalog..." />
        ) : services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No services found in catalog yet.</p>
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-slate-100/70 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-2">
              How FIXIT Works
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              We make hiring reputable, trained local experts effortless and transparent from start to finish.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Select Service</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Choose from Electricians, Plumbers, Mechanics, AC Pros, Cleaners or Computer Specialists.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Set Time & Address</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Pick your preferred time slot and specify your location for convenient doorstep service.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Pro Accepts & Arrives</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                A background-checked professional accepts your booking and arrives with standard tools.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Completion & Review</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Inspect the work, pay transparently, and leave an authentic review for the provider.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE FIXIT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">Vetted Professionals</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Every service partner undergoes identity verification and skill checks before accepting jobs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">Transparent Pricing</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Clear standard base pricing with no hidden surprises or arbitrary weekend markups.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">On-Time Reliability</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track appointments smoothly with direct communication and guaranteed service windows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-8 sm:p-12 text-white overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Are you a skilled technician or tradesperson?
            </h2>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Join thousands of local professionals growing their business with FIXIT. Set your availability, choose your service areas, and earn steady revenue.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                to="/register?role=provider"
                className="px-6 py-3 bg-white text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-50 transition shadow-lg"
              >
                Register as Provider
              </Link>
              <Link
                to="/services"
                className="px-6 py-3 bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/40 text-white rounded-xl font-bold text-sm transition"
              >
                Browse Services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
