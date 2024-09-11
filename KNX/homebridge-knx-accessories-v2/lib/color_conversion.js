function hsvToRgb(h, s, v) {
    s=s/100;
    v=v/100;
    let w = 1-s;
    let c = v * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = v - c;
    let rPrime, gPrime, bPrime;
    if (h >= 0 && h < 60) {
        rPrime = c;
        gPrime = x;
        bPrime = 0;
    } else if (h >= 60 && h < 120) {
        rPrime = x;
        gPrime = c;
        bPrime = 0;
    } else if (h >= 120 && h < 180) {
        rPrime = 0;
        gPrime = c;
        bPrime = x;
    } else if (h >= 180 && h < 240) {
        rPrime = 0;
        gPrime = x;
        bPrime = c;
    } else if (h >= 240 && h < 300) {
        rPrime = x;
        gPrime = 0;
        bPrime = c;
    } else if (h >= 300 && h < 360) {
        rPrime = c;
        gPrime = 0;
        bPrime = x;
    }

    let r = (rPrime + m) * 100;
    let g = (gPrime + m) * 100;
    let b = (bPrime + m) * 100;
    return [Math.round(r), Math.round(g), Math.round(b), Math.round(w*100)];
}


function rgbwToHsv(r, g, b, w) {
    // Find the maximum RGB component
    let max = Math.max(r, g, b);

    // Calculate value (V)
    let v = max;

    // Calculate saturation (S)
    let s = (v === 0) ? 0 : (v - Math.min(r, g, b)) / v;

    // Calculate hue (H)
    let h;
    if (s === 0) {
        h = 0;  // Hue is undefined for a grayscale color (saturation = 0)
    } else {
        if (v === r) {
            h = 60 * ((g - b) / (max - Math.min(r, g, b)));
        } else if (v === g) {
            h = 60 * (2 + (b - r) / (max - Math.min(r, g, b)));
        } else {
            h = 60 * (4 + (r - g) / (max - Math.min(r, g, b)));
        }

        h = (h + 360) % 360;  // Ensure hue is in the range [0, 360)
    }

    return { h, s, v };
}


module.exports = { hsvToRgb , rgbwToHsv};