import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { providerAPI, serviceAPI, bookingAPI, availabilityAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  AlertCircle,
  FileText,
  CreditCard,
  ArrowRight,
  Info,
} from 'lucide-react';

const timeSlots = [
  '09:00 AM',
  '10:30 AM',
  '12:00 PM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM',
];

const DAYS_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const BookServicePage = () => {
  const { providerId } = useParams();
  const [searchParams] = useSearchParams();
  const initialServiceId = searchParams.get('service') || '';

  const { user } = useAuth();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [availability, setAvailability] = useState({ schedules: [], bookedSlots: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const [scheduledDate, setScheduledDate] = useState(() => {
    // Default tomorrow's date using local time
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [scheduledTime, setScheduledTime] = useState('10:30 AM');
  const [address, setAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
  });
  const [description, setDescription] = useState('');

  // Fetch provider, services, and public availability
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [providerRes, availRes] = await Promise.all([
          providerAPI.getById(providerId),
          availabilityAPI.getProvider(providerId).catch(() => ({ data: { success: false } })),
        ]);

        if (providerRes.data?.success) {
          const prov = providerRes.data.data;
          setProvider(prov);

          if (prov.services && prov.services.length > 0) {
            setAvailableServices(prov.services);
            if (!selectedServiceId) {
              setSelectedServiceId(prov.services[0]._id);
            }
          } else {
            const allServicesRes = await serviceAPI.getAll();
            if (allServicesRes.data?.success) {
              setAvailableServices(allServicesRes.data.data || []);
              if (!selectedServiceId && allServicesRes.data.data?.length > 0) {
                setSelectedServiceId(allServicesRes.data.data[0]._id);
              }
            }
          }
        }

        if (availRes.data?.success) {
          setAvailability(availRes.data.data);
        }
      } catch (err) {
        console.error('Error loading booking data:', err);
        setError(err.response?.data?.message || 'Could not load service details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providerId]);

  // Determine availability for currently selected date
  // Determine availability for currently selected date avoiding UTC timezone drift (BUG-07)
  let selectedDateObj;
  if (typeof scheduledDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate.trim())) {
    const [y, m, d] = scheduledDate.trim().split('-').map(Number);
    selectedDateObj = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    selectedDateObj = new Date(scheduledDate);
  }
  const selectedDayName = !isNaN(selectedDateObj.getTime())
    ? DAYS_NAMES[selectedDateObj.getDay()]
    : null;

  const currentDaySchedule = availability.schedules?.find(
    (s) => s.day === selectedDayName
  );

  const isDayOff = currentDaySchedule ? !currentDaySchedule.isAvailable : false;

  // Booked slots on this specific date
  const bookedTimesOnSelectedDate = (availability.bookedSlots || [])
    .filter((slot) => {
      const slotDateStr = typeof slot.date === 'string' ? slot.date.split('T')[0] : '';
      return slotDateStr === scheduledDate;
    })
    .map((slot) => slot.time);

  const selectedService = availableServices.find((s) => s._id === selectedServiceId);
  const calculatedPrice = selectedService?.basePrice || provider?.pricing?.startingPrice || 299;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedServiceId) {
      setError('Please select a service');
      return;
    }

    if (!scheduledDate) {
      setError('Please select a date');
      return;
    }

    if (isDayOff) {
      setError(`Provider is closed on ${selectedDayName}s. Please pick another date.`);
      return;
    }

    if (bookedTimesOnSelectedDate.includes(scheduledTime)) {
      setError(`The slot ${scheduledTime} on this date is already booked. Please pick another slot.`);
      return;
    }

    if (!address.street.trim()) {
      setError('Please provide your street address');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const bookingPayload = {
        providerId,
        serviceId: selectedServiceId,
        address: {
          street: address.street.trim(),
          city: address.city.trim() || 'Local City',
          state: address.state.trim(),
          zipCode: address.zipCode.trim(),
        },
        scheduledDate,
        scheduledTime,
        price: calculatedPrice,
        description: description.trim(),
      };

      const res = await bookingAPI.create(bookingPayload);

      if (res.data?.success) {
        setSuccess('Booking successfully created! Redirecting to My Bookings...');
        setTimeout(() => {
          navigate('/customer/bookings', { replace: true });
        }, 1200);
      } else {
        setError(res.data?.message || 'Could not create booking');
      }
    } catch (err) {
      console.error('Booking submission failed:', err);
      setError(err.response?.data?.message || 'Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Preparing booking details..." />;
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xl flex-shrink-0">
            {provider?.businessName ? provider.businessName.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
              Booking Service With
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {provider?.businessName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Managed by {provider?.userId?.name || 'Verified Partner'}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
          <span className="text-xs text-slate-400 block font-medium">Estimated Base Price</span>
          <span className="text-2xl font-black text-slate-900 text-emerald-600">
            ₹{calculatedPrice}
          </span>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Service Selection */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              1
            </span>
            <h2 className="text-lg font-black text-slate-900">Select Service Required</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableServices.map((service) => (
              <label
                key={service._id}
                className={`flex items-start justify-between p-4 rounded-2xl border cursor-pointer transition ${
                  selectedServiceId === service._id
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="selectedService"
                    value={service._id}
                    checked={selectedServiceId === service._id}
                    onChange={() => setSelectedServiceId(service._id)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{service.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {service.category}
                    </p>
                  </div>
                </div>

                <span className="text-sm font-black text-slate-900 flex-shrink-0">
                  ₹{service.basePrice}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Step 2: Date & Time with Availability integration */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                2
              </span>
              <h2 className="text-lg font-black text-slate-900">Choose Date & Preferred Time</h2>
            </div>

            {currentDaySchedule && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  currentDaySchedule.isAvailable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {selectedDayName}: {currentDaySchedule.isAvailable ? `${currentDaySchedule.startTime} - ${currentDaySchedule.endTime}` : 'Closed'}
              </span>
            )}
          </div>

          {isDayOff && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                The provider is marked off on {selectedDayName}s. Please choose an alternate date.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Service Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={todayStr}
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 ${
                    isDayOff
                      ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Time Slot *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                {timeSlots.map((slot) => {
                  const isBooked = bookedTimesOnSelectedDate.includes(slot);
                  const isSelected = scheduledTime === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked || isDayOff}
                      onClick={() => setScheduledTime(slot)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition relative ${
                        isBooked
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title={isBooked ? 'Slot already booked by another customer' : slot}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
              {bookedTimesOnSelectedDate.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-2">
                  * Crossed out slots are already booked by other clients.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Service Address & Details */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              3
            </span>
            <h2 className="text-lg font-black text-slate-900">Service Location & Problem Notes</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Complete Street Address & Flat/House No. *
              </label>
              <input
                type="text"
                required
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="e.g. Flat 402, Green Valley Apartments, MG Road"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pincode / Zip
                </label>
                <input
                  type="text"
                  value={address.zipCode}
                  onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  placeholder="e.g. 400001"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Describe the Issue (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what needs to be fixed, unusual sounds, leaks, parts needed..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Confirmation Button Box */}
        <div className="p-6 bg-slate-900 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block">
              Total to be confirmed
            </span>
            <span className="text-2xl font-black text-white">₹{calculatedPrice}</span>
            <span className="text-xs text-slate-400 block mt-0.5">
              Status will be set to <strong className="text-amber-400">pending</strong> until accepted by provider.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || isDayOff}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="inline-block animate-spin mr-2">⟳</span>
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            <span>
              {submitting
                ? 'Creating Booking...'
                : isDayOff
                ? 'Provider Unavailable'
                : 'Confirm Booking'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookServicePage;
