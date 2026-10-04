// Deterministic smooth 1D value noise in [-1, 1].
export function makeNoise1D(seed = 1) {
  const hash = (i) => {
    let x = Math.imul(i ^ Math.imul(seed, 0x9e3779b9), 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return ((x >>> 0) / 4294967295) * 2 - 1;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return (t) => {
    const i = Math.floor(t);
    const f = smooth(t - i);
    return hash(i) * (1 - f) + hash(i + 1) * f;
  };
}

// A few octaves of value noise summed, still in [-1, 1].
export function makeFractalNoise1D(seed = 1, octaves = 3) {
  const layers = [];
  let amp = 1;
  let freq = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    layers.push({ n: makeNoise1D(seed + o * 101), amp, freq });
    total += amp;
    amp *= 0.5;
    freq *= 2.17;
  }
  return (t) => {
    let v = 0;
    for (const l of layers) v += l.n(t * l.freq) * l.amp;
    return v / total;
  };
}
