import { API_URL } from './httpClient';

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function postSubmission(path, payload) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to submit request');
  return data;
}

export function sendContact(payload) {
  return postSubmission('/support/contact', payload);
}

export function sendFeedback(payload) {
  return postSubmission('/support/feedback', payload);
}
