import React, { useState, useEffect } from 'react';
import { availabilityAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Save,
  Info,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DEFAULT_SCHEDULE = DAYS_OF_WEEK.map((day) => ({
  day,
  isAvailable: day !== 'Sunday',
  startTime: '09:00',
  endTime: '18:00',
}));

const ProviderAvailabilityPage = () => {
  const [schedules, setSchedules] = useState(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await availabilityAPI.getMy();
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          // Merge with DAYS_OF_WEEK order
          const existingMap = new Map(res.data.data.map((s) => [s.day, s]));
          const merged = DAYS_OF_WEEK.map((day) => {
            if (existingMap.has(day)) {
              const item = existingMap.get(day);
              return {
                day,
                isAvailable: Boolean(item.isAvailable),
                startTime: item.startTime || '09:00',
                endTime: item.endTime || '18:00',
              };
            }
            return {
              day,
              isAvailable: day !== 'Sunday',
              startTime: '09:00',
              endTime: '18:00',
            };
          });
          setSchedules(merged);
        }
      } catch (err) {
        console.error('Failed to load availability:', err);
        setError(err.response?.data?.message || 'Could not load your availability schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  const handleToggleDay = (dayIndex) => {
    const updated = [...schedules];
    updated[dayIndex] = {
      ...updated[dayIndex],
      isAvailable: !updated[dayIndex].isAvailable,
    };
    setSchedules(updated);
  };

  const handleTimeChange = (dayIndex, field, value) => {
    const updated = [...schedules];
    updated[dayIndex] = {
      ...updated[dayIndex],
      [field]: value,
    };
    setSchedules(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate times
    for (const s of schedules) {
      if (s.isAvailable) {
        if (!s.startTime || !s.endTime) {
          setError(`Please provide both start and end times for ${s.day}`);
          return;
        }
        if (s.startTime >= s.endTime) {
          setError(`Start time must be earlier than end time for ${s.day} (${s.startTime} - ${s.endTime})`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      const res = await availabilityAPI.updateMy(schedules);
      if (res.data?.success) {
        setSuccess('Weekly working hours and availability updated successfully!');
      } else {
        setError(res.data?.message || 'Failed to update availability');
      }
    } catch (err) {
      console.error('Save availability error:', err);
      setError(err.response?.data?.message || 'Failed to save availability schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading availability schedule..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/provider/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
            Work Schedule
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Weekly Availability
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Define the days and working hours when customers can book your services.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
        >
          {saving ? (
            <span className="animate-spin mr-1">⟳</span>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Saving Changes...' : 'Save Schedule'}</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Schedule Info Box */}
      <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p>
          Days marked <strong>Unavailable</strong> will be disabled in the customer booking calendar. Customers will not be allowed to schedule appointments on days you are off.
        </p>
      </div>

      {/* Schedule Table / Cards */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {schedules.map((schedule, idx) => (
            <div
              key={schedule.day}
              className={`p-5 sm:p-6 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                schedule.isAvailable ? 'bg-white' : 'bg-slate-50/70'
              }`}
            >
              {/* Day info and toggle */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleToggleDay(idx)}
                  className="focus:outline-none"
                  title={schedule.isAvailable ? 'Mark as day off' : 'Mark as available'}
                >
                  {schedule.isAvailable ? (
                    <div className="w-12 h-6 bg-emerald-600 rounded-full p-1 flex items-center justify-end transition-colors cursor-pointer">
                      <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                    </div>
                  ) : (
                    <div className="w-12 h-6 bg-slate-300 rounded-full p-1 flex items-center justify-start transition-colors cursor-pointer">
                      <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                    </div>
                  )}
                </button>

                <div>
                  <span className="font-extrabold text-slate-900 text-base block">
                    {schedule.day}
                  </span>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      schedule.isAvailable ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {schedule.isAvailable ? 'Available for Bookings' : 'Day Off / Closed'}
                  </span>
                </div>
              </div>

              {/* Time pickers */}
              {schedule.isAvailable ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">From:</span>
                    <input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) => handleTimeChange(idx, 'startTime', e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <span className="text-slate-300 font-bold">—</span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">To:</span>
                    <input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) => handleTimeChange(idx, 'endTime', e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Not accepting service bookings on {schedule.day}s
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Changes take effect immediately upon saving.
          </span>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs shadow transition"
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProviderAvailabilityPage;
