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
    { id: "cams", name: "Cameras" },
    { id: "roll", name: "Roll" },
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


    // ---------- CAMERAS (a look + a body) ----------
    P({ id: "4s", name: "4S", group: "cams", cam: "phone", blurb: "2011 phone camera: warm mids, highlights that blow out soft, a little noise.",
      r: [6, 70, 140, 212, 255], g: [4, 66, 136, 206, 252], b: [0, 54, 118, 186, 236],
      sat: 0.05, con: 0.05, bri: 0.03, temp: 0.12, fade: 0.05,
      fx: { old: 0.9, grain: 0.06, vig: 0.32, glow: 0.18 } }),
    P({ id: "5c", name: "5C", group: "cams", cam: "phone", blurb: "Candy phone, 2013: cooler, punchy and over-sharpened.",
      r: [0, 60, 132, 206, 255], g: [2, 64, 134, 208, 255], b: [8, 72, 142, 214, 255],
      sat: 0.18, con: 0.15, temp: -0.06,
      fx: { old: 0.8, sharp: 0.15, vig: 0.22, glow: 0.08 } }),
    P({ id: "ix", name: "IX", group: "cams", cam: "digicam", blurb: "2004 CCD compact: blue cast, harsh flash, crunchy edges.",
      r: [0, 58, 130, 210, 255], g: [4, 66, 138, 214, 255], b: [16, 82, 152, 222, 255],
      sat: 0.1, con: 0.12, bri: 0.04, temp: -0.12,
      fx: { old: 0.7, flash: 0.35, ca: 0.15, vig: 0.2 } }),
    P({ id: "fj", name: "FJ", group: "cams", cam: "digicam", blurb: "Teal-green compact with rosy skin. Point, shoot, 2006.",
      r: [4, 66, 140, 210, 255], g: [10, 72, 136, 204, 250], b: [8, 68, 130, 196, 244],
      sat: 0.08, con: 0.1, sh: [-0.03, 0.03, 0.02], hi: [0.04, 0, 0.02],
      fx: { old: 0.65, vig: 0.22 } }),
    P({ id: "cine07", name: "Cine 07", group: "cams", cam: "film", blurb: "Motion-picture film: soft contrast, teal shadows, warm skin, red halos.",
      r: [14, 70, 136, 206, 250], g: [14, 70, 134, 200, 244], b: [22, 76, 130, 190, 232],
      sat: -0.05, con: -0.08, fade: 0.1, sh: [-0.03, 0.01, 0.03], hi: [0.04, 0.02, -0.02],
      fx: { hal: 0.35, grain: 0.3, glow: 0.1, vig: 0.15 } }),
    P({ id: "kh", name: "KH Webcam", group: "cams", cam: "digicam", blurb: "2009 laptop webcam: green smear, chunky pixels.",
      r: [10, 62, 124, 196, 250], g: [16, 74, 140, 210, 255], b: [8, 56, 116, 186, 240],
      sat: -0.15, con: 0.1, bri: -0.04,
      fx: { old: 1, pix: 0.35, ca: 0.25, vig: 0.35 } }),

    // ---------- THE ROLL (Bleach Bypass-style picks) ----------
    P({ id: "kiev", name: "Kiev", group: "roll", blurb: "Old rangefinder film: muted, yellow-green, heavy corners.",
      r: [20, 74, 136, 200, 248], g: [18, 74, 138, 200, 244], b: [10, 56, 112, 170, 214],
      sat: -0.3, con: 0.05, fade: 0.2, sh: [0, 0.02, -0.01],
      fx: { grain: 0.5, vig: 0.5, dust: 0.2 } }),
    P({ id: "cash", name: "Cash", group: "roll", blurb: "Money-green flash photo, crisp and contrasty.",
      r: [0, 52, 126, 206, 255], g: [4, 62, 138, 214, 255], b: [0, 50, 122, 196, 246],
      sat: 0.1, con: 0.25, sh: [-0.02, 0.04, 0],
      fx: { flash: 0.3, sharp: 0.3, vig: 0.25 } }),
    P({ id: "pandora", name: "Pandora", group: "roll", blurb: "Violet-pink haze with a dreamy glow.",
      r: [20, 82, 150, 214, 255], g: [8, 62, 128, 196, 248], b: [30, 88, 154, 214, 255],
      sat: -0.05, con: -0.05, fade: 0.2, hi: [0.05, 0, 0.04],
      fx: { glow: 0.45, grain: 0.12, vig: 0.2 } }),
    P({ id: "sepia", name: "Sepia", group: "roll", mono: true, blurb: "Brown-toned print from grandma's album.",
      r: [20, 84, 152, 214, 250], g: [12, 68, 130, 190, 232], b: [4, 48, 100, 152, 196],
      fx: { grain: 0.3, vig: 0.35, dust: 0.2 } }),
    P({ id: "fresh", name: "Fresh", group: "roll", blurb: "Clean, bright and airy. Just a little nicer.",
      r: [10, 72, 142, 214, 255], g: [10, 74, 144, 216, 255], b: [14, 78, 146, 214, 255],
      sat: 0.1, con: 0.05, bri: 0.06,
      fx: { sharp: 0.15 } }),

    // ---------- TUMBLR ----------
    P({ id: "2014", name: "2014", group: "roll", blurb: "Soft grunge, milky blacks, a pink glow in the highlights. Pastel blog era.",
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
    P({ id: "nuke", name: "Nuke", group: "roll", blurb: "Everything turned up way too loud.",
      r: [0, 46, 134, 220, 255], g: [0, 48, 130, 212, 255], b: [0, 54, 138, 212, 255],
      sat: 0.45, con: 0.35, bri: -0.04,
      fx: { grain: 0.2, vig: 0.3, ca: 0.25 } }),

    // ---------- INSTA '12 ----------
    P({ id: "amaro", name: "Amaro", group: "roll", blurb: "Bright centre, airy blue lift, rich colour.",
      r: [12, 76, 146, 210, 255], g: [12, 76, 144, 208, 255], b: [40, 96, 154, 210, 250],
      sat: 0.15, con: 0.08, bri: 0.02, fade: 0.2,
      fx: { vig: 0.38, flash: 0.15 } }),
    P({ id: "nashville", name: "Nashville", group: "roll", blurb: "Peachy-pink haze with navy-lifted shadows.",
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
      fx: { old: 0.6, sharp: 0.55, ca: 0.25, flash: 0.35, grain: 0.1 } }),
    P({ id: "ccd", name: "CCD", group: "digicam", blurb: "Old sensor bloom and that slightly green daylight.",
      r: [0, 62, 130, 204, 255], g: [2, 68, 136, 208, 255], b: [0, 60, 126, 200, 250],
      sat: 0.1, con: 0.12, tint: 0.08,
      fx: { old: 0.6, glow: 0.3, sharp: 0.4, ca: 0.15 } }),
    P({ id: "webcam", name: "Webcam", group: "digicam", blurb: "Low-res, noisy, slightly purple. MySpace profile pic.",
      r: [10, 66, 128, 194, 248], g: [4, 58, 122, 188, 244], b: [16, 72, 136, 198, 250],
      sat: -0.1, con: 0.1, bri: 0.04,
      fx: { old: 0.85, pix: 0.35, grain: 0.3, ca: 0.3 } }),
    P({ id: "night", name: "Night Out", group: "digicam", blurb: "Direct flash on a dark night: bright faces, black background.",
      r: [0, 40, 124, 214, 255], g: [0, 40, 122, 210, 255], b: [0, 46, 126, 206, 250],
      sat: 0.15, con: 0.3, bri: -0.05,
      fx: { old: 0.7, flash: 0.6, vig: 0.5, sharp: 0.3, grain: 0.15 } }),

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


  // ---------- the roll, retuned against Bleach Bypass screenshots ----------
  const roll = (id, o) => {
    const i = FILTERS.findIndex((f) => f.id === id);
    const prev = i >= 0 ? FILTERS[i] : {};
    const f = P(Object.assign({ id, name: prev.name, group: "roll", blurb: prev.blurb }, o));
    if (i >= 0) FILTERS[i] = f; else FILTERS.push(f);
  };
  roll("nashville", { blurb: "Milky lifted blacks, peach highlights, teal in the shadows.",
    r: [38, 92, 152, 212, 250], g: [30, 80, 138, 198, 240], b: [52, 96, 140, 190, 228],
    sat: -0.05, con: -0.08, fade: 0.15, hi: [0.04, 0, -0.02], sh: [-0.03, 0, 0.04],
    fx: { vig: 0.45, old: 0.4 } });
  roll("kiev", { name: "Keef", blurb: "Punchy and warm: burnt-orange walls, cool blue clothes, deep shadows.",
    r: [6, 62, 140, 218, 255], g: [2, 50, 122, 198, 250], b: [0, 40, 108, 184, 240],
    sat: 0.25, con: 0.22, temp: 0.1, sh: [0, -0.01, 0.02],
    fx: { vig: 0.5, old: 0.35 } });
  roll("2014", { blurb: "Saturated warm pink, the 2014 Tumblr selfie.",
    r: [14, 74, 148, 220, 255], g: [6, 58, 126, 200, 250], b: [12, 58, 122, 194, 246],
    sat: 0.18, con: 0.12, tint: -0.15,
    fx: { vig: 0.45, old: 0.4, glow: 0.1 } });
  roll("amaro", { blurb: "Bright and lifted with a magenta wash.",
    r: [30, 92, 160, 220, 255], g: [20, 78, 142, 206, 250], b: [44, 100, 160, 220, 255],
    con: -0.05, bri: 0.04, tint: -0.3, fade: 0.12,
    fx: { vig: 0.4, old: 0.35 } });
  roll("nuke", { blurb: "Blown-out orange and gold, like the flash went off twice.",
    r: [40, 120, 200, 245, 255], g: [18, 84, 160, 220, 250], b: [0, 40, 100, 160, 210],
    sat: 0.2, con: -0.05, bri: 0.06, temp: 0.25,
    fx: { vig: 0.18, glow: 0.4, hal: 0.15, old: 0.4 } });
  roll("cash", { blurb: "Muted olive: yellow-green highlights, magenta-brown shadows.",
    r: [20, 70, 132, 196, 245], g: [14, 66, 134, 204, 250], b: [20, 58, 104, 160, 210],
    sat: -0.25, con: 0.1, sh: [0.04, -0.02, 0.04], hi: [0, 0.03, -0.04],
    fx: { vig: 0.5, old: 0.45 } });
  roll("pandora", { blurb: "Drained and matte with a cool green cast.",
    r: [22, 68, 124, 186, 236], g: [24, 72, 128, 188, 234], b: [24, 66, 116, 172, 220],
    sat: -0.4, con: 0.05, fade: 0.15, tint: 0.1,
    fx: { vig: 0.5, old: 0.5 } });
  roll("fresh", { name: "Phresh", blurb: "Clean, bright and airy. Just a little nicer.",
    r: [10, 72, 142, 214, 255], g: [10, 74, 144, 216, 255], b: [14, 78, 146, 214, 255],
    sat: 0.1, con: 0.05, bri: 0.06, fx: { sharp: 0.15, old: 0.25 } });

  // new ones
  roll("ghost", { name: "Ghost Cam", blurb: "Shrunk to 450px and blown back up: blurry, noisy, brown. The haunted upload.",
    r: [16, 70, 134, 196, 240], g: [12, 62, 124, 186, 232], b: [10, 54, 110, 168, 214],
    sat: -0.35, con: -0.04, bri: 0.07, fx: { res: 0.86, old: 1, vig: 0.45 } });
  roll("threeam", { name: "3am", blurb: "Purple webcam noise at 3am. Tiny file, big feelings.",
    r: [22, 70, 134, 198, 244], g: [16, 62, 126, 188, 236], b: [30, 80, 142, 202, 246],
    sat: 0.05, con: 0.12, tint: -0.08, fx: { res: 0.85, old: 1, vig: 0.45, ca: 0.2 } });
  roll("pinkroom", { name: "Pink Room", blurb: "Soft pastel pink with lavender shadows.",
    r: [26, 80, 148, 214, 255], g: [18, 70, 134, 200, 248], b: [30, 82, 144, 206, 250],
    sat: -0.12, con: -0.12, tint: -0.15, fade: 0.1, fx: { vig: 0.25, old: 0.25 } });
  roll("sugar", { name: "Sugar", blurb: "Bright, airy pastel. Cotton-candy soft.",
    r: [34, 96, 166, 226, 255], g: [28, 88, 156, 218, 255], b: [40, 98, 162, 222, 255],
    sat: -0.08, con: -0.15, bri: 0.04, fx: { vig: 0.1, old: 0.2, glow: 0.15 } });
  roll("afterparty", { name: "Afterparty", blurb: "Cross-processed: purple shadows, minty highlights, crushed blacks.",
    r: [0, 40, 118, 206, 255], g: [10, 58, 134, 214, 250], b: [40, 96, 160, 210, 240],
    sat: 0.15, con: 0.3, sh: [0.04, -0.03, 0.08], hi: [-0.02, 0.04, 0],
    fx: { vig: 0.5, old: 0.5 } });
  // the Tumblr "Haunted" gets the shrink too
  { const h = FILTERS.find((f) => f.id === "haunted"); h.fx = Object.assign({}, h.fx, { res: 0.6, old: 0.8 }); }

  // Curves fitted pixel-by-pixel from Bleach Bypass screenshots of the same photo.
  const FIT = {"nashville": {"r": [0, 63, 170, 232, 251], "g": [32, 97, 166, 204, 221], "b": [59, 106, 154, 178, 195], "sat": 0.05}, "kiev": {"r": [13, 70, 168, 244, 255], "g": [13, 60, 165, 229, 255], "b": [0, 45, 134, 226, 255], "sat": 0.08}, "2014": {"r": [30, 86, 176, 253, 255], "g": [27, 82, 162, 225, 255], "b": [30, 72, 149, 238, 255], "sat": 0.07}, "amaro": {"r": [20, 85, 178, 237, 255], "g": [22, 78, 162, 220, 248], "b": [33, 90, 169, 224, 252], "sat": 0.08}, "nuke": {"r": [66, 152, 217, 255, 255], "g": [55, 102, 166, 237, 255], "b": [84, 92, 134, 193, 233], "sat": 0.06}, "cash": {"r": [34, 85, 145, 201, 255], "g": [5, 61, 129, 190, 253], "b": [29, 70, 117, 155, 205], "sat": -0.01}, "pandora": {"r": [17, 70, 143, 224, 255], "g": [33, 89, 170, 222, 255], "b": [10, 74, 145, 202, 255], "sat": -0.01}, "sugar": {"r": [36, 95, 154, 210, 242], "g": [34, 88, 146, 199, 241], "b": [22, 82, 147, 213, 252], "sat": 0.07}, "afterparty": {"r": [1, 58, 127, 205, 232], "g": [1, 52, 163, 224, 250], "b": [64, 109, 183, 225, 255], "sat": 0.14}};
  Object.entries(FIT).forEach(([id, c]) => {
    const f = FILTERS.find((x) => x.id === id); if (!f) return;
    Object.assign(f, { r: c.r, g: c.g, b: c.b, sat: c.sat, con: 0, bri: 0, temp: 0, tint: 0, fade: 0, sh: [0, 0, 0], hi: [0, 0, 0] });
  });
  // Every roll look is a digicam look: give it the old-sensor texture too.
  FILTERS.forEach((f) => { if ((f.group === "roll") && f.fx.old == null) f.fx.old = 0.5; });

  window.TT_GROUPS = GROUPS;
  window.TT_FILTERS = FILTERS;
})();
