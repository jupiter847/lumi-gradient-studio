import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_POSTER, sanitizePoster, layoutText, renderPoster } from './poster.js';

test('restored compositions restrict styles, preserve intentional empty text, and bound user text', () => {
  const restored = sanitizePoster({ title: '', subtitle: 'x'.repeat(170), label: '😀'.repeat(40), font: 'url(invalid)', size: Infinity, material: 'script', align: 'right', textColor: '#f00', layout: 'arbitrary' });
  assert.equal(restored.title, '');
  assert.equal(restored.subtitle.length, 120);
  assert.equal(Array.from(restored.label).length, 32);
  assert.equal(restored.label.endsWith('😀'), true);
  assert.equal(restored.font, DEFAULT_POSTER.font);
  assert.equal(restored.material, DEFAULT_POSTER.material);
  assert.equal(restored.size, 100);
  assert.equal(restored.align, 'center');
  assert.equal(restored.textColor, 'auto');
  assert.equal(restored.layout, 'poster');
  assert.deepEqual(sanitizePoster(null), { ...DEFAULT_POSTER });
  assert.equal(sanitizePoster({ size: 3 }).size, 70);
  assert.equal(sanitizePoster({ size: '200' }).size, 140);
  assert.equal(sanitizePoster({ size: '' }).size, 100);
});

test('text cleaning keeps line breaks and literal markup while removing control characters', () => {
  const text = '<b>Hello</b>\r\nworld\t✦\u0000';
  assert.equal(sanitizePoster({ title: text }).title, '<b>Hello</b>\nworld ✦');
  assert.equal(sanitizePoster({ title: 0 }).title, DEFAULT_POSTER.title);
});

test('wrapping preserves explicit newlines and empty lines while fitting whole words', () => {
  const measure = text => text.length;
  assert.deepEqual(layoutText('Make room\n\nfor your ideas.',measure,9), ['Make room','','for your','ideas.']);
  assert.deepEqual(layoutText('   quiet   little   things   ',measure,12), ['quiet little','things']);
  assert.deepEqual(layoutText(' \n ',measure,12), []);
  assert.throws(() => layoutText('text',measure,0),RangeError);
});

test('wrapping splits long tokens without losing characters or breaking emoji and combining marks', () => {
  const letters = 'averylongunbrokentoken';
  const lines = layoutText(letters,text => text.length,5);
  assert.equal(lines.join(''),letters);
  assert.equal(lines.every(line => line.length<=5),true);
  const emoji = '👩‍🎨👩‍🎨👩‍🎨';
  assert.deepEqual(layoutText(emoji,text => Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)).length,1),['👩‍🎨','👩‍🎨','👩‍🎨']);
  const accented = 'e\u0301e\u0301e\u0301';
  assert.deepEqual(layoutText(accented,text => text.length,2),['e\u0301','e\u0301','e\u0301']);
});

test('oversized or fractional exports are rejected before browser work begins', async () => {
  await assert.rejects(renderPoster({}, {}, 8192, 1080),RangeError);
  await assert.rejects(renderPoster({}, {}, 1080, 0),RangeError);
  await assert.rejects(renderPoster({}, {}, 1080.5, 1080),RangeError);
});
