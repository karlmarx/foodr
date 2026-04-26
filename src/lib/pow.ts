// Browser-side proof-of-work solver. Matches the backend's verifier:
//   SHA-256(seed || ":" || nonce) must have >= `difficulty` leading zero bits.

const enc = new TextEncoder();

function leadingZeroBits(bytes: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0) {
      count += 8;
      continue;
    }
    let mask = 0x80;
    while (mask > 0 && (b & mask) === 0) {
      count += 1;
      mask >>= 1;
    }
    break;
  }
  return count;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  const buf = await crypto.subtle.digest("SHA-256", ab);
  return new Uint8Array(buf);
}

export interface PowSolution {
  nonce: string;
  attempts: number;
  ms: number;
}

export async function solvePow(
  seed: string,
  difficulty: number,
  yieldEvery = 1024,
): Promise<PowSolution> {
  const start = performance.now();
  // Random offset so two tabs don't collide on the same nonce range.
  let n = Math.floor(Math.random() * 0xffffffff);
  let attempts = 0;
  while (true) {
    const nonce = n.toString(16);
    const input = enc.encode(`${seed}:${nonce}`);
    const digest = await sha256(input);
    attempts++;
    if (leadingZeroBits(digest) >= difficulty) {
      return { nonce, attempts, ms: performance.now() - start };
    }
    n = (n + 1) >>> 0;
    if (attempts % yieldEvery === 0) {
      // Yield to the event loop so the UI stays responsive.
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}
