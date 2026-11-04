import { PRESETS, normalizeHex, sanitizeConfig, gradientCSS } from './gradient.js';
import { sanitizePoster, renderPoster } from './poster.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clone = value => JSON.parse(JSON.stringify(value));
const storage = {
  get(key,fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { return false; } }
};
const INITIAL = { ...sanitizeConfig(PRESETS[0]), noise: .04 };
const SIZES = ['1080x1080','1080x1350','1080x1920','1600x1000','1920x1080'];
const draft = storage.get('lumi-draft-v2',null);
let config = draft?.config ? sanitizeConfig(draft.config) : clone(INITIAL);
let poster = sanitizePoster(draft?.poster);
let artworkSize = SIZES.includes(draft?.size) ? draft.size : SIZES[0];
let currentName = typeof draft?.name === 'string' ? draft.name.slice(0,40) : 'Your first idea';
let selectedId = draft ? (PRESETS.some(p => p.id === draft.id) ? draft.id : '') : PRESETS[0].id;
let history = [{config:clone(config),poster:clone(poster),size:artworkSize,name:currentName,id:selectedId}];
let historyIndex = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reducedMotion.matches;
let saved = storage.get('lumi-collection-v1',[]);
saved = Array.isArray(saved) ? saved.filter(item => item && typeof item.name === 'string' && typeof item.id === 'string' && item.config).slice(0,24).map(item => ({id:item.id.slice(0,70),name:item.name.slice(0,40),config:sanitizeConfig(item.config),poster:sanitizePoster(item.poster || {layout:'blank'}),size:SIZES.includes(item.size)?item.size:SIZES[0]})) : [];
let renderTimer, renderVersion = 0, draftTimer;
let toastTimer;
const hexOrigins = new WeakMap();

function toast(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; },3200);
}
function openDialog(id) {
  const dialog = document.getElementById(id); if (!dialog.open) dialog.showModal();
  const heading = dialog.querySelector('h2'); if (heading) {heading.tabIndex = -1; heading.focus({preventScroll:true});}
}
function closeDialog(id) { document.getElementById(id).close(); }
function snapshot() { return {config:clone(config),poster:clone(poster),size:artworkSize,name:currentName,id:selectedId}; }
function pushHistory() {
  const next = snapshot();
  if (JSON.stringify(next) === JSON.stringify(history[historyIndex])) return;
  history = history.slice(0,historyIndex+1); history.push(next);
  if (history.length > 50) history.shift();
  historyIndex = history.length-1;
  updateHistoryButtons();
}
function updateHistoryButtons() { $('#undoButton').disabled = historyIndex === 0; $('#redoButton').disabled = historyIndex === history.length-1; }
function applySnapshot(item) {config = sanitizeConfig(item.config); poster = sanitizePoster(item.poster); artworkSize = SIZES.includes(item.size) ? item.size : SIZES[0]; currentName = item.name; selectedId = item.id; render();}
function undo() { if (historyIndex > 0) applySnapshot(history[--historyIndex]); }
function redo() { if (historyIndex < history.length-1) applySnapshot(history[++historyIndex]); }
function customEdit() { currentName = 'Your creation'; selectedId = ''; }
function renderColours() {
  $('#colourFields').innerHTML = config.colors.map((colour,index) => `<div class="colour-field"><label class="colour-picker-wrap" aria-label="Choose colour ${index+1}"><span class="colour-sample" style="background:${colour}"></span><input type="color" value="${colour}" data-color-picker="${index}" aria-label="Choose colour ${index+1}"></label><label class="sr-only" for="hex${index}">Colour ${index+1} hex value</label><input id="hex${index}" class="hex-input" type="text" value="${colour}" data-hex="${index}" spellcheck="false" maxlength="7" aria-label="Colour ${index+1} hex value" aria-describedby="hexHelp"><span class="colour-number" aria-hidden="true">0${index+1}</span></div>`).join('');
  let help = $('#hexHelp'); if (!help) {help = document.createElement('span');help.id='hexHelp';help.className='sr-only';help.textContent='Enter a three- or six-digit hexadecimal colour, such as #0593C6.';$('.colour-controls').append(help);}
}
function renderPresets() {
  $('#presetGrid').innerHTML = PRESETS.map(preset => `<button class="preset-card" type="button" data-preset="${preset.id}" aria-label="Use ${preset.name} preset" aria-pressed="${selectedId===preset.id}"><span class="preset-thumb" style="background:${gradientCSS(preset)}"></span><strong>${preset.name}</strong><small>${preset.tag}</small></button>`).join('');
}
function renderContent() {
  $('#posterTitle').value=poster.title; $('#posterSubtitle').value=poster.subtitle; $('#posterLabel').value=poster.label;
  $('#posterFont').value=poster.font; $('#posterInk').value=poster.textColor; $('#textSize').value=poster.size;
  $('#exportSize').value=artworkSize;
}
function queueArtwork() {
  clearTimeout(renderTimer); renderVersion++;
  renderTimer=setTimeout(()=>refreshArtwork(),100);
  clearTimeout(draftTimer); draftTimer=setTimeout(()=>storage.set('lumi-draft-v2',snapshot()),250);
}
async function refreshArtwork() {
  clearTimeout(renderTimer);
  const version=++renderVersion;
  const [width,height]=artworkSize.split('x').map(Number);
  try {
    const artwork=await renderPoster(clone(config),clone(poster),width,height);
    if(version!==renderVersion)return null;
    const canvas=$('#posterCanvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').drawImage(artwork,0,0);
    canvas.setAttribute('aria-label',poster.layout==='blank' ? 'Gradient background preview' : `${poster.layout==='quote'?'Quote':'Poster'}: ${poster.title}. ${poster.subtitle}. ${poster.material==='none'?'No sculpture':poster.material+' sculpture'}.`);
    $('#previewStatus').textContent='Artwork preview updated.';
    return artwork;
  } catch(error) {$('#previewStatus').textContent='The preview could not be rendered. Try another material or reload.';console.error(error);return null;}
}
function updatePreview() {
  const css = gradientCSS(config);
  $('#gradientName').textContent = currentName;
  $('#gradientSummary').textContent = `${poster.layout==='blank'?'Background':poster.layout==='quote'?'Quote card':'Poster'} · ${artworkSize.replace('x',' × ')}`;
  $('#currentSwatches').innerHTML = config.colors.map(colour=>`<i style="background:${colour}"></i>`).join('');
  $('#cssSnippet').textContent = `background: ${css};`;
  $('#angleOutput').textContent = `${Math.round(config.angle)}°`;
  $('#noiseOutput').textContent = `${Math.round(config.noise*100)}%`;
  $('#titleCount').textContent = `${poster.title.length} / 100`;
  $('#textSizeOutput').textContent = `${poster.size}%`;
  $('#angleSection').style.opacity = config.type==='radial' ? '.45':'1';
  $('#angleRange').disabled = config.type==='radial';
  $('#angleRange').setAttribute('aria-describedby',config.type==='radial' ? 'radialHelp':'');
  const mode={poster:'glass',quote:'type',blank:'canvas'}[poster.layout];
  for (const button of document.querySelectorAll('[data-mode]')) {const active=button.dataset.mode===mode;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
  for (const button of document.querySelectorAll('[data-material]')) {const active=button.dataset.material===poster.material;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
  for (const button of document.querySelectorAll('[data-align]')) {const active=button.dataset.align===poster.align;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
  for (const button of document.querySelectorAll('[data-type]')) {const active=button.dataset.type===config.type;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
  for (const button of document.querySelectorAll('[data-preset]')) button.setAttribute('aria-pressed',String(button.dataset.preset===selectedId));
  $('#compositionNote').textContent=poster.layout==='blank'?'Background mode exports colour only. Choose Poster or Quote to add your words.':'Your words and sculpture are included in the download.';
  $('#savedCount').textContent = saved.length;
  queueArtwork();updateMotion();updateHistoryButtons();
}
function render() {renderColours();renderContent();$('#angleRange').value=config.angle;$('#noiseRange').value=Math.round(config.noise*100);updatePreview();}
function updateMotion() {
  const enabled = motion && !reducedMotion.matches;
  document.body.classList.toggle('motion-off',!enabled);
  $('#gradientCanvas').classList.toggle('motion',enabled);
  $('#motionButton').setAttribute('aria-pressed',String(enabled));
  $('#motionButton').querySelector('span').textContent = enabled ? 'Pause motion' : 'Play motion';
  $('#motionButton').setAttribute('aria-label',enabled ? 'Pause visual effects' : 'Play visual effects');
  $('#motionButton').disabled = reducedMotion.matches;
  if (!enabled) $('.preview-panel').style.transform = '';
}
function choosePreset(id) {const preset=PRESETS.find(p=>p.id===id);if(!preset)return;config={...sanitizeConfig(preset),noise:config.noise};currentName=preset.name;selectedId=id;pushHistory();render();}
function shuffle() {
  const random = new Uint32Array(4); crypto.getRandomValues(random);
  const hue = random[0]%360;
  const hslToHex = (h,s,l) => {s/=100;l/=100;const a=s*Math.min(l,1-l);const f=n=>{const k=(n+h/30)%12;const color=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*color).toString(16).padStart(2,'0');};return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();};
  config.colors = [hslToHex(hue,65,57),hslToHex((hue+50)%360,70,86),hslToHex((hue+105)%360,70,62)];
  config.angle = random[1]%360; customEdit(); pushHistory(); render(); toast('A fresh little possibility.');
}
function cssText() {return `background: ${gradientCSS(config)};${config.noise ? '\n/* Grain is a separate texture layer. Export PNG to include it. */':''}`;}
function renderLibrary() {
  $('#savedGrid').innerHTML = saved.length ? saved.map(item => `<article class="saved-item"><button type="button" class="saved-load" data-load="${esc(item.id)}" aria-label="Load ${esc(item.name)}"><span class="saved-thumb" style="background:${gradientCSS(item.config)}"><span>${esc(item.poster?.layout==='blank'?'':item.poster?.title)}</span></span><strong>${esc(item.name)}</strong></button><button class="saved-remove" type="button" data-remove="${esc(item.id)}" aria-label="Remove ${esc(item.name)} from collection">Remove</button></article>`).join('') : `<div class="library-empty"><span aria-hidden="true">✦</span><h3>A little room for your ideas.</h3><p>Add your words and a finish you love, then save it here.</p></div>`;
}
function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function exportImage(width,height) {
  const canvas=await renderPoster(clone(config),clone(poster),width,height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('PNG export failed. Please try again.');
  downloadBlob(blob,`lumi-artwork-${width}x${height}.png`);
}

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.preset)choosePreset(button.dataset.preset);
  if(button.dataset.mode){poster.layout={glass:'poster',type:'quote',canvas:'blank'}[button.dataset.mode];pushHistory();updatePreview();}
  if(button.dataset.editor){const content=button.dataset.editor==='content';$('#contentControls').hidden=!content;$('#backgroundControls').hidden=content;for(const tab of document.querySelectorAll('[data-editor]')){const active=tab===button;tab.classList.toggle('selected',active);tab.setAttribute('aria-pressed',String(active));}}
  if(button.dataset.material){poster.material=button.dataset.material;if(poster.layout==='blank')poster.layout='poster';customEdit();pushHistory();updatePreview();}
  if(button.dataset.align){poster.align=button.dataset.align;customEdit();pushHistory();updatePreview();}
  if(button.dataset.type && button.dataset.type!==config.type){config.type=button.dataset.type;customEdit();pushHistory();updatePreview();}
  if(button.dataset.close)closeDialog(button.dataset.close);
  if(button.dataset.load){const item=saved.find(p=>p.id===button.dataset.load);if(item){config=sanitizeConfig(item.config);poster=sanitizePoster(item.poster);artworkSize=item.size;currentName=item.name;selectedId='';pushHistory();render();closeDialog('libraryDialog');toast(`${item.name} is back in the studio.`);}}
  if(button.dataset.remove){const item=saved.find(p=>p.id===button.dataset.remove);const next=saved.filter(p=>p.id!==button.dataset.remove);if(storage.set('lumi-collection-v1',next)){saved=next;renderLibrary();updatePreview();const heading=$('#libraryTitle');heading.tabIndex=-1;heading.focus();toast(`${item?.name||'Gradient'} removed from this browser.`);}else toast('Your collection could not be updated. The gradient is still saved.');}
});
document.addEventListener('input',event=>{
  const target=event.target;
  const fields={posterTitle:'title',posterSubtitle:'subtitle',posterLabel:'label',posterFont:'font',posterInk:'textColor',textSize:'size'};
  if(fields[target.id]){poster=sanitizePoster({...poster,[fields[target.id]]:target.value});if(poster.layout==='blank')poster.layout='poster';customEdit();updatePreview();}
  if(target.id==='exportSize'){artworkSize=target.value;pushHistory();updatePreview();}
  if(target.hasAttribute('data-color-picker')){const index=Number(target.dataset.colorPicker);config.colors[index]=normalizeHex(target.value);customEdit();const field=document.querySelector(`[data-hex="${index}"]`);field.value=config.colors[index];field.setAttribute('aria-invalid','false');target.previousElementSibling.style.background=config.colors[index];updatePreview();}
  if(target.hasAttribute('data-hex')){const colour=normalizeHex(target.value);target.setAttribute('aria-invalid',String(!colour));if(colour){const index=Number(target.dataset.hex);config.colors[index]=colour;customEdit();const picker=document.querySelector(`[data-color-picker="${index}"]`);picker.value=colour;picker.previousElementSibling.style.background=colour;updatePreview();}}
  if(target.id==='angleRange'){config.angle=Number(target.value);customEdit();updatePreview();}
  if(target.id==='noiseRange'){config.noise=Number(target.value)/100;customEdit();updatePreview();}
});
document.addEventListener('change',event=>{if(event.target.matches('[data-color-picker],[data-hex],#angleRange,#noiseRange,#posterTitle,#posterSubtitle,#posterLabel,#posterFont,#posterInk,#textSize')){if(event.target.hasAttribute('data-hex')){const colour=normalizeHex(event.target.value);if(!colour){toast('Use a hex colour such as #0593C6.');return;}event.target.value=colour;}pushHistory();}});
document.addEventListener('focusin',event=>{if(event.target.hasAttribute('data-hex'))hexOrigins.set(event.target,config.colors[Number(event.target.dataset.hex)]);});
document.addEventListener('focusout',event=>{
  if(!event.target.hasAttribute('data-hex'))return;
  const index=Number(event.target.dataset.hex);
  const colour=normalizeHex(event.target.value);
  if(colour){event.target.value=colour;pushHistory();return;}
  config.colors[index]=hexOrigins.get(event.target)||config.colors[index];
  event.target.value=config.colors[index];event.target.setAttribute('aria-invalid','false');
  const picker=document.querySelector(`[data-color-picker="${index}"]`);
  picker.value=config.colors[index];picker.previousElementSibling.style.background=config.colors[index];
  const previous=history[historyIndex];
  if(JSON.stringify(config)===JSON.stringify(previous.config)){currentName=previous.name;selectedId=previous.id;}
  updatePreview();
});
$('#undoButton').addEventListener('click',undo);$('#redoButton').addEventListener('click',redo);$('#shuffleButton').addEventListener('click',shuffle);
$('#resetButton').addEventListener('click',()=>{config=clone(INITIAL);currentName=PRESETS[0].name;selectedId=PRESETS[0].id;pushHistory();render();toast('Back to blue skies.');});
$('#motionButton').addEventListener('click',()=>{motion=!motion;updateMotion();});reducedMotion.addEventListener('change',updateMotion);
$('#libraryButton').addEventListener('click',()=>{renderLibrary();openDialog('libraryDialog');});
for(const selector of ['#aboutButton','#footerAbout'])$(selector).addEventListener('click',()=>openDialog('aboutDialog'));
$('#saveButton').addEventListener('click',()=>{if(saved.length>=24){toast('Your collection holds 24 artworks. Remove one to make a little space.');return;}$('#savePreview').style.background=gradientCSS(config);$('#savedName').value=currentName==='Your creation'?'':currentName;$('#saveError').textContent='';$('#savedName').setAttribute('aria-invalid','false');openDialog('saveDialog');});
$('#saveForm').addEventListener('submit',event=>{event.preventDefault();const name=$('#savedName').value.trim();if(!name||name.length>40){$('#saveError').textContent='Give your artwork a name, up to 40 characters.';$('#savedName').setAttribute('aria-invalid','true');$('#savedName').focus();return;}const item={id:crypto.randomUUID(),name,config:clone(config),poster:clone(poster),size:artworkSize};const next=[item,...saved];if(!storage.set('lumi-collection-v1',next)){toast('Browser storage is unavailable. You can still export your artwork.');return;}saved=next;currentName=name;history[historyIndex]=snapshot();updatePreview();closeDialog('saveDialog');toast('A good mood, kept. Saved to your collection.');});
$('#exportButton').addEventListener('click',async()=>{
  $('#exportStatus').textContent='';$('#exportDimensions').textContent=artworkSize.replace('x',' × ');
  const image=await refreshArtwork();if(!image){toast('Please wait for the preview, then try again.');return;}
  $('#exportPreview').src=image.toDataURL('image/png');openDialog('exportDialog');
});
$('#exportForm').addEventListener('submit',async event=>{event.preventDefault();const button=$('#downloadButton');const [width,height]=artworkSize.split('x').map(Number);button.disabled=true;$('#exportStatus').textContent='Preparing your artwork…';try{await exportImage(width,height);$('#exportStatus').textContent=`Your ${width} × ${height} PNG is ready.`;toast('Your artwork is ready to share.');}catch(error){$('#exportStatus').textContent=error.message;}finally{button.disabled=false;}});
$('#copyCssButton').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(cssText());toast('CSS copied. Make something beautiful.');}catch{$('#manualCss').value=cssText();openDialog('copyDialog');}});
window.addEventListener('pagehide',()=>storage.set('lumi-draft-v2',snapshot()));
document.addEventListener('keydown',event=>{const editing=event.target.matches('input,textarea,select,[contenteditable=true]');if(editing||document.querySelector('dialog[open]'))return;if(event.code==='Space'&&!event.target.closest('button,a,[role=button]')){event.preventDefault();shuffle();}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});

// Decorative light and a gentle 3D response, without moving the controls themselves.
let pointerFrame=0,lastSpark=0;
document.addEventListener('pointermove',event=>{
  if(!motion||reducedMotion.matches||event.pointerType==='touch')return;
  if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{document.documentElement.style.setProperty('--cursor-x',`${event.clientX}px`);document.documentElement.style.setProperty('--cursor-y',`${event.clientY}px`);pointerFrame=0;});
  if(performance.now()-lastSpark>160 && event.target.closest('.gradient-canvas')){lastSpark=performance.now();const spark=document.createElement('span');spark.className='sparkle';spark.textContent='✧';spark.style.left=`${event.clientX-5}px`;spark.style.top=`${event.clientY-5}px`;document.body.append(spark);spark.addEventListener('animationend',()=>spark.remove(),{once:true});setTimeout(()=>spark.remove(),1200);}
});
const panel=$('.preview-panel');panel.addEventListener('pointermove',event=>{if(!motion||reducedMotion.matches||event.pointerType==='touch'||innerWidth<800)return;const r=panel.getBoundingClientRect();const x=(event.clientX-r.left)/r.width-.5;const y=(event.clientY-r.top)/r.height-.5;panel.style.transform=`perspective(1200px) rotateX(${-y*2.5}deg) rotateY(${x*2.5}deg)`;});panel.addEventListener('pointerleave',()=>{panel.style.transform='';});
const radialHelp=document.createElement('span');radialHelp.id='radialHelp';radialHelp.className='sr-only';radialHelp.textContent='Direction is not used for radial gradients.';$('#angleSection').append(radialHelp);
renderPresets();render();
