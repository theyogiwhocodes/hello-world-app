// Runs on the Cart Compare web app origin. Relays page messages to the background worker.
const REQ = 'CART_COMPARE_REQUEST';
const RES = 'CART_COMPARE_RESPONSE';

window.addEventListener('message', async (e) => {
  if (e.source !== window || e.data?.type !== REQ) return;
  const { id, action, payload } = e.data;
  let reply;
  try {
    reply = await chrome.runtime.sendMessage({ action, payload });
  } catch (err) {
    reply = { ok: false, message: String(err) };
  }
  window.postMessage({ type: RES, id, reply }, window.location.origin);
});
