import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_POSTER, sanitizePoster, layoutText, renderPoster, sculpturePlacement } from './poster.js';

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

test('saved sculpture poses accept numeric settings and reject malformed or unbounded data', () => {
  const pose = sanitizePoster({ rotationX: '1.2', rotationY: -99, objectX: .8, objectY: '-0.12' });
  assert.equal(pose.rotationX, 1.2);
  assert.equal(pose.rotationY, -Math.PI);
  assert.equal(pose.objectX, .24);
  assert.equal(pose.objectY, -.12);
  const invalid = sanitizePoster({ rotationX: Infinity, rotationY: null, objectX: true, objectY: [] });
  for (const key of ['rotationX','rotationY','objectX','objectY']) assert.equal(invalid[key], 0);
  assert.equal(sanitizePoster({ rotationX: 0, rotationY: '0', objectX: '', objectY: NaN }).rotationY, 0);
});

test('default placement preserves the poster composition and scales with export dimensions', () => {
  const square = sculpturePlacement({},1080,1080);
  assert.deepEqual(square,{x:540,y:1080*.395,size:1080*.68});
  const doubled = sculpturePlacement({},2160,2160);
  for (const key of ['x','y','size']) assert.equal(doubled[key],square[key]*2);
  assert.deepEqual(sculpturePlacement({},1600,1000),{x:800,y:395,size:680});
  assert.deepEqual(sculpturePlacement({layout:'quote'},1080,1920),{x:540,y:1920*.28,size:1080*.52});
});

test('moving a sculpture keeps its complete layer within the artwork across layouts and sizes', () => {
  const epsilon = 1e-8;
  for (const [width,height] of [[1080,1080],[1080,1920],[1920,1080]]) {
    for (const layout of ['poster','quote']) for (const align of ['left','center']) {
      for (const direction of [-1,1]) {
        const {x,y,size} = sculpturePlacement({layout,align,objectX:direction*.24,objectY:direction*.24},width,height);
        assert.ok(x-size/2 >= width*.03-epsilon);
        assert.ok(x+size/2 <= width*.97+epsilon);
        assert.ok(y-size/2 >= height*.03-epsilon);
        assert.ok(y+size/2 <= height*.97+epsilon);
      }
    }
  }
});

test('hidden sculptures provide no hit target and invalid artwork dimensions are rejected', () => {
  assert.equal(sculpturePlacement({material:'none'},1080,1080),null);
  assert.equal(sculpturePlacement({layout:'blank'},1080,1080),null);
  assert.throws(()=>sculpturePlacement({},0,1080),RangeError);
  assert.throws(()=>sculpturePlacement({},1080,Infinity),RangeError);
});

test('movement starts at the visible bounded home position without a first-drag dead zone', () => {
  const width = 1080;
  const home = sculpturePlacement({layout:'quote',align:'left'},width,1920);
  const moved = sculpturePlacement({layout:'quote',align:'left',objectX:-.02},width,1920);
  assert.ok(home.x < width*.72, 'the home position is bounded by the right safe margin');
  assert.ok(Math.abs(moved.x-(home.x-width*.02)) < 1e-8);
  assert.equal(moved.y,home.y);
});
