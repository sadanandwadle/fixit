import React, { useState, useEffect } from 'react';
import { providerAPI } from '../../services/api';
import ProviderMap from '../../components/ProviderMap';
import {
  MapPin,
  Navigation,
  Save,
  CheckCircle,
  AlertCircle,
  Compass,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ProviderLocationPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState(null);

  // Form State
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [serviceRadius, setServiceRadius] = useState(15);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [detectingGps, setDetectingGps] = useState(false);

  // Load existing provider profile
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await providerAPI.getMyProfile();
      const p = res.data.data;
      setProvider(p);

      // Populate coordinates if already set
      if (
        p.location?.coordinates &&
        Array.isArray(p.location.coordinates) &&
        (p.location.coordinates[0] !== 0 || p.location.coordinates[1] !== 0)
      ) {
        setLongitude(Number(p.location.coordinates[0]));
        setLatitude(Number(p.location.coordinates[1]));
      }

      if (p.serviceRadius) {
        setServiceRadius(Number(p.serviceRadius));
      }

      if (p.address) {
        setAddress({
          street: p.address.street || '',
          city: p.address.city || '',
          state: p.address.state || '',
          pincode: p.address.pincode || '',
          country: p.address.country || 'India',
        });
      }
    } catch (err) {
      console.error('Failed to load provider profile:', err);
      setFeedback({
        type: 'error',
        message: 'Could not fetch your provider location details. Please refresh.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Browser Geolocation Detection
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({
        type: 'error',
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setDetectingGps(true);
    setFeedback({ type: '', message: '' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setDetectingGps(false);
        setFeedback({
          type: 'success',
          message: `Location successfully detected: (${lat}, ${lng})`,
        });
      },
      (error) => {
        setDetectingGps(false);
        let msg = 'Unable to retrieve your location.';
        if (error.code === 1) msg = 'Location permission was denied. Please allow location access or click on the map.';
        else if (error.code === 2) msg = 'Position unavailable. Please click on the map to set your location.';
        else if (error.code === 3) msg = 'Location request timed out.';
        setFeedback({ type: 'error', message: msg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle map click
  const handleLocationSelect = ({ latitude: newLat, longitude: newLng }) => {
    setLatitude(newLat);
    setLongitude(newLng);
    setFeedback({
      type: 'success',
      message: `Pin placed at ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`,
    });
  };

  // Save location
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Please select a valid latitude and longitude on the map');
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Coordinates are out of bounds');
      }

      const res = await providerAPI.updateLocation({
        latitude: Number(latitude),
        longitude: Number(longitude),
        serviceRadius: Number(serviceRadius),
        address,
      });

      setProvider(res.data.data);
      setFeedback({
        type: 'success',
        message: 'Your service location, address, and coverage radius have been saved successfully!',
      });
    } catch (err) {
      console.error('Save location error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update location',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb & Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <Link to="/provider/dashboard" className="hover:text-blue-600 transition">
            Provider Dashboard
          </Link>
          <span>/</span>
          <span className="text-blue-600">Service Location & Map</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              Service Location & Coverage
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Set your business base coordinates, address, and operating radius to appear in local customer searches.
            </p>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={detectingGps}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-xl text-sm border border-blue-200 transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Navigation className={`w-4 h-4 ${detectingGps ? 'animate-spin' : ''}`} />
            <span>{detectingGps ? 'Detecting GPS...' : 'Use My Current Location'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedback.message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Map */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-600" />
              Interactive Location Picker
            </h2>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
              Radius: {serviceRadius} km
            </span>
          </div>

          <ProviderMap
            center={[latitude, longitude]}
            zoom={13}
            interactive={true}
            selectedLocation={{ latitude, longitude }}
            onLocationSelect={handleLocationSelect}
            userLocation={{ latitude, longitude }}
            searchRadius={serviceRadius}
            height="460px"
          />

          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Latitude: <strong>{latitude.toFixed(6)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              <span>Longitude: <strong>{longitude.toFixed(6)}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Address & Coverage Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Address & Coverage Details
          </h2>

          <form onSubmit={handleSaveLocation} className="space-y-4">
            {/* Service Radius Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Service Radius (km)
                </label>
                <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                  {serviceRadius} km
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={serviceRadius}
                onChange={(e) => setServiceRadius(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>1 km (Hyperlocal)</span>
                <span>50 km</span>
                <span>100 km (Regional)</span>
              </div>
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Street / Area
              </label>
              <input
                type="text"
                placeholder="e.g. 100 Feet Road, Indiranagar"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* City & State */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karnataka"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Pincode & Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  placeholder="e.g. 560038"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={address.country}
                  disabled
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Coordinates Manual Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Location...' : 'Save Location & Coverage'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProviderLocationPage;
