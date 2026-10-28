/**
 * Renewing the 30-minute login with the 7-day refresh cookie (no React, no DOM) so it can be
 * unit-tested with node --test. Used by services/api.js.
 */

// A 401 from these means wrong credentials or no session, never an expired login.
const NO_RENEW = /^\/auth\/(login|login-otp|refresh|logout|2fa\/verify)(?:[?#]|$)/;

const LOCK_NAME = 'crm-auth-refresh';

function shouldRenew(error) {
  const config = error && error.config;
  if (!config || config._authRetried) return false;
  if (!error.response || error.response.status !== 401) return false;
  return !NO_RENEW.test(String(config.url || ''));
}

/**
 * Returns renew(): one refresh at a time per tab, and with Web Locks one at a time across tabs.
 * The backend treats a refresh token sent twice as stolen and ends every session, so two tabs
 * must never send the same one; the second tab waits and sends the cookie the first one got.
 */
function createRenewer({ refresh, locks }) {
  let pending = null;
  return function renew() {
    if (!pending) {
      const run = () => refresh();
      pending = Promise.resolve()
        .then(() => (locks ? locks.request(LOCK_NAME, run) : run()))
        .finally(() => { pending = null; });
    }
    return pending;
  };
}

module.exports = {
  LOCK_NAME,
  shouldRenew,
  createRenewer,
};
