export function hsvToRgb(h: number, s: number, v: number): string[] {
    s = s / 100;
    v = v / 100;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;

    let r1: number, g1: number, b1: number;

    if (h >= 0 && h < 60) {
        r1 = c;
        g1 = x;
        b1 = 0;
    } else if (h >= 60 && h < 120) {
        r1 = x;
        g1 = c;
        b1 = 0;
    } else if (h >= 120 && h < 180) {
        r1 = 0;
        g1 = c;
        b1 = x;
    } else if (h >= 180 && h < 240) {
        r1 = 0;
        g1 = x;
        b1 = c;
    } else if (h >= 240 && h < 300) {
        r1 = x;
        g1 = 0;
        b1 = c;
    } else {
        r1 = c;
        g1 = 0;
        b1 = x;
    }

    const r = Math.round((r1 + m) * 100);
    const g = Math.round((g1 + m) * 100);
    const b = Math.round((b1 + m) * 100);

    return [String(r)+'%', String(g)+'%', String(b)+'%'];
}
