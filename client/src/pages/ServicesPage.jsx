import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { serviceAPI } from '../services/api';
import ServiceCard from '../components/ServiceCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { SERVICE_CATEGORIES } from '../utils/constants';
import { Search, SlidersHorizontal, RefreshCcw, Wrench } from 'lucide-react';

const ServicesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';
  const initialSearch = searchParams.get('search') || '';

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedCategory && selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await serviceAPI.getAll(params);
      if (res.data?.success) {
        setServices(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to fetch services. Please make sure the backend server is reachable.');
    } finally {
      setLoading(false);
    }
  };

  // Sync category changes with query string and fetch
  useEffect(() => {
    const categoryParam = searchParams.get('category') || 'All';
    const searchParam = searchParams.get('search') || '';
    setSelectedCategory(categoryParam);
    setSearchTerm(searchParam);
  }, [searchParams]);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, searchTerm]);

  const handleCategorySelect = (catName) => {
    setSelectedCategory(catName);
    const newParams = new URLSearchParams(searchParams);
    if (catName === 'All') {
      newParams.delete('category');
    } else {
      newParams.set('category', catName);
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm.trim()) {
      newParams.set('search', searchTerm.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSelectedCategory('All');
    setSearchTerm('');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Explore Services
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Browse verified local professionals across 6 specialized service domains.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex-1 flex items-center gap-3 px-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by service name or keyword..."
              className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Search
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleCategorySelect('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Services
          </button>

          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategorySelect(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.name
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Services Grid */}
      {loading ? (
        <LoadingSpinner text="Fetching verified service catalog..." />
      ) : services.length > 0 ? (
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-4">
            Showing {services.length} {services.length === 1 ? 'service' : 'services'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Wrench className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Services Found</h3>
          <p className="text-sm text-slate-600">
            We couldn't find any services matching your search or category filter.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
