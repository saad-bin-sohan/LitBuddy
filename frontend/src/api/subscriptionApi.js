import { apiJson } from './httpClient';

export const getSubscription = async () => apiJson('/subscription');

export const upgradeSubscription = async (maxActiveConversations) =>
  apiJson('/subscription/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxActiveConversations }),
  });

export const downgradeSubscription = async () =>
  apiJson('/subscription/downgrade', {
    method: 'POST',
  });
