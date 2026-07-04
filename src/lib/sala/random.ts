// PRNG determinista (mulberry32) para geometría procedural de la sala.
// Math.random() es impuro para el React Compiler (render debe ser puro);
// con semilla fija la escena además es estable entre renders/recargas.

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
