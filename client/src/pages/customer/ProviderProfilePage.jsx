import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { providerAPI, reviewAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  ShieldCheck,
  Star,
  Clock,
  MapPin,
  Wrench,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  Award,
  MessageSquare,
  User,
} from 'lucide-react';

const ProviderProfilePage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProviderAndReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const [provRes, revRes] = await Promise.all([
          providerAPI.getById(id),
          reviewAPI.getByProvider(id).catch(() => ({ data: { success: false, data: [] } })),
        ]);

        if (provRes.data?.success) {
          setProvider(provRes.data.data);
        }

        if (revRes.data?.success) {
          setReviews(revRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch provider profile:', err);
        setError(err.response?.data?.message || 'Could not load provider profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProviderAndReviews();
  }, [id]);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading provider profile..." />;
  }

  if (error || !provider) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <Alert type="error" message={error || 'Provider not found'} />
        <Link
          to="/providers"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
        >
          Back to Providers List
        </Link>
      </div>
    );
  }

  const userObj = provider.userId || {};
  const servicesList = provider.services || [];
  const isCustomer = user?.role === 'customer';
  const isOwner = user && provider.userId && user.id === provider.userId._id;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              {provider.businessName ? provider.businessName.charAt(0).toUpperCase() : 'P'}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {provider.businessName}
                </h1>
                {provider.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verified Expert</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    Community Partner
                  </span>
                )}
              </div>

              <p className="text-slate-600 text-sm font-medium">
                Managed by {userObj.name || 'Pro Partner'}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1 text-amber-600 font-bold">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>
                    {provider.rating > 0 ? provider.rating.toFixed(1) : 'New'}
                  </span>
                  <span className="text-slate-400 font-normal">
                    ({provider.totalReviews || reviews.length || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{provider.experience || 0} Years In Business</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking CTA Button Box */}
          <div className="flex flex-col sm:items-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
            {isAuthenticated ? (
              isCustomer ? (
                <Link
                  to={`/book/${provider._id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Service Now</span>
                </Link>
              ) : isOwner ? (
                <Link
                  to="/provider/profile"
                  className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition"
                >
                  Edit Your Profile
                </Link>
              ) : (
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-xl font-medium">
                  Logged in as Provider
                </span>
              )
            ) : (
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition"
              >
                <span>Login to Book</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Details & Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Bio, Services, and Reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Provider */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900">About Provider</h2>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
              {provider.description ||
                'Specialized in residential and commercial maintenance, electrical fixtures, leak detection, and diagnostics with safety adherence and quality tools.'}
            </p>
          </div>

          {/* Services Offered */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Offered Services & Pricing</h2>
              <span className="text-xs font-bold text-blue-600">
                {servicesList.length} Available
              </span>
            </div>

            {servicesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {servicesList.map((service) => (
                  <div
                    key={service._id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {service.category}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">
                          ₹{service.basePrice}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{service.name}</h3>
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">
                        {service.description}
                      </p>
                    </div>

                    {isCustomer && (
                      <div className="pt-3 mt-3 border-t border-slate-200/60">
                        <Link
                          to={`/book/${provider._id}?service=${service._id}`}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-blue-600 hover:text-white text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <span>Select This Service</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs">
                No specific services configured yet. The provider accepts general on-demand service inquiries.
              </div>
            )}
          </div>

          {/* Customer Reviews Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-black text-slate-900">Customer Reviews & Ratings</h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                {reviews.length} Verified Review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                          {rev.customerId?.name ? rev.customerId.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {rev.customerId?.name || 'Verified Customer'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-2xl p-6 space-y-2">
                <Star className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Reviews Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  This provider has not received customer reviews yet. Book a service and be the first to leave feedback!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing & Coverage */}
        <div className="space-y-6">
          {/* Rate Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Standard Rates
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-xs font-medium text-slate-600">Starting Visit Fee</span>
                <span className="font-black text-slate-900 text-base">
                  ₹{provider.pricing?.startingPrice || 299}
                </span>
              </div>

              {provider.pricing?.hourlyRate > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-xs font-medium text-slate-600">Hourly Rate</span>
                  <span className="font-black text-slate-900 text-base">
                    ₹{provider.pricing.hourlyRate}/hr
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Service Area */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Service Areas Covered
            </h3>
            {provider.serviceArea && provider.serviceArea.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {provider.serviceArea.map((area, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                  >
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{area}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">All local city districts</p>
            )}
          </div>

          {/* Quality Guarantee */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-3xl p-6 border border-blue-100 space-y-3">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
              <Award className="w-4 h-4 text-blue-600" />
              <span>FIXIT Quality Assurance</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              All bookings made through FIXIT come with customer satisfaction assistance, upfront agreed pricing, and direct communication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfilePage;
