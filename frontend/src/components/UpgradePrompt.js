// frontend/src/components/UpgradePrompt.js
import React, { useState } from 'react';
import { upgradeSubscription } from '../api/subscriptionApi';

/**
 * Props:
 * - onClose()           // called when modal closed
 * - suggestedLimit (number) optional
 * - onUpgraded(newPlanInfo) optional
 */
const UpgradePrompt = ({ onClose = () => {}, suggestedLimit = 20, onUpgraded = () => {} }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleUpgrade = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await upgradeSubscription(suggestedLimit);
      setSuccessMsg('Subscription upgraded (simulated). You should be able to resume now.');
      onUpgraded(res);
    } catch (err) {
      setError(err.message || 'Upgrade failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', left: 0, top: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{ width: 400, background: 'white', padding: 20, borderRadius: 8 }}>
        <h3>Upgrade to resume</h3>
        <p>Your account's active conversation limit would be exceeded. Upgrade to continue this conversation.</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} disabled={busy}>Close</button>
          <button onClick={handleUpgrade} disabled={busy} className="btn btn-primary">
            {busy ? 'Upgrading...' : 'Simulate Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
