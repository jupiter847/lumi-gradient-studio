import { chooseTextColor, gradientSVG, sanitizeConfig } from './gradient.js';

export const DEFAULT_POSTER = Object.freeze({
  title: 'Make room\nfor your ideas.',
  subtitle: 'A little space for something extraordinary.',
  label: 'NOTE TO SELF',
  font: 'modern',
  align: 'center',
  textColor: 'auto',
  size: 100,
  material: 'glass',
  layout: 'poster',
});

const choices = {
  font: ['modern', 'editorial', 'mono'],
  align: ['left', 'center'],
  textColor: ['auto', 'dark', 'light'],
  material: ['glass', 'chrome', 'pearl', 'none'],
  layout: ['poster', 'quote', 'blank'],
};

function cleanText(value, fallback, limit) {
  if (typeof value !== 'string') return fallback;
  // Canvas renders this as literal text; markup is never parsed or inserted into the DOM.
  const clean = value.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  return Array.from(clean).slice(0, limit).join('');
}

/** Restore a composition from browser-local data without accepting arbitrary styles. */
export function sanitizePoster(raw = {}) {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result = {
    title: cleanText(value.title, DEFAULT_POSTER.title, 100),
    subtitle: cleanText(value.subtitle, DEFAULT_POSTER.subtitle, 120),
    label: cleanText(value.label, DEFAULT_POSTER.label, 32),
  };
  for (const [key, allowed] of Object.entries(choices)) result[key] = allowed.includes(value[key]) ? value[key] : DEFAULT_POSTER[key];
  const numericSize = typeof value.size === 'number' || (typeof value.size === 'string' && value.size.trim() !== '') ? Number(value.size) : NaN;
  result.size = Number.isFinite(numericSize) ? Math.min(140, Math.max(70, numericSize)) : DEFAULT_POSTER.size;
  return result;
}

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const graphemes = text => segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);

/** Wrap plain text, preserving explicit line breaks and splitting long words safely. */
export function layoutText(text, measure, maxWidth) {
  if (typeof text !== 'string' || typeof measure !== 'function') throw new TypeError('Text and a measurement function are required.');
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) throw new RangeError('Text width must be positive.');
  if (!text.trim()) return [];
  const lines = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    const words = paragraph.trim().split(/\s+/u).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      if (measure(word) <= maxWidth) { line = word; continue; }
      // Keep emoji sequences and combining marks intact when wrapping a long token.
      for (const glyph of graphemes(word)) {
        if (line && measure(line + glyph) > maxWidth) { lines.push(line); line = ''; }
        line += glyph;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

const FONT_STYLES = {
  modern: { family: '"DM Sans", Arial, sans-serif', weight: '700', style: '' },
  editorial: { family: 'Georgia, "Times New Roman", serif', weight: '400', style: 'italic ' },
  mono: { family: '"Courier New", Courier, monospace', weight: '700', style: '' },
};
const labelFamily = '"DM Sans", Arial, sans-serif';
const backgroundCache = new Map();

async function backgroundImage(config, width, height) {
  const key = JSON.stringify([config, width, height]);
  if (backgroundCache.has(key)) return backgroundCache.get(key);
  const loading = (async () => {
    const url = URL.createObjectURL(new Blob([gradientSVG(config, width, height)], { type: 'image/svg+xml' }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('The artwork background could not be rendered. Please try again.'));
        image.src = url;
      });
      return image;
    } finally { URL.revokeObjectURL(url); }
  })();
  backgroundCache.set(key, loading);
  if (backgroundCache.size > 4) backgroundCache.delete(backgroundCache.keys().next().value);
  try { return await loading; } catch (error) { backgroundCache.delete(key); throw error; }
}

function fontString(font, size) {
  return `${font.style}${font.weight} ${size}px ${font.family}`;
}

function fitText(context, text, font, initialSize, maxWidth, maxHeight, lineSpacing = 1.08) {
  if (!text.trim()) return { lines: [], size: initialSize, lineHeight: initialSize * lineSpacing, height: 0 };
  let size = initialSize;
  let lines;
  for (let attempt = 0; attempt < 100; attempt++) {
    context.font = fontString(font, size);
    lines = layoutText(text, line => context.measureText(line).width, maxWidth);
    const width = Math.max(0, ...lines.map(line => context.measureText(line).width));
    const height = lines.length * size * lineSpacing;
    if (width <= maxWidth + .01 && height <= maxHeight + .01) return { lines, size, lineHeight: size * lineSpacing, height };
    // Shrink every line together; never crop, truncate, or silently remove the user's words.
    const scale = Math.min(.94, maxWidth / Math.max(width, 1), Math.sqrt(maxHeight / Math.max(height, 1)));
    size = Math.max(.25, size * Math.max(.45, scale));
  }
  return { lines, size, lineHeight: size * lineSpacing, height: lines.length * size * lineSpacing };
}

function drawLines(context, fitted, font, x, top, color, align) {
  context.font = fontString(font, fitted.size);
  context.textAlign = align;
  context.textBaseline = 'top';
  context.fillStyle = color;
  fitted.lines.forEach((line, index) => context.fillText(line, x, top + index * fitted.lineHeight));
}

function drawStar(context, x, y, size, color) {
  context.fillStyle = color;
  context.beginPath();
  const points = [[0,-1],[.23,-.23],[1,0],[.23,.23],[0,1],[-.23,.23],[-1,0],[-.23,-.23]];
  points.forEach(([px,py], index) => index ? context.lineTo(x+px*size,y+py*size) : context.moveTo(x+px*size,y+py*size));
  context.closePath();
  context.fill();
}

/** Render the exact static composition used by both the live preview and PNG export. */
export async function renderPoster(rawConfig, rawPoster, width = 1600, height = 1000) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096) {
    throw new RangeError('Artwork dimensions must be integers from 1 to 4096.');
  }
  const config = sanitizeConfig(rawConfig);
  const poster = sanitizePoster(rawPoster);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Artwork rendering is unavailable in this browser.');
  const image = await backgroundImage(config, width, height);
  context.drawImage(image, 0, 0, width, height);
  if (poster.layout === 'blank') return canvas;
  if (document.fonts) {
    await document.fonts.ready;
    // Canvas text can use a weight not yet requested by the surrounding interface.
    // Load that face before measuring so preview and downloaded text wrap identically.
    try { await Promise.all([
      document.fonts.load(fontString(FONT_STYLES[poster.font],20),poster.title || 'Lumi'),
      document.fonts.load('600 16px "DM Sans"',poster.label || 'Lumi'),
    ]); } catch { /* System fallbacks keep the artwork usable without remote fonts. */ }
  }

  const shorter = Math.min(width, height);
  const ratio = width / height;
  const portrait = ratio < .8;
  const landscape = ratio > 1.25;
  const margin = width * (landscape ? .075 : .085);
  const safeWidth = width - margin * 2;
  const color = poster.textColor === 'light' ? '#FCFFFF' : poster.textColor === 'dark' ? '#14364B' : chooseTextColor(config.colors);
  const lightText = color.toLowerCase() === '#ffffff' || color === '#FCFFFF';

  // A soft, broad highlight holds the composition together without a card or watermark.
  context.save();
  const halo = context.createRadialGradient(width*.5,height*.38,0,width*.5,height*.38,shorter*.63);
  halo.addColorStop(0, lightText ? 'rgba(12,23,50,.05)' : 'rgba(252,255,255,.16)');
  halo.addColorStop(1, 'rgba(252,255,255,0)');
  context.fillStyle = halo;
  context.fillRect(0,0,width,height);
  context.restore();

  const quote = poster.layout === 'quote';
  let objectSize, objectX, objectY;
  if (quote) {
    objectSize = Math.min(width*.52,height*.44);
    objectX = poster.align === 'center' ? width*.5 : width*.72;
    objectY = height*(portrait ? .28 : .29);
  } else {
    objectSize = Math.min(width*(portrait ? .94 : .76), height*(portrait ? .5 : .68));
    objectX = width*.5;
    objectY = height*(portrait ? .38 : .395);
  }
  if (poster.material !== 'none') {
    const { renderSculpture } = await import('./sculpture.js');
    const sculpture = await renderSculpture({ material: poster.material, size: Math.min(1024, Math.max(256, Math.ceil(objectSize))) });
    context.save();
    context.shadowColor = lightText ? 'rgba(4,9,35,.2)' : 'rgba(18,65,91,.13)';
    context.shadowBlur = shorter*.035;
    context.shadowOffsetY = shorter*.025;
    context.drawImage(sculpture,objectX-objectSize/2,objectY-objectSize/2,objectSize,objectSize);
    context.restore();
  }

  const labelSize = Math.max(1,shorter*.017);
  const labelTop = height*(portrait ? .072 : .075);
  context.save();
  context.globalAlpha = .78;
  const labelFont = { family: labelFamily, weight: '600', style: '' };
  const label = fitText(context, poster.label.toUpperCase().replace(/\n/g,' '), labelFont, labelSize, safeWidth*.8, labelSize*2.5);
  drawLines(context,label,labelFont,margin,labelTop,color,'left');
  if (poster.label.trim()) drawStar(context,width-margin-labelSize*.5,labelTop+labelSize*.55,labelSize*.65,color);
  context.restore();

  const titleFont = FONT_STYLES[poster.font];
  const titleInitial = shorter*(quote ? (landscape ? .105 : .125) : (landscape ? .085 : .10))*poster.size/100;
  const titleTop = height*(quote ? (portrait ? .53 : .50) : (portrait ? .67 : .68));
  const titleBottom = height*(portrait ? .87 : .90);
  const title = fitText(context,poster.title,titleFont,titleInitial,safeWidth,titleBottom-titleTop,poster.font==='editorial' ? 1.04 : 1.08);
  const titleX = poster.align === 'center' ? width/2 : margin;
  context.save();
  context.shadowColor = lightText ? 'rgba(4,20,45,.13)' : 'rgba(252,255,255,.2)';
  context.shadowBlur = shorter*.005;
  context.shadowOffsetY = shorter*.001;
  drawLines(context,title,titleFont,titleX,titleTop,color,poster.align);
  context.restore();

  if (poster.subtitle.trim()) {
    const captionSize = shorter*(landscape ? .021 : .023);
    const captionFont = { family: labelFamily, weight: '400', style: '' };
    const caption = fitText(context,poster.subtitle,captionFont,captionSize,safeWidth,height*.058,1.35);
    const captionTop = Math.max(titleTop+title.height+height*.025,height*.945-caption.height);
    context.save();
    context.globalAlpha = .78;
    drawLines(context,caption,captionFont,titleX,captionTop,color,poster.align);
    context.restore();
  }
  return canvas;
}
