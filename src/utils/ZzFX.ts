// ZzFX - Zuper Zmall Zound Zynth - MIT License - Copyright 2019 Frank Force
// @ts-nocheck

const zzfxR = 44100;
let zzfxX: AudioContext;

export const initZzfx = () => {
    if (!zzfxX) {
        zzfxX = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
};

export const zzfx = (...t: any[]) => zzfxP(zzfxG(...t));

export const zzfxP = (...t: any[]) => {
    if (!zzfxX) initZzfx();
    if (zzfxX.state === 'suspended') zzfxX.resume();
    let e = zzfxX.createBufferSource(),
        f = zzfxX.createBuffer(t.length, t[0].length, zzfxR);
    t.map((d, i) => f.getChannelData(i).set(d));
    e.buffer = f;
    e.connect(zzfxX.destination);
    e.start();
    return e;
};

export const zzfxG = (q = 1, k = .05, c = 220, e = 0, t = 0, m = .1, r = 0, F = 1, v = 0, z = 0, w = 0, A = 0, l = 0, B = 0, x = 0, A2 = 0, d = 0, y = 1, m2 = 0, C = 0) => {
    let y2 = 2 * Math.PI,
        H = v *= 500 * y2 / zzfxR ** 2,
        I = (0 < x ? 1 : -1) * y2 / 4,
        D = c *= (1 + 2 * k * Math.random() - k) * y2 / zzfxR,
        Z = [],
        g = 0,
        E = 0,
        a = 0,
        n = 1,
        J = 0,
        K = 0,
        f = 0,
        p, h;
    e = 99 + zzfxR * e;
    m = 99 + zzfxR * m;
    t = 99 + zzfxR * t;
    l = 99 + zzfxR * l;
    d = 99 + zzfxR * d;
    a = e + m + t;
    w *= 500 * y2 / zzfxR ** 3;
    l = Math.floor(l);
    for (h = 0; h < a; h++) {
        Z[h] = E = B ? Math.sin(f) : 1;
        E = J ? 1 - 2 * (h % J) / J : E;
        E = A ? E * (f < y2 ? 1 : -1) : E;
        E = F ? E ** 3 : E;
        p = !!d && Math.abs(h - l) < d;
        E = p ? Math.random() * 2 - 1 : E;
        E = E * (h < e ? h / e : h < e + m ? 1 - ((h - e) / m) * (1 - y) : y * (1 - (h - e - m) / t));
        E = E * Math.cos(I);
        f += D += H += w;
        E *= q;
        if (l && ++K % l == 0) E = 0, I += A2, D += z * y2 / zzfxR;
        g += E;
        if (C) if (h % Math.floor(zzfxR / C) == 0) g = 0;
    }
    return [Z];
};
