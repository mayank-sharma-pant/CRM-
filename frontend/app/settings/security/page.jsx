'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Copy, Download, KeyRound, AlertTriangle } from 'lucide-react';
import { twoFactor } from '../../../services/api';

function formatSecret(secret) {
  if (!secret) return '';
  return secret.match(/.{1,4}/g)?.join(' ') || secret;
}

function SecurityInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setupToken = searchParams.get('setup_token') || undefined;
  const forced = searchParams.get('forced') === '1';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null); // { enabled, confirmed_at, recovery_codes_remaining }

  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollment, setEnrollment] = useState(null); // { secret, otpauth_uri }
  const [confirmCode, setConfirmCode] = useState('');
  const [confirming, setConfirming] = useState(false);

  const [recoveryCodes, setRecoveryCodes] = useState(null); // freshly issued codes to display
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  const [actionError, setActionError] = useState('');
  const [regenPassword, setRegenPassword] = useState('');
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const [disablePassword, setDisablePassword] = useState('');
  const [showDisablePrompt, setShowDisablePrompt] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await twoFactor.status();
      setStatus(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load two-factor status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleEnable = async () => {
    setEnrollError('');
    setEnrolling(true);
    try {
      const data = await twoFactor.setup(setupToken);
      setEnrollment(data);
    } catch (err) {
      setEnrollError(err.response?.data?.detail || 'Could not start 2FA setup.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(confirmCode)) {
      setEnrollError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setEnrollError('');
    setConfirming(true);
    try {
      const data = await twoFactor.confirm(confirmCode, setupToken);
      setRecoveryCodes(data.recovery_codes);
      setEnrollment(null);
      setConfirmCode('');
    } catch (err) {
      setEnrollError(err.response?.data?.detail || 'Verification failed. Check the code and try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleAcknowledge = async () => {
    setAcknowledged(true);
    setRecoveryCodes(null);
    await fetchStatus();
    if (forced) {
      router.push('/settings/security');
    }
  };

  const handleCopyCodes = async (codes) => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable; user can still select/copy manually
    }
  };

  const handleDownloadCodes = (codes) => {
    const blob = new Blob([codes.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = async (e) => {
    e.preventDefault();
    setActionError('');
    setRegenLoading(true);
    try {
      const data = await twoFactor.regenerate(regenPassword);
      setRecoveryCodes(data.recovery_codes);
      setAcknowledged(false);
      setShowRegenPrompt(false);
      setRegenPassword('');
      await fetchStatus();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Could not regenerate recovery codes.');
    } finally {
      setRegenLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setActionError('');
    setDisableLoading(true);
    try {
      await twoFactor.disable(disablePassword);
      setShowDisablePrompt(false);
      setDisablePassword('');
      await fetchStatus();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Could not disable two-factor authentication.');
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Two-factor authentication</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Add an authenticator app as a second sign-in step.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 space-y-6">
        {forced && (
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your company requires two-factor authentication for all members. Set it up below to continue.
            </p>
          </div>
        )}

        {loading && (
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading two-factor status…</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-6 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20">
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            <button
              type="button"
              onClick={fetchStatus}
              className="mt-3 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && recoveryCodes && !acknowledged && (
          <RecoveryCodesCard
            codes={recoveryCodes}
            copied={copied}
            onCopy={() => handleCopyCodes(recoveryCodes)}
            onDownload={() => handleDownloadCodes(recoveryCodes)}
            onAcknowledge={handleAcknowledge}
          />
        )}

        {!loading && !error && status && !status.enabled && !recoveryCodes && (
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700">
                <ShieldAlert size={14} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Two-factor authentication is off</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Turn it on to protect your account with a code from an authenticator app.
                </div>
              </div>
            </div>

            {!enrollment ? (
              <button
                type="button"
                onClick={handleEnable}
                disabled={enrolling}
                className="mt-4 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                {enrolling ? 'Starting…' : 'Enable 2FA'}
              </button>
            ) : (
              <div className="mt-5 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-5">
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    1. Enter this key in your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-sm tracking-wider text-slate-900 dark:text-white select-all">
                    {formatSecret(enrollment.secret)}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Or use the setup URI if your app supports importing one:
                  </p>
                  <code className="block px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 break-all select-all">
                    {enrollment.otpauth_uri}
                  </code>
                </div>

                <form onSubmit={handleConfirm} className="space-y-2">
                  <label htmlFor="confirmCode" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    2. Enter the 6-digit verification code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="confirmCode"
                      name="confirmCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                      className="w-40 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={confirming}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      {confirming ? 'Verifying…' : 'Verify & activate'}
                    </button>
                  </div>
                  {enrollError && <p className="text-xs text-rose-600 dark:text-rose-400">{enrollError}</p>}
                </form>
              </div>
            )}
            {enrollError && !enrollment && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{enrollError}</p>}
          </div>
        )}

        {!loading && !error && status && status.enabled && !recoveryCodes && (
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Two-factor authentication is on</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {status.recovery_codes_remaining} recovery code{status.recovery_codes_remaining === 1 ? '' : 's'} remaining.
                </div>
              </div>
            </div>

            {actionError && (
              <p className="mt-4 text-xs text-rose-600 dark:text-rose-400">{actionError}</p>
            )}

            <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Regenerate recovery codes</div>
                    <div className="text-xs text-slate-500">Invalidates your existing codes and issues 10 new ones.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowRegenPrompt((v) => !v); setActionError(''); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <KeyRound size={12} />
                    Regenerate
                  </button>
                </div>
                {showRegenPrompt && (
                  <form onSubmit={handleRegenerate} className="mt-3 flex items-end gap-2">
                    <div className="flex-1">
                      <label htmlFor="regenPassword" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Confirm your password
                      </label>
                      <input
                        id="regenPassword"
                        name="regenPassword"
                        type="password"
                        autoComplete="current-password"
                        value={regenPassword}
                        onChange={(e) => setRegenPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={regenLoading || !regenPassword}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      {regenLoading ? 'Working…' : 'Confirm'}
                    </button>
                  </form>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Disable 2FA</div>
                    <div className="text-xs text-slate-500">Removes the second sign-in step from your account.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowDisablePrompt((v) => !v); setActionError(''); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    Disable 2FA
                  </button>
                </div>
                {showDisablePrompt && (
                  <form onSubmit={handleDisable} className="mt-3 flex items-end gap-2">
                    <div className="flex-1">
                      <label htmlFor="disablePassword" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Confirm your password
                      </label>
                      <input
                        id="disablePassword"
                        name="disablePassword"
                        type="password"
                        autoComplete="current-password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={disableLoading || !disablePassword}
                      className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50"
                    >
                      {disableLoading ? 'Working…' : 'Confirm'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SecuritySettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10 flex items-center justify-center py-20">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    }>
      <SecurityInner />
    </Suspense>
  );
}

function RecoveryCodesCard({ codes, copied, onCopy, onDownload, onAcknowledge }) {
  return (
    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">Save your recovery codes</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Each code can be used once to sign in if you lose access to your authenticator app. Store them somewhere safe.
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center select-all">
            {code}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Copy size={12} />
          {copied ? 'Copied' : 'Copy codes'}
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Download size={12} />
          Download as .txt
        </button>
      </div>

      <button
        type="button"
        onClick={onAcknowledge}
        className="mt-5 w-full px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
      >
        I've saved these codes
      </button>
    </div>
  );
}
