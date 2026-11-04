import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, normalizeHex, sanitizeConfig, gradientCSS, textContrast, chooseTextColor, gradientSVG } from './gradient.js';

const sample = { colors: ['#FFAD80', '#EE6DA6', '#8767E8'], angle: 135, type: 'linear', noise: 0 };

test('colour input accepts pasted shorthand while rejecting CSS and XML injection', () => {
  assert.equal(normalizeHex(' #aB3 '), '#AABB33');
  assert.equal(normalizeHex('abcdef'), '#ABCDEF');
  for (const invalid of ['red', '#12345', '#ffffffff', 'url(https://example.com)', '#abc"/>', '', null, 123]) {
    assert.equal(normalizeHex(invalid), null);
  }
  assert.throws(() => gradientCSS({ ...sample, colors: ['#fff', '#000', 'red'] }), TypeError);
  assert.throws(() => gradientSVG({ ...sample, colors: ['#fff', '#000', '"><script/>'] }), TypeError);
});

test('restored settings reject malformed values, wrap angle and clamp grain without sharing preset arrays', () => {
  const restored = sanitizeConfig({ colors: ['#123', '#abc', '#ff0'], angle: -450, noise: 7, type: 'radial' });
  assert.deepEqual(restored, { colors: ['#112233', '#AABBCC', '#FFFF00'], angle: 270, type: 'radial', noise: 0.2 });
  const fallback = sanitizeConfig({ colors: ['bad'], angle: Infinity, type: 'conic', noise: 'not a number' });
  assert.deepEqual(fallback.colors, [...PRESETS[0].colors]);
  assert.equal(fallback.angle, PRESETS[0].angle);
  assert.equal(fallback.type, 'linear');
  fallback.colors[0] = '#000000';
  assert.notEqual(PRESETS[0].colors[0], '#000000');
  assert.doesNotThrow(() => sanitizeConfig(null));
});

test('generated backgrounds preserve the chosen stop order and reject unsupported modes', () => {
  assert.equal(gradientCSS({ colors: ['#F00', '#0f0', '#00F'], angle: 450, type: 'linear' }), 'linear-gradient(90deg, #FF0000 0%, #00FF00 50%, #0000FF 100%)');
  assert.equal(gradientCSS({ ...sample, type: 'radial' }).startsWith('radial-gradient(ellipse at center,'), true);
  assert.throws(() => gradientCSS({ ...sample, angle: NaN }), TypeError);
  assert.throws(() => gradientCSS({ ...sample, type: 'conic' }), TypeError);
});

test('contrast uses linearized luminance and text selection considers the weakest stop', () => {
  assert.ok(Math.abs(textContrast('#000000', '#FFFFFF') - 21) < 1e-10);
  assert.ok(Math.abs(textContrast('#777777', '#FFFFFF') - 4.478089453577214) < 1e-10);
  assert.equal(textContrast('#123456', '#123456'), 1);
  assert.equal(chooseTextColor(['#010203', '#151627', '#25334A']), '#ffffff');
  assert.equal(chooseTextColor(['#F9E5D7', '#D8E5F8', '#F1EDFC']), '#10121a');
  assert.throws(() => textContrast('not a colour', '#FFFFFF'), TypeError);
});

test('SVG export aligns cardinal CSS directions and exports independent, scalable data', () => {
  const horizontal = gradientSVG({ ...sample, angle: 90 }, 1600, 1000);
  assert.match(horizontal, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1600" height="1000" viewBox="0 0 1600 1000">/);
  assert.match(horizontal, /x1="0" y1="500" x2="1600" y2="500"/);
  assert.equal((horizontal.match(/<stop /g) || []).length, 3);
  assert.match(horizontal, /offset="50%" stop-color="#EE6DA6"/);
  assert.doesNotMatch(horizontal, /https:\/\/|<script|<image|undefined|NaN/);
  const vertical = gradientSVG({ ...sample, angle: 0 }, 800, 1200);
  assert.match(vertical, /x1="400" y1="1200" x2="400" y2="0"/);
  const diagonal = gradientSVG({ ...sample, angle: 45 }, 1600, 1000);
  assert.match(diagonal, /x1="150" y1="1150" x2="1450" y2="-150"/);
  assert.throws(() => gradientSVG(sample, -1, 1000), RangeError);
  assert.throws(() => gradientSVG(sample, 1000.5, 1000), RangeError);
});

test('radial and grain exports remain self-contained, bounded and complete for every preset', () => {
  const radial = gradientSVG({ ...sample, type: 'radial', noise: 0.15 }, 800, 800);
  assert.match(radial, /<radialGradient/);
  assert.match(radial, /gradientTransform="translate\(400 400\) scale\(565\.685425 565\.685425\)"/);
  assert.match(radial, /filter="url\(#grain\)" opacity="0\.15"/);
  assert.equal((radial.match(/<defs>/g) || []).length, 1);
  assert.equal((radial.match(/<\/defs>/g) || []).length, 1);
  assert.ok(radial.endsWith('</svg>'));
  assert.equal(new Set(PRESETS.map(preset => preset.id)).size, 8);
  for (const preset of PRESETS) {
    assert.doesNotThrow(() => gradientCSS(preset));
    assert.doesNotThrow(() => gradientSVG({ ...preset, noise: 0.1 }));
  }
});
