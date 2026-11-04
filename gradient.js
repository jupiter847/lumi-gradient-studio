// Framework-free colour and export utilities for Lumi.
// The display name and source colours belong to this fictional demo.
export const PRESETS = Object.freeze([
  { id: 'skyline', name: 'Skyline', colors: ['#0593C6', '#FCFFFF', '#D83995'], angle: 135, type: 'linear', tag: 'Blue skies. Pink dreams.' },
  { id: 'aurora', name: 'Aurora', colors: ['#78E6D4', '#8FADFA', '#DFA4F2'], angle: 135, type: 'linear', tag: 'Soft & electric' },
  { id: 'midnight', name: 'Midnight', colors: ['#101B3B', '#4C46B9', '#A66CDA'], angle: 145, type: 'linear', tag: 'Deep & dreamy' },
  { id: 'golden-hour', name: 'Golden hour', colors: ['#F7DC88', '#F6A17B', '#DF7D9C'], angle: 125, type: 'linear', tag: 'Sun-soaked' },
  { id: 'lagoon', name: 'Lagoon', colors: ['#45DCC5', '#50A8DF', '#7374E8'], angle: 140, type: 'linear', tag: 'Cool & clear' },
  { id: 'pearl', name: 'Pearl', colors: ['#F7E8EA', '#DCC9EE', '#A8C8E7'], angle: 135, type: 'linear', tag: 'Quiet & airy' },
  { id: 'ultraviolet', name: 'Ultraviolet', colors: ['#F48BB6', '#A46DEA', '#4E5AE7'], angle: 120, type: 'linear', tag: 'Bold & playful' },
  { id: 'bloom', name: 'Bloom', colors: ['#F4D6A5', '#EEA8B9', '#926DAD'], angle: 135, type: 'radial', tag: 'A little romantic' },
].map(preset => Object.freeze({ ...preset, colors: Object.freeze([...preset.colors]) })));

const DEFAULT_NOISE = 0.06;
const isNumeric = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));
const wrapAngle = angle => ((Number(angle) % 360) + 360) % 360;
const round = value => Number(value.toFixed(6));

/** Convert #rgb, rgb, #rrggbb or rrggbb to a six-digit uppercase hex colour. */
export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  let hex = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = [...hex].map(character => character.repeat(2)).join('');
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}

function checkedColors(colors) {
  if (!Array.isArray(colors) || colors.length !== 3) throw new TypeError('A gradient needs exactly three colour stops.');
  const normalized = colors.map(normalizeHex);
  if (normalized.some(color => color === null)) throw new TypeError('Use valid three- or six-digit hex colours.');
  return normalized;
}

/** Restore browser-local data without trusting malformed colour/CSS strings. */
export function sanitizeConfig(raw = {}) {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  let colors;
  try { colors = checkedColors(value.colors); } catch { colors = [...PRESETS[0].colors]; }
  return {
    colors,
    angle: isNumeric(value.angle) ? wrapAngle(value.angle) : PRESETS[0].angle,
    type: value.type === 'radial' || value.type === 'linear' ? value.type : PRESETS[0].type,
    noise: isNumeric(value.noise) ? Math.min(0.2, Math.max(0, Number(value.noise))) : DEFAULT_NOISE,
  };
}

/** CSS background image, with three evenly placed stops. Grain is a separate layer. */
export function gradientCSS({ colors, angle = 135, type = 'linear' } = {}) {
  const normalized = checkedColors(colors);
  if (!isNumeric(angle)) throw new TypeError('Gradient angle must be a finite number.');
  const stops = normalized.map((color, index) => `${color} ${index * 50}%`).join(', ');
  if (type === 'radial') return `radial-gradient(ellipse at center, ${stops})`;
  if (type !== 'linear') throw new TypeError('Gradient type must be linear or radial.');
  return `linear-gradient(${round(wrapAngle(angle))}deg, ${stops})`;
}

function luminance(hex) {
  const color = normalizeHex(hex);
  if (!color) throw new TypeError('Contrast requires valid hex colours.');
  const channels = color.slice(1).match(/../g).map(pair => {
    const srgb = parseInt(pair, 16) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG relative-luminance contrast ratio, independent of text size. */
export function textContrast(hexA, hexB) {
  const first = luminance(hexA);
  const second = luminance(hexB);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** Select the text colour with the better minimum contrast across all three stops.
 * This is a preview aid, not an accessibility guarantee for every blended pixel.
 */
export function chooseTextColor(colors) {
  const normalized = checkedColors(colors);
  const whiteWorst = Math.min(...normalized.map(color => textContrast('#FFFFFF', color)));
  const inkWorst = Math.min(...normalized.map(color => textContrast('#10121A', color)));
  return whiteWorst > inkWorst ? '#ffffff' : '#10121a';
}

/** Export the same CSS-angle gradient as a self-contained, scalable SVG.
 * CSS measures 0deg upwards and 90deg to the right. The projection length here
 * matches CSS's farthest-corner gradient line for the selected export rectangle.
 */
export function gradientSVG(config, width = 1600, height = 1000) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192) {
    throw new RangeError('Export width and height must be integers from 1 to 8192.');
  }
  const colors = checkedColors(config?.colors);
  if (!isNumeric(config?.angle)) throw new TypeError('Gradient angle must be a finite number.');
  if (config?.type !== 'linear' && config?.type !== 'radial') throw new TypeError('Gradient type must be linear or radial.');
  const noise = isNumeric(config.noise) ? Math.min(0.2, Math.max(0, Number(config.noise))) : 0;
  const stops = colors.map((color, index) => `<stop offset="${index * 50}%" stop-color="${color}"/>`).join('');
  let gradient;
  if (config.type === 'linear') {
    const radians = wrapAngle(config.angle) * Math.PI / 180;
    const dx = Math.sin(radians);
    const dy = -Math.cos(radians);
    const length = Math.abs(width * dx) + Math.abs(height * dy);
    const x1 = round(width / 2 - dx * length / 2);
    const y1 = round(height / 2 - dy * length / 2);
    const x2 = round(width / 2 + dx * length / 2);
    const y2 = round(height / 2 + dy * length / 2);
    gradient = `<linearGradient id="lumi" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
  } else {
    const rx = round(width * Math.SQRT1_2);
    const ry = round(height * Math.SQRT1_2);
    gradient = `<radialGradient id="lumi" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${width / 2} ${height / 2}) scale(${rx} ${ry})">${stops}</radialGradient>`;
  }
  const grainDefinition = noise > 0 ? '<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>' : '';
  const grainLayer = noise > 0 ? `<rect width="100%" height="100%" filter="url(#grain)" opacity="${round(noise)}" style="mix-blend-mode:soft-light"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Lumi gradient</title><defs>${gradient}${grainDefinition}</defs><rect width="100%" height="100%" fill="url(#lumi)"/>${grainLayer}</svg>`;
}
