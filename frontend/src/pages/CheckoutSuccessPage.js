import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import { CheckCircle, Package, WarningCircle, ArrowClockwise } from '@phosphor-icons/react';

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 8;

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const attemptsRef = useRef(0);

  const pollPaymentStatus = useCallback(async () => {
    if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await fetch(`${API}/checkout/status/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        if (data.payment_status === 'paid') {
          setStatus('success');
          setPaymentDetails(data);
          return;
        } else if (data.status === 'expired') {
          setStatus('expired');
          return;
        }

        setStatus('pending');
        attemptsRef.current += 1;
        setTimeout(pollPaymentStatus, POLL_INTERVAL_MS);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
      attemptsRef.current += 1;
      if (attemptsRef.current < MAX_POLL_ATTEMPTS) {
        setTimeout(pollPaymentStatus, POLL_INTERVAL_MS);
      } else {
        setStatus('error');
      }
    }
  }, [sessionId, token]);

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus('error');
    }
  }, [sessionId, pollPaymentStatus]);

  const retryCheck = () => {
    attemptsRef.current = 0;
    setStatus('checking');
    pollPaymentStatus();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />

      <main className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-[#141414] border border-white/10 rounded-sm p-12 text-center" data-testid="checkout-status">
          {(status === 'checking' || status === 'pending') && (
            <>
              <div className="w-16 h-16 border-4 border-[#FF3B30] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h1 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight mb-3" data-testid="status-checking">
                {status === 'checking' ? 'Verifying Payment...' : 'Processing...'}
              </h1>
              <p className="text-[#A1A1AA]">
                Please wait while we confirm your payment. This may take a few seconds.
              </p>
              <p className="text-xs text-[#A1A1AA] mt-4">
                Attempt {attemptsRef.current + 1} of {MAX_POLL_ATTEMPTS}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={80} weight="fill" className="text-[#34C759] mx-auto mb-6" />
              <h1 className="font-['Barlow_Condensed'] font-black text-4xl uppercase tracking-tight mb-3 text-[#34C759]" data-testid="status-success">
                Payment Successful!
              </h1>
              <p className="text-[#A1A1AA] mb-8">
                Thank you for your order. Your supplements will be shipped soon.
              </p>
              {paymentDetails && (
                <div className="bg-[#1C1C1E] border border-white/10 rounded-sm p-6 mb-8 text-left" data-testid="payment-details">
                  <div className="flex justify-between mb-3">
                    <span className="text-[#A1A1AA]">Amount Paid</span>
                    <span className="font-bold">${(paymentDetails.amount_total / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Status</span>
                    <span className="text-[#34C759] font-bold">Confirmed</span>
                  </div>
                </div>
              )}
              <div className="flex gap-4 justify-center">
                <Link
                  to="/orders"
                  className="bg-[#FF3B30] text-white px-6 py-3 rounded-sm font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95 flex items-center gap-2"
                  data-testid="view-orders-button"
                >
                  <Package size={20} weight="fill" />
                  View Orders
                </Link>
                <Link
                  to="/shop"
                  className="bg-[#141414] text-white border border-white/10 hover:border-white/30 px-6 py-3 rounded-sm font-bold tracking-wide uppercase transition-all active:scale-95"
                  data-testid="continue-shopping-button"
                >
                  Continue Shopping
                </Link>
              </div>
            </>
          )}

          {status === 'timeout' && (
            <>
              <WarningCircle size={80} weight="fill" className="text-[#FFCC00] mx-auto mb-6" />
              <h1 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight mb-3" data-testid="status-timeout">
                Verification Timed Out
              </h1>
              <p className="text-[#A1A1AA] mb-8">
                We couldn't verify your payment yet. Don't worry - if payment was successful, your order will be processed automatically.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={retryCheck}
                  className="bg-[#FF3B30] text-white px-6 py-3 rounded-sm font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95 flex items-center gap-2"
                  data-testid="retry-check-button"
                >
                  <ArrowClockwise size={20} weight="bold" />
                  Retry
                </button>
                <Link
                  to="/orders"
                  className="bg-[#141414] text-white border border-white/10 hover:border-white/30 px-6 py-3 rounded-sm font-bold tracking-wide uppercase transition-all active:scale-95"
                  data-testid="go-to-orders-button"
                >
                  Check Orders
                </Link>
              </div>
            </>
          )}

          {status === 'expired' && (
            <>
              <WarningCircle size={80} weight="fill" className="text-[#FFCC00] mx-auto mb-6" />
              <h1 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight mb-3" data-testid="status-expired">
                Session Expired
              </h1>
              <p className="text-[#A1A1AA] mb-8">Your payment session has expired. Please try again.</p>
              <Link
                to="/cart"
                className="inline-flex bg-[#FF3B30] text-white px-6 py-3 rounded-sm font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95"
                data-testid="back-to-cart-button"
              >
                Back to Cart
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <WarningCircle size={80} weight="fill" className="text-[#FF3B30] mx-auto mb-6" />
              <h1 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight mb-3" data-testid="status-error">
                Something Went Wrong
              </h1>
              <p className="text-[#A1A1AA] mb-8">We couldn't verify your payment. Please try again or contact support.</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={retryCheck}
                  className="bg-[#FF3B30] text-white px-6 py-3 rounded-sm font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95 flex items-center gap-2"
                  data-testid="retry-payment-button"
                >
                  <ArrowClockwise size={20} weight="bold" />
                  Retry
                </button>
                <Link
                  to="/cart"
                  className="bg-[#141414] text-white border border-white/10 hover:border-white/30 px-6 py-3 rounded-sm font-bold tracking-wide uppercase transition-all active:scale-95"
                  data-testid="back-to-cart-error-button"
                >
                  Back to Cart
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccessPage;
