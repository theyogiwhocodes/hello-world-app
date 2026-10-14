import type { BuyRequest } from '@app/shared';

const REQ = 'CART_COMPARE_REQUEST';
const RES = 'CART_COMPARE_RESPONSE';

type Reply = { ok: boolean; message?: string };

/** Send a message to the extension's content bridge and wait for its reply. */
function call(type: string, payload?: unknown, timeoutMs = 1500): Promise<Reply | null> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || e.data?.type !== RES || e.data.id !== id) return;
      cleanup();
      resolve(e.data.reply as Reply);
    };
    const t = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(t);
      window.removeEventListener('message', onMsg);
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ type: REQ, id, action: type, payload }, window.location.origin);
  });
}

export const isExtensionInstalled = async () => (await call('ping')) !== null;
export const buyViaExtension = (req: BuyRequest) => call('buy', req, 5000);
