/* Tumblr Tone — filter recipes.
 *
 * Every recipe is an original approximation of a look, built from:
 *   r, g, b   tone curves: output at input [0, 64, 128, 192, 255]
 *   sat, con, bri, temp, tint   -1 … 1
 *   fade      0 … 1   lifts the blacks into a milky matte
 *   sh, hi    colour pushed into the shadows / highlights (split toning)
 *   fx        built-in effects, 0 … 1 (added on top of your own sliders)
 */
(function () {
  "use strict";

  const N = [0, 64, 128, 192, 255];

  const GROUPS = [
    { id: "tumblr", name: "Tumblr" },
    { id: "insta", name: "Insta '12" },
    { id: "digicam", name: "Digicam" },
    { id: "film", name: "Film" },
    { id: "bw", name: "B&W" }
  ];

  const P = (o) => Object.assign({
    r: N, g: N, b: N,
    sat: 0, con: 0, bri: 0, temp: 0, tint: 0, fade: 0,
    sh: [0, 0, 0], hi: [0, 0, 0], mono: false,
    fx: {}
  }, o);

  const FILTERS = [
    P({ id: "none", name: "Original", group: "all", blurb: "Just you, untouched." }),

    // ---------- TUMBLR ----------
    P({ id: "2014", name: "2014", group: "tumblr", blurb: "Soft grunge, milky blacks, a pink glow in the highlights. Pastel blog era.",
      r: [10, 72, 140, 204, 252], g: [6, 66, 130, 194, 246], b: [22, 78, 130, 184, 236],
      sat: -0.15, con: -0.05, bri: 0.03, fade: 0.55, sh: [-0.02, 0.01, 0.06], hi: [0.06, 0.01, 0.02],
      fx: { grain: 0.18, vig: 0.22, glow: 0.12 } }),
    P({ id: "bleach", name: "Bleach Bypass", group: "tumblr", blurb: "Silver left in the print: punchy contrast, drained colour, steely shadows.",
      r: [0, 50, 128, 206, 255], g: [0, 52, 128, 204, 255], b: [4, 58, 132, 202, 250],
      sat: -0.55, con: 0.35, bri: -0.03, sh: [-0.02, 0, 0.03],
      fx: { grain: 0.15, vig: 0.3, sharp: 0.2 } }),
    P({ id: "pastel", name: "Pastel Daze", group: "tumblr", blurb: "Cotton-candy sky, lifted and dreamy.",
      r: [30, 90, 155, 214, 255], g: [26, 82, 145, 206, 252], b: [40, 96, 155, 210, 250],
      sat: -0.2, con: -0.2, bri: 0.06, fade: 0.4, hi: [0.05, 0, 0.05],
      fx: { glow: 0.3, grain: 0.08 } }),
    P({ id: "haunted", name: "Haunted", group: "tumblr", blurb: "Cold, dim and a little cursed. 3am webcam energy.",
      r: [9, 52, 116, 182, 238], g: [12, 60, 118, 176, 230], b: [24, 80, 142, 196, 246],
      sat: -0.4, con: 0.14, bri: -0.1, fade: 0.2,
      fx: { grain: 0.4, vig: 0.45, dust: 0.25 } }),
    P({ id: "pixie", name: "Purple Pixie", group: "tumblr", blurb: "Lavender wash with violet shadows.",
      r: [17, 75, 143, 205, 255], g: [5, 57, 119, 184, 241], b: [32, 92, 156, 212, 255],
      sat: -0.08, con: 0.06, fade: 0.25, sh: [0.03, -0.02, 0.07],
      fx: { grain: 0.15, vig: 0.2, glow: 0.15 } }),
    P({ id: "dreamy", name: "Daydream", group: "tumblr", blurb: "Hazy bloom, warm skin, soft focus.",
      r: [20, 86, 152, 212, 255], g: [12, 74, 140, 204, 252], b: [16, 72, 132, 194, 244],
      sat: -0.05, con: -0.15, bri: 0.05, fade: 0.3,
      fx: { glow: 0.55, hal: 0.15, grain: 0.1, vig: 0.15 } }),
    P({ id: "nuke", name: "Nuke", group: "tumblr", blurb: "Everything turned up way too loud.",
      r: [0, 46, 134, 220, 255], g: [0, 48, 130, 212, 255], b: [0, 54, 138, 212, 255],
      sat: 0.45, con: 0.35, bri: -0.04,
      fx: { grain: 0.2, vig: 0.3, ca: 0.25 } }),

    // ---------- INSTA '12 ----------
    P({ id: "amaro", name: "Amaro", group: "insta", blurb: "Bright centre, airy blue lift, rich colour.",
      r: [12, 76, 146, 210, 255], g: [12, 76, 144, 208, 255], b: [40, 96, 154, 210, 250],
      sat: 0.15, con: 0.08, bri: 0.02, fade: 0.2,
      fx: { vig: 0.38, flash: 0.15 } }),
    P({ id: "nashville", name: "Nashville", group: "insta", blurb: "Peachy-pink haze with navy-lifted shadows.",
      r: [44, 98, 162, 218, 255], g: [22, 76, 136, 196, 245], b: [64, 96, 130, 170, 214],
      sat: 0.05, con: 0.12, bri: 0.04, hi: [0.04, 0.0, 0.02],
      fx: { grain: 0.05 } }),
    P({ id: "valencia", name: "Valencia", group: "insta", blurb: "Warm and faded, like a postcard left in the sun.",
      r: [22, 84, 150, 212, 255], g: [12, 74, 136, 198, 250], b: [18, 66, 118, 176, 230],
      sat: -0.06, con: -0.05, fade: 0.22,
      fx: { vig: 0.1 } }),
    P({ id: "1977", name: "1977", group: "insta", blurb: "Rosy, washed out and very retro.",
      r: [44, 108, 168, 222, 255], g: [22, 72, 130, 190, 240], b: [44, 84, 136, 190, 240],
      sat: -0.12, con: -0.05, fade: 0.3,
      fx: { grain: 0.12, vig: 0.15 } }),
    P({ id: "xpro", name: "X-Pro II", group: "insta", blurb: "Cross-processed: golden highlights, cyan shadows, deep vignette.",
      r: [0, 48, 136, 218, 255], g: [0, 56, 132, 206, 250], b: [44, 78, 124, 168, 210],
      sat: 0.2, con: 0.28,
      fx: { vig: 0.55 } }),
    P({ id: "lofi", name: "Lo-Fi", group: "insta", blurb: "Saturated, contrasty and shadowy.",
      r: [0, 44, 132, 214, 255], g: [0, 44, 130, 212, 255], b: [0, 46, 128, 208, 255],
      sat: 0.35, con: 0.3,
      fx: { vig: 0.4 } }),
    P({ id: "hefe", name: "Hefe", group: "insta", blurb: "Warm gold and strong contrast.",
      r: [0, 58, 140, 214, 255], g: [0, 52, 130, 204, 250], b: [0, 44, 116, 186, 236],
      sat: 0.25, con: 0.25,
      fx: { vig: 0.42 } }),
    P({ id: "rise", name: "Rise", group: "insta", blurb: "Golden-hour glow, soft and flattering.",
      r: [30, 92, 156, 214, 255], g: [22, 82, 144, 204, 250], b: [16, 70, 128, 190, 238],
      sat: 0.1, con: -0.12, bri: 0.05, fade: 0.1,
      fx: { glow: 0.25, vig: 0.12 } }),
    P({ id: "hudson", name: "Hudson", group: "insta", blurb: "Icy blue, crisp and cool.",
      r: [0, 56, 124, 194, 250], g: [6, 64, 132, 200, 255], b: [30, 90, 156, 214, 255],
      sat: -0.05, con: 0.18, bri: 0.03,
      fx: { vig: 0.32 } }),
    P({ id: "earlybird", name: "Earlybird", group: "insta", blurb: "Sepia morning, faded and warm.",
      r: [36, 92, 154, 210, 250], g: [24, 76, 134, 190, 234], b: [18, 60, 108, 160, 206],
      sat: -0.25, con: 0.05, fade: 0.2,
      fx: { vig: 0.45 } }),
    P({ id: "sutro", name: "Sutro", group: "insta", blurb: "Smoky purple-brown with burnt edges.",
      r: [10, 56, 120, 186, 238], g: [4, 46, 104, 168, 224], b: [14, 56, 112, 170, 222],
      sat: -0.3, con: 0.2, bri: -0.06,
      fx: { vig: 0.65 } }),
    P({ id: "toaster", name: "Toaster", group: "insta", blurb: "Burnt orange glow in the middle, dark all around.",
      r: [40, 104, 168, 222, 255], g: [10, 64, 126, 188, 236], b: [0, 46, 104, 164, 214],
      sat: 0.15, con: 0.1, bri: 0.04,
      fx: { vig: 0.6, flash: 0.25 } }),
    P({ id: "kelvin", name: "Kelvin", group: "insta", blurb: "Very warm. Orange-sherbet everything.",
      r: [36, 106, 176, 230, 255], g: [12, 70, 136, 198, 246], b: [0, 36, 92, 150, 206],
      sat: 0.2 }),
    P({ id: "walden", name: "Walden", group: "insta", blurb: "Bright, yellow-tinged and airy.",
      r: [26, 90, 156, 214, 255], g: [24, 88, 152, 210, 255], b: [40, 84, 132, 186, 236],
      sat: -0.08, con: -0.1, bri: 0.06, fade: 0.15 }),
    P({ id: "mayfair", name: "Mayfair", group: "insta", blurb: "Warm pink centre, gentle vignette.",
      r: [8, 72, 142, 208, 255], g: [4, 64, 130, 196, 250], b: [10, 66, 130, 194, 246],
      sat: 0.12, con: 0.1, hi: [0.04, 0, 0.02],
      fx: { vig: 0.25, flash: 0.12 } }),
    P({ id: "sierra", name: "Sierra", group: "insta", blurb: "Faded, soft and a touch warm.",
      r: [30, 88, 150, 208, 250], g: [24, 82, 142, 200, 244], b: [26, 78, 134, 190, 234],
      sat: -0.12, con: -0.15, fade: 0.25,
      fx: { vig: 0.2 } }),
    P({ id: "brannan", name: "Brannan", group: "insta", blurb: "Metallic and moody, high contrast, low colour.",
      r: [10, 58, 134, 210, 250], g: [8, 60, 132, 204, 246], b: [16, 62, 124, 188, 232],
      sat: -0.35, con: 0.35 }),

    // ---------- DIGICAM ----------
    P({ id: "digi07", name: "Digicam '07", group: "digicam", blurb: "Point-and-shoot at the party: cool cast, crunchy edges, blown flash.",
      r: [0, 60, 132, 210, 255], g: [0, 64, 136, 212, 255], b: [8, 74, 148, 220, 255],
      sat: 0.18, con: 0.12, bri: 0.0, temp: -0.18,
      fx: { sharp: 0.55, ca: 0.25, flash: 0.35, grain: 0.1 } }),
    P({ id: "ccd", name: "CCD", group: "digicam", blurb: "Old sensor bloom and that slightly green daylight.",
      r: [0, 62, 130, 204, 255], g: [2, 68, 136, 208, 255], b: [0, 60, 126, 200, 250],
      sat: 0.1, con: 0.12, tint: 0.08,
      fx: { glow: 0.3, sharp: 0.4, ca: 0.15 } }),
    P({ id: "webcam", name: "Webcam", group: "digicam", blurb: "Low-res, noisy, slightly purple. MySpace profile pic.",
      r: [10, 66, 128, 194, 248], g: [4, 58, 122, 188, 244], b: [16, 72, 136, 198, 250],
      sat: -0.1, con: 0.1, bri: 0.04,
      fx: { pix: 0.35, grain: 0.3, ca: 0.3 } }),
    P({ id: "night", name: "Night Out", group: "digicam", blurb: "Direct flash on a dark night: bright faces, black background.",
      r: [0, 40, 124, 214, 255], g: [0, 40, 122, 210, 255], b: [0, 46, 126, 206, 250],
      sat: 0.15, con: 0.3, bri: -0.05,
      fx: { flash: 0.6, vig: 0.5, sharp: 0.3, grain: 0.15 } }),

    // ---------- FILM ----------
    P({ id: "disposable", name: "Disposable", group: "film", blurb: "Throwaway camera on holiday: warm, grainy, light leaking in.",
      r: [16, 82, 152, 214, 255], g: [8, 70, 136, 200, 248], b: [10, 60, 118, 180, 232],
      sat: 0.12, con: 0.08, fade: 0.12,
      fx: { grain: 0.4, vig: 0.35, leak: 0.35, flash: 0.15 } }),
    P({ id: "gold", name: "Gold 200", group: "film", blurb: "Buttery yellow daylight, honey skin.",
      r: [12, 78, 148, 212, 255], g: [8, 72, 140, 204, 250], b: [8, 58, 118, 180, 232],
      sat: 0.15, con: 0.06, fade: 0.08,
      fx: { grain: 0.25 } }),
    P({ id: "tungsten", name: "Tungsten 800", group: "film", blurb: "Night-time movie film: teal cast and red halos around lights.",
      r: [4, 60, 128, 200, 252], g: [8, 68, 136, 204, 252], b: [24, 86, 156, 220, 255],
      sat: 0.05, con: 0.1, fade: 0.08,
      fx: { hal: 0.7, glow: 0.2, grain: 0.25 } }),
    P({ id: "green", name: "Superia", group: "film", blurb: "Drugstore film with minty greens in the shadows.",
      r: [8, 66, 134, 204, 255], g: [16, 76, 140, 206, 255], b: [12, 68, 132, 198, 248],
      sat: 0.05, con: 0.08, sh: [-0.02, 0.04, 0.01], fade: 0.12,
      fx: { grain: 0.25 } }),
    P({ id: "portrait", name: "Portrait 400", group: "film", blurb: "Gentle pastel skin and creamy highlights.",
      r: [16, 80, 146, 210, 255], g: [12, 74, 140, 204, 252], b: [16, 72, 134, 196, 246],
      sat: -0.12, con: -0.12, fade: 0.15, hi: [0.02, 0.01, 0],
      fx: { grain: 0.18 } }),
    P({ id: "expired", name: "Expired", group: "film", blurb: "Found in a drawer. Shifted colours, fog and dust.",
      r: [40, 96, 152, 206, 245], g: [30, 82, 138, 192, 236], b: [50, 88, 130, 176, 220],
      sat: -0.2, con: -0.1, fade: 0.35, tint: -0.1,
      fx: { grain: 0.45, dust: 0.45, leak: 0.25, vig: 0.3 } }),

    // ---------- B&W ----------
    P({ id: "moon", name: "Moon", group: "bw", blurb: "Silvery black and white, soft blacks.", mono: true,
      r: [12, 70, 132, 198, 252], g: [12, 70, 132, 198, 252], b: [12, 70, 132, 198, 252],
      con: 0.13, fx: { grain: 0.2, vig: 0.25 } }),
    P({ id: "inkwell", name: "Inkwell", group: "bw", blurb: "Classic mono with a bit of bite.", mono: true,
      con: 0.2, bri: 0.04 }),
    P({ id: "willow", name: "Willow", group: "bw", blurb: "Soft, pale mono with a violet whisper.", mono: true,
      r: [30, 86, 146, 206, 252], g: [26, 82, 142, 202, 248], b: [36, 92, 150, 208, 252],
      con: -0.1, fade: 0.2, fx: { vig: 0.2 } }),
    P({ id: "zine", name: "Zine", group: "bw", blurb: "Photocopied flyer: crushed blacks, grit everywhere.", mono: true,
      r: [0, 24, 120, 236, 255], g: [0, 24, 120, 236, 255], b: [0, 24, 120, 236, 255],
      con: 0.4, fx: { grain: 0.55, dust: 0.4, sharp: 0.4 } })
  ];

  window.TT_GROUPS = GROUPS;
  window.TT_FILTERS = FILTERS;
})();
