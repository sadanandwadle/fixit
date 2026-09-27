import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { providerAPI, serviceAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Clock,
  MapPin,
  Save,
  Wrench,
  AlertCircle,
} from 'lucide-react';

const ProviderProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [allServices, setAllServices] = useState([]);
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    experience: 0,
    hourlyRate: 0,
    startingPrice: 299,
    serviceArea: '',
    selectedServices: [],
    // Read-only system fields:
    isVerified: false,
    rating: 0,
    totalReviews: 0,
  });

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [profileRes, servicesRes] = await Promise.all([
          providerAPI.getMyProfile(),
          serviceAPI.getAll(),
        ]);

        if (servicesRes.data?.success) {
          setAllServices(servicesRes.data.data || []);
        }

        if (profileRes.data?.success) {
          const p = profileRes.data.data;
          setFormData({
            businessName: p.businessName || '',
            description: p.description || '',
            experience: p.experience || 0,
            hourlyRate: p.pricing?.hourlyRate || 0,
            startingPrice: p.pricing?.startingPrice || 299,
            serviceArea: p.serviceArea ? p.serviceArea.join(', ') : '',
            selectedServices: p.services ? p.services.map((s) => (typeof s === 'object' ? s._id : s)) : [],
            isVerified: p.isVerified || false,
            rating: p.rating || 0,
            totalReviews: p.totalReviews || 0,
          });
        }
      } catch (err) {
        console.error('Error fetching provider profile:', err);
        setError(err.response?.data?.message || 'Could not load your provider profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  const handleServiceToggle = (serviceId) => {
    setFormData((prev) => {
      const exists = prev.selectedServices.includes(serviceId);
      const updated = exists
        ? prev.selectedServices.filter((id) => id !== serviceId)
        : [...prev.selectedServices, serviceId];
      return { ...prev, selectedServices: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.businessName.trim()) {
      setError('Business Name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        businessName: formData.businessName.trim(),
        description: formData.description.trim(),
        experience: Number(formData.experience) || 0,
        pricing: {
          startingPrice: Number(formData.startingPrice) || 0,
          hourlyRate: Number(formData.hourlyRate) || 0,
        },
        serviceArea: formData.serviceArea
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        services: formData.selectedServices,
      };

      const res = await providerAPI.updateMyProfile(payload);

      if (res.data?.success) {
        setSuccess('Provider profile updated successfully!');
      } else {
        setError(res.data?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.response?.data?.message || 'Could not save profile changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading your profile settings..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Business Settings
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Provider Profile
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure your trade services, pricing, and service area displayed to customers.
          </p>
        </div>

        {/* Read-only verification status badge */}
        <div>
          {formData.isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Provider</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Verification Pending Admin Review</span>
            </span>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Business Details */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">
            Basic Business Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Business / Display Name *
              </label>
              <input
                type="text"
                required
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="e.g. Apex Electrical Solutions"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="e.g. 5"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Service Description & Bio
            </label>
            <textarea
              rows={4}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell customers about your skills, certifications, warranties, and specializations..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Pricing & Service Coverage */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">
            Pricing & Service Locations
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Minimum Visit Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                name="startingPrice"
                value={formData.startingPrice}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hourly Rate (₹/hr)
              </label>
              <input
                type="number"
                min="0"
                name="hourlyRate"
                value={formData.hourlyRate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Service Areas (comma-separated city areas or districts)
            </label>
            <input
              type="text"
              name="serviceArea"
              value={formData.serviceArea}
              onChange={handleChange}
              placeholder="e.g. Bandra, Andheri, Powai, Juhu"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Select Offered Services */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">
              Select Services You Provide ({formData.selectedServices.length} selected)
            </h2>
            <span className="text-xs text-slate-400">Checked services appear on your public card</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allServices.map((service) => {
              const isChecked = formData.selectedServices.includes(service._id);

              return (
                <label
                  key={service._id}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                    isChecked
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleServiceToggle(service._id)}
                    className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                      {service.name}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {service.category} • Base ₹{service.basePrice}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-500/25 transition flex items-center gap-2"
          >
            {saving ? (
              <span className="inline-block animate-spin mr-2">⟳</span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProviderProfilePage;
