function rgbToXy(red, green, blue) {
    let r = red / 255;
    let g = green / 255;
    let b = blue / 255;

    // Gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / (1.055), 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / (1.055), 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / (1.055), 2.4) : b / 12.92;

    const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
    const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
    const Z = r * 0.000088 + g * 0.072310 + b * 0.986039;

    const x = X / (X + Y + Z);
    const y = Y / (X + Y + Z);

    return [x || 0, y || 0]; // falls durch 0 geteilt wird
}

function rgbToXyFromHex(hexstring) {
    const r = parseInt(hexstring.slice(1, 3), 16);
    const g = parseInt(hexstring.slice(3, 5), 16);
    const b = parseInt(hexstring.slice(5, 7), 16);
    return rgbToXy(r, g, b);
}

module.exports = {
    rgbToXy,
    rgbToXyFromHex
};