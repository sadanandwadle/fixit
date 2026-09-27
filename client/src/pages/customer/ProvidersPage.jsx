import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { providerAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import ProviderMap from '../../components/ProviderMap';
import {
  Search,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Briefcase,
  Navigation,
  Map as MapIcon,
  List as ListIcon,
  X,
  Compass,
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '../../utils/constants';

const ProvidersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialService = searchParams.get('service') || searchParams.get('category') || 'All';
  const initialSearch = searchParams.get('search') || '';
  const initialVerified = searchParams.get('verified') === 'true';

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedService, setSelectedService] = useState(initialService);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [onlyVerified, setOnlyVerified] = useState(initialVerified);

  // Geolocation & Map State (Phase 6)
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [userLocation, setUserLocation] = useState(null); // { latitude, longitude }
  const [searchRadius, setSearchRadius] = useState(15); // in km
  const [detectingGps, setDetectingGps] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      // If user has shared their location, use geospatial discovery API
      if (userLocation) {
        const geoParams = {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          radius: searchRadius,
        };

        if (selectedService && selectedService !== 'All') {
          geoParams.service = selectedService;
        }
        if (onlyVerified) {
          geoParams.verified = 'true';
        }

        const res = await providerAPI.getNearby(geoParams);
        if (res.data?.success) {
          let list = res.data.data || [];
          if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            list = list.filter(
              (p) =>
                p.businessName?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
          }
          setProviders(list);
        }
      } else {
        // Standard catalog search
        const params = {};
        if (selectedService && selectedService !== 'All') {
          params.service = selectedService;
        }
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        if (onlyVerified) {
          params.verified = 'true';
        }

        const res = await providerAPI.getAll(params);
        if (res.data?.success) {
          setProviders(res.data.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setError(err.response?.data?.message || 'Could not retrieve service providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [selectedService, onlyVerified, userLocation, searchRadius]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (selectedService !== 'All') newParams.set('service', selectedService);
    if (searchTerm.trim()) newParams.set('search', searchTerm.trim());
    if (onlyVerified) newParams.set('verified', 'true');
    setSearchParams(newParams);
    fetchProviders();
  };

  const handleCategorySelect = (cat) => {
    setSelectedService(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat === 'All') {
      newParams.delete('service');
    } else {
      newParams.set('service', cat);
    }
    setSearchParams(newParams);
  };

  const handleVerifiedToggle = () => {
    const nextVal = !onlyVerified;
    setOnlyVerified(nextVal);
    const newParams = new URLSearchParams(searchParams);
    if (nextVal) {
      newParams.set('verified', 'true');
    } else {
      newParams.delete('verified');
    }
    setSearchParams(newParams);
  };

  // Find Providers Near Me Handler
  const handleFindNearMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setUserLocation({ latitude: lat, longitude: lng });
        setDetectingGps(false);
      },
      (err) => {
        setDetectingGps(false);
        let msg = 'Unable to determine your location.';
        if (err.code === 1) msg = 'Location access denied. Please enable browser location permissions.';
        else if (err.code === 2) msg = 'Location unavailable. Please check your GPS signal or network.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClearLocation = () => {
    setUserLocation(null);
    setLocationError(null);
  };

  // Determine center coordinates for map view
  const mapCenter = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : providers.length > 0 &&
      providers[0].location?.coordinates &&
      providers[0].location.coordinates[0] !== 0
    ? [providers[0].location.coordinates[1], providers[0].location.coordinates[0]]
    : [12.9716, 77.5946];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Local Professionals & Maps
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Find Service Providers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Discover verified tradespeople near your location or explore the complete regional directory.
          </p>
        </div>

        {/* View Mode Toggle: List vs Map */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListIcon className="w-4 h-4" />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Geolocation Notice Banner (when Near Me is active) */}
      {userLocation && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <span>Showing Providers Near You</span>
                <span className="text-[11px] font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  GPS Active
                </span>
              </p>
              <p className="text-xs text-blue-700">
                Sorted by distance within a {searchRadius} km radius.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Radius Selector */}
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-blue-200 text-xs">
              <span className="text-slate-500 font-medium">Radius:</span>
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="bg-transparent font-bold text-blue-700 focus:outline-none cursor-pointer"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>

            <button
              onClick={handleClearLocation}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold rounded-xl border border-slate-200 transition"
              title="Reset location filter"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {locationError && (
        <Alert
          type="error"
          message={locationError}
          onClose={() => setLocationError(null)}
        />
      )}

      {/* Search Bar & Near Me Trigger */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex-1 flex items-center gap-3 px-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by provider name, trade, or city..."
                className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 px-3 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={onlyVerified}
                  onChange={handleVerifiedToggle}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified Only
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
            >
              Search
            </button>
          </form>

          {/* Near Me Quick Button */}
          <button
            type="button"
            onClick={handleFindNearMe}
            disabled={detectingGps}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border transition shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
              userLocation
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                : 'bg-white text-blue-700 hover:bg-blue-50 border-blue-200'
            }`}
          >
            <Navigation className={`w-4 h-4 ${detectingGps ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">
              {detectingGps
                ? 'Locating...'
                : userLocation
                ? 'Near Me Active'
                : 'Find Providers Near Me'}
            </span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleCategorySelect('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedService === 'All'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Trades
          </button>

          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategorySelect(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedService === cat.name
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

      {/* Main Content Area: Map View OR List View */}
      {loading ? (
        <LoadingSpinner text="Searching verified providers..." />
      ) : viewMode === 'map' ? (
        /* MAP VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {providers.length} provider{providers.length === 1 ? '' : 's'} on OpenStreetMap
            </span>
            <span className="text-slate-400">Click any map pin to view services and book</span>
          </div>

          <ProviderMap
            center={mapCenter}
            zoom={userLocation ? 12 : 11}
            providers={providers}
            userLocation={userLocation}
            searchRadius={userLocation ? searchRadius : null}
            height="560px"
          />
        </div>
      ) : providers.length > 0 ? (
        /* LIST VIEW */
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-4 flex items-center justify-between">
            <span>
              Found {providers.length} {providers.length === 1 ? 'provider' : 'providers'}
              {userLocation && ` within ${searchRadius} km`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => {
              const userObj = p.userId || {};
              const servicesList = p.services || [];
              const startingPrice =
                p.pricing?.startingPrice > 0
                  ? p.pricing.startingPrice
                  : servicesList.length > 0
                  ? servicesList[0]?.basePrice
                  : 299;

              return (
                <div
                  key={p._id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Avatar & Badges */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-lg shadow-sm">
                          {p.businessName ? p.businessName.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">
                            {p.businessName}
                          </h3>
                          <p className="text-slate-500 text-xs mt-0.5">
                            By {userObj.name || 'Pro Partner'}
                          </p>
                        </div>
                      </div>

                      {p.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Partner
                        </span>
                      )}
                    </div>

                    {/* Bio / Description */}
                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mb-4">
                      {p.description || 'Experienced local technician dedicated to quality repairs.'}
                    </p>

                    {/* Rating & Distance Badges */}
                    <div className="flex items-center gap-3 text-xs mb-4 py-2 px-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="font-extrabold text-slate-900">
                          {p.rating > 0 ? p.rating.toFixed(1) : 'New'}
                        </span>
                        {p.totalReviews > 0 && (
                          <span className="text-slate-400">({p.totalReviews})</span>
                        )}
                      </div>

                      {/* Distance in km (Phase 6) */}
                      {p.distance !== undefined ? (
                        <div className="flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{p.distance} km away</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{p.experience || 0} yrs exp</span>
                        </div>
                      )}
                    </div>

                    {/* Offered Services tags */}
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Offered Services:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {servicesList.length > 0 ? (
                          servicesList.slice(0, 3).map((s) => (
                            <span
                              key={s._id}
                              className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg"
                            >
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            All on-demand trades
                          </span>
                        )}
                        {servicesList.length > 3 && (
                          <span className="text-[11px] text-slate-500 font-semibold px-1 py-0.5">
                            +{servicesList.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Service Area */}
                    {p.address?.city ? (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">
                          {p.address.street ? `${p.address.street}, ` : ''}
                          {p.address.city}
                        </span>
                      </div>
                    ) : p.serviceArea && p.serviceArea.length > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{p.serviceArea.join(', ')}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                        Starts at
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        ₹{startingPrice}
                      </span>
                    </div>

                    <Link
                      to={`/providers/${p._id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Providers Match</h3>
          <p className="text-sm text-slate-500">
            {userLocation
              ? `No service providers found within ${searchRadius} km. Try increasing the search radius.`
              : 'Try adjusting your search criteria, selecting a different service category, or clearing filters.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {userLocation && (
              <button
                onClick={() => setSearchRadius((prev) => Math.min(100, prev + 15))}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition"
              >
                Expand Radius
              </button>
            )}
            <button
              onClick={() => {
                setSelectedService('All');
                setSearchTerm('');
                setOnlyVerified(false);
                setUserLocation(null);
                setSearchParams({});
              }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvidersPage;
