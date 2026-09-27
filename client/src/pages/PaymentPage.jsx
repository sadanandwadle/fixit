import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { bookingAPI, paymentAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import {
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Printer,
  Calendar,
  Clock,
  User,
  Wrench,
  Receipt,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

const CANONICAL_PAYMENT_STATUS_LABELS = {
  pending: 'Payment Pending',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const CANONICAL_PAYMENT_METHOD_LABELS = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
};

const PaymentPage = () => {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Method selection: 'upi' | 'card' | 'cash'
  const [selectedMethod, setSelectedMethod] = useState('upi');

  // UPI fields
  const [upiId, setUpiId] = useState('customer@okaxis');

  // Card fields (DEMO ONLY - never stored in DB)
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardExpiry, setCardExpiry] = useState('12/30');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardName, setCardName] = useState('Demo Customer');

  // Simulated failure toggle for QA
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Failure & Cancellation states (Section 18)
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentCancelled, setPaymentCancelled] = useState(false);
  const [failureReason, setFailureReason] = useState('');

  // Initial fetch: Booking & Payment
  const initPaymentPage = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch booking details
      const bookingRes = await bookingAPI.getById(bookingId);
      if (!bookingRes.data?.success) {
        throw new Error(bookingRes.data?.message || 'Could not load booking');
      }

      const bookingData = bookingRes.data.data;
      setBooking(bookingData);

      // 2. Fetch any existing payment record for this booking
      const paymentRes = await paymentAPI.getByBooking(bookingId);
      if (paymentRes.data?.success && paymentRes.data.payment) {
        const existingPayment = paymentRes.data.payment;
        setPayment(existingPayment);

        if (existingPayment.status === 'paid' || bookingData.paymentStatus === 'paid') {
          setSuccessData(existingPayment);
          setLoading(false);
          return;
        } else if (existingPayment.status === 'failed') {
          setPaymentFailed(true);
          setFailureReason(existingPayment.failureReason || 'Previous payment attempt failed.');
        } else if (existingPayment.status === 'cancelled') {
          setPaymentCancelled(true);
        }
      }

      // 3. If service is completed and not paid, initialize payment record
      if (
        bookingData.status === 'completed' &&
        bookingData.paymentStatus !== 'paid' &&
        (!paymentRes.data?.payment || paymentRes.data.payment.status === 'pending')
      ) {
        const createRes = await paymentAPI.create(bookingId);
        if (createRes.data?.success) {
          setPayment(createRes.data.payment);
        }
      }
    } catch (err) {
      console.error('Payment initialization error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initPaymentPage();
  }, [bookingId]);

  // Handle simulated payment process
  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!payment?.paymentId && !payment?._id && !payment?.id) {
      setError('Payment record is not initialized');
      return;
    }

    const pId = payment.paymentId || payment.id || payment._id;

    // Frontend validations
    if (selectedMethod === 'upi') {
      if (!upiId || !upiId.includes('@')) {
        setError('Please enter a valid demo UPI ID (e.g. name@upi)');
        return;
      }
    }

    try {
      setProcessing(true);
      setError(null);
      setPaymentFailed(false);
      setPaymentCancelled(false);

      // Simulate a realistic 1.2-second network/gateway latency
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const payload = {
        method: selectedMethod,
        upiId: selectedMethod === 'upi' ? upiId.trim() : undefined,
        simulateFailure: simulateFailure,
      };

      const res = await paymentAPI.process(pId, payload);

      if (res.data?.success) {
        setSuccessData(res.data.payment);
        setBooking((prev) => (prev ? { ...prev, paymentStatus: 'paid' } : prev));
      } else {
        setPaymentFailed(true);
        setFailureReason(res.data?.message || 'Payment authorization declined');
      }
    } catch (err) {
      console.error('Process payment error:', err);
      const msg = err.response?.data?.message || err.message || 'Payment processing failed';
      setPaymentFailed(true);
      setFailureReason(msg);
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  // Section 5: Retry creates a new payment attempt while preserving failed/cancelled record in DB
  const handleRetry = async () => {
    try {
      setLoading(true);
      setPaymentFailed(false);
      setPaymentCancelled(false);
      setError(null);
      setFailureReason('');
      setSimulateFailure(false);

      const createRes = await paymentAPI.create(bookingId);
      if (createRes.data?.success) {
        setPayment(createRes.data.payment);
      }
    } catch (err) {
      console.error('Failed to create new payment attempt:', err);
      setError(err.response?.data?.message || 'Failed to start a new payment attempt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading payment gateway..." />;
  }

  if (error && !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <Alert type="error" message={error} />
        <Link
          to="/customer/bookings"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
        >
          Back to Bookings
        </Link>
      </div>
    );
  }

  // Guard: If service is not completed yet
  if (booking && booking.status !== 'completed' && !successData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-6">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto" />
          <h2 className="text-xl font-black text-amber-900">Payment Not Available Yet</h2>
          <p className="text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
            Payment can only be processed after the service professional arrives, verifies your OTP, and marks the service job as <strong>Completed</strong>.
          </p>
          <div className="pt-2">
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
              Current Booking Status: {booking.status.toUpperCase()}
            </span>
          </div>
          <div className="pt-4">
            <Link
              to={`/customer/bookings/${booking._id}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Booking Details</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const authoritativeAmount = booking?.price || payment?.amount || 0;
  const providerObj = booking?.providerId || {};
  const serviceObj = booking?.serviceId || {};
  const formattedScheduledDate = booking?.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  // RECEIPT VIEW (When payment is successful or already completed)
  if (successData && successData.status === 'paid') {
    const formattedPaidDate = successData.paidAt
      ? new Date(successData.paidAt).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : new Date().toLocaleString();

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Top return link */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            to={`/customer/bookings/${bookingId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Booking</span>
          </Link>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simulated Payment Complete</span>
          </span>
        </div>

        {/* Receipt Container */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
          {/* Receipt Header Banner (Section 21) */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 sm:p-8 text-center space-y-2">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto text-white">
              <Receipt className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-200 block">
              FIXIT Demo Payment Receipt
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">₹{successData.amount || authoritativeAmount}</h1>
            <div className="flex items-center justify-center gap-2 pt-0.5">
              <span className="text-xs text-emerald-100 font-medium">Payment Status:</span>
              <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-white text-emerald-800">
                Paid
              </span>
            </div>
          </div>

          {/* Demo Disclaimer Watermark Banner (Section 22) */}
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-center text-xs font-bold text-amber-900">
            ⚠️ DEMO PAYMENT — No real money was charged or transferred.
          </div>

          {/* Receipt Body (Section 21) */}
          <div className="p-6 sm:p-8 space-y-6 text-xs">
            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-slate-400 block font-medium">Transaction ID</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block break-all">
                  {successData.transactionId || 'FIXIT-TXN-DEMO'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Paid At</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 block">
                  {formattedPaidDate}
                </span>
              </div>
            </div>

            {/* Service & Provider Details */}
            <div className="space-y-3 pb-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Service & Payment Summary
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Booking ID:</span>
                <span className="font-mono font-bold text-slate-800">{bookingId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold text-slate-800">{serviceObj.name || 'Local Service'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{booking?.customerId?.name || 'Customer'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Provider:</span>
                <span className="font-bold text-slate-800">{providerObj.businessName || 'Verified Pro'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-semibold text-slate-700">{formattedScheduledDate} at {booking?.scheduledTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-slate-800">
                  {CANONICAL_PAYMENT_METHOD_LABELS[successData.method] || successData.method?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-bold text-emerald-700">Paid</span>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="space-y-2 pb-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Base Service Charge</span>
                <span className="font-medium text-slate-800">₹{successData.amount || authoritativeAmount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Currency</span>
                <span className="font-medium text-slate-800">INR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Convenience & Platform Fee</span>
                <span className="font-medium text-emerald-600">₹0 (Free)</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                <span className="font-black text-slate-900">Total Paid</span>
                <span className="font-black text-slate-900 text-base">₹{successData.amount || authoritativeAmount} INR</span>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Thank you for using FIXIT. This receipt confirms that the service fee has been successfully accounted for on the platform.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save Receipt</span>
              </button>

              <Link
                to={`/customer/bookings/${bookingId}`}
                className="w-full sm:flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>View Booking Details</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to={`/customer/bookings/${bookingId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Booking Details</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">
          Ref: {booking?._id?.slice(-8).toUpperCase()}
        </span>
      </div>

      {/* Prominent Demo Notice Header */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-3xl p-6 sm:p-8 shadow-lg space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-100">
          <ShieldCheck className="w-4 h-4" />
          <span>Simulated Payment Gateway</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">DEMO PAYMENT</h1>
        <p className="text-xs sm:text-sm text-amber-100 leading-relaxed max-w-xl">
          No real money will be charged. This internal payment simulator demonstrates a complete, secure full-stack payment lifecycle for your completed service.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Failure screen view (Section 18 & 21) */}
      {paymentFailed && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <XCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-xl font-black text-rose-900">Payment Failed</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-slate-500">Payment Status:</span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              Failed
            </span>
          </div>
          <p className="text-xs text-rose-700 max-w-md mx-auto">
            {failureReason || 'Simulated payment authorization failed. No money was charged.'}
          </p>
          <div className="pt-2">
            <button
              onClick={handleRetry}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 mx-auto shadow-md shadow-rose-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Cancelled screen view (Section 18 & 21) */}
      {paymentCancelled && !paymentFailed && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Payment Cancelled</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-slate-500">Payment Status:</span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
              Cancelled
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            This demo payment session was cancelled. You can initiate a new payment attempt anytime.
          </p>
          <div className="pt-2">
            <button
              onClick={handleRetry}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 mx-auto shadow-md shadow-blue-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Start New Payment</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Payment Form Container */}
      {!paymentFailed && !paymentCancelled && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Order Summary Header */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Completed Job
              </span>
              <h2 className="font-extrabold text-slate-900 text-base">
                {serviceObj.name || 'Service Job'}
              </h2>
              <p className="text-xs text-slate-500">
                Provider: <span className="font-semibold text-slate-700">{providerObj.businessName || 'Specialist'}</span> • {formattedScheduledDate}
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Authoritative Fee
              </span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                ₹{authoritativeAmount}
              </span>
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Demo Payment Method
            </label>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition flex flex-col items-center justify-center gap-2 ${
                  selectedMethod === 'upi'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Smartphone className={`w-5 h-5 ${selectedMethod === 'upi' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold block">UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition flex flex-col items-center justify-center gap-2 ${
                  selectedMethod === 'card'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <CreditCard className={`w-5 h-5 ${selectedMethod === 'card' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold block">Card</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('cash')}
                className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition flex flex-col items-center justify-center gap-2 ${
                  selectedMethod === 'cash'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Banknote className={`w-5 h-5 ${selectedMethod === 'cash' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold block">Cash</span>
              </button>
            </div>
          </div>

          {/* Sub-form based on selected method */}
          <form onSubmit={handleProcessPayment} className="space-y-5">
            {/* UPI Option Form */}
            {selectedMethod === 'upi' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Simulated UPI Payment</span>
                  <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Instant Demo
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Demo Virtual Payment Address (VPA / UPI ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="name@okaxis or user@upi"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="block text-[11px] text-slate-400 mt-1">
                    Tip: Enter any UPI ID (e.g. <code>user@upi</code>). To simulate a failed payment, enter <code>fail@upi</code>.
                  </span>
                </div>
              </div>
            )}

            {/* Card Option Form */}
            {selectedMethod === 'card' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Simulated Debit / Credit Card</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    CVV Not Stored
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Demo Card Number *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4111 1111 1111 1111"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Expiry (MM/YY) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/30"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        CVV *
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Cardholder Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-tight">
                  🔒 Security Compliance: Card numbers and CVVs are strictly client-side demo placeholders and are never transmitted, stored, or logged in MongoDB.
                </p>
              </div>
            )}

            {/* Cash Option Form */}
            {selectedMethod === 'cash' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Cash Payment (In-Person)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You selected <strong>Cash</strong>. Confirm that you have handed or will hand ₹{authoritativeAmount} in cash directly to {providerObj.businessName || 'the provider'}.
                </p>
                <div className="text-[11px] text-slate-400 bg-white p-3 rounded-xl border border-slate-200">
                  This simulated confirmation will record a completed transaction and generate your digital payment receipt.
                </div>
              </div>
            )}

            {/* QA Testing Toggle: Simulate Failure */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-semibold text-amber-900">
                  QA Mode: Simulate payment failure
                </span>
              </div>
              <input
                type="checkbox"
                id="simulateFailure"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Demo Payment...</span>
                </>
              ) : selectedMethod === 'cash' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Cash Payment (₹{authoritativeAmount})</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Simulate Payment of ₹{authoritativeAmount}</span>
                </>
              )}
            </button>

            {/* Disclaimer footer */}
            <p className="text-center text-[11px] text-slate-400">
              This is a simulated demo environment. No real funds are accessed or transferred.
            </p>
          </form>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
