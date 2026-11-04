import { PRESETS, normalizeHex, sanitizeConfig, gradientCSS, chooseTextColor, gradientSVG } from './gradient.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clone = value => JSON.parse(JSON.stringify(value));
const storage = {
  get(key,fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { return false; } }
};
const INITIAL = { ...sanitizeConfig(PRESETS[0]), noise: .04 };
let config = clone(INITIAL);
let currentName = PRESETS[0].name;
let previewMode = 'glass';
let selectedId = PRESETS[0].id;
let history = [{config:clone(config),name:currentName,id:selectedId}];
let historyIndex = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reducedMotion.matches;
let saved = storage.get('lumi-collection-v1',[]);
saved = Array.isArray(saved) ? saved.filter(item => item && typeof item.name === 'string' && typeof item.id === 'string' && item.config).slice(0,24).map(item => ({id:item.id.slice(0,70),name:item.name.slice(0,40),config:sanitizeConfig(item.config)})) : [];
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
function snapshot() { return {config:clone(config),name:currentName,id:selectedId}; }
function pushHistory() {
  const next = snapshot();
  if (JSON.stringify(next) === JSON.stringify(history[historyIndex])) return;
  history = history.slice(0,historyIndex+1); history.push(next);
  if (history.length > 50) history.shift();
  historyIndex = history.length-1;
  updateHistoryButtons();
}
function updateHistoryButtons() { $('#undoButton').disabled = historyIndex === 0; $('#redoButton').disabled = historyIndex === history.length-1; }
function applySnapshot(item) {config = sanitizeConfig(item.config); currentName = item.name; selectedId = item.id; render();}
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
function updatePreview() {
  const css = gradientCSS(config); const foreground = chooseTextColor(config.colors);
  $('#gradientCanvas').style.backgroundImage = css;
  $('#gradientCanvas').dataset.text = foreground === '#ffffff' ? 'light':'dark';
  $('#grainLayer').style.opacity = config.noise;
  $('#typeExample').style.color = foreground;
  $('#gradientName').textContent = currentName;
  $('#gradientSummary').textContent = `3 colours · ${config.type==='radial' ? 'radial' : `${Math.round(config.angle)}°`}`;
  $('#currentSwatches').innerHTML = config.colors.map(colour=>`<i style="background:${colour}"></i>`).join('');
  $('#cssSnippet').textContent = `background: ${css};`;
  $('#angleOutput').textContent = `${Math.round(config.angle)}°`;
  $('#noiseOutput').textContent = `${Math.round(config.noise*100)}%`;
  $('#angleSection').style.opacity = config.type==='radial' ? '.45':'1';
  $('#angleRange').disabled = config.type==='radial';
  $('#angleRange').setAttribute('aria-describedby',config.type==='radial' ? 'radialHelp':'');
  for (const button of document.querySelectorAll('[data-type]')) {const selected=button.dataset.type===config.type;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}
  for (const button of document.querySelectorAll('[data-preset]')) button.setAttribute('aria-pressed',String(button.dataset.preset===selectedId));
  $('#savedCount').textContent = saved.length;
  updateMotion(); updateHistoryButtons();
}
function render() {renderColours();$('#angleRange').value=config.angle;$('#noiseRange').value=Math.round(config.noise*100);updatePreview();}
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
function cssText() {return `background: ${gradientCSS(config)};${config.noise ? '\n/* Grain is a separate texture layer. Export SVG/PNG to include it. */':''}`;}
function renderLibrary() {
  $('#savedGrid').innerHTML = saved.length ? saved.map(item => `<article class="saved-item"><button type="button" class="saved-load" data-load="${esc(item.id)}" aria-label="Load ${esc(item.name)}"><span class="saved-thumb" style="background:${gradientCSS(item.config)}"></span><strong>${esc(item.name)}</strong></button><button class="saved-remove" type="button" data-remove="${esc(item.id)}" aria-label="Remove ${esc(item.name)} from collection">Remove</button></article>`).join('') : `<div class="library-empty"><span aria-hidden="true">✦</span><h3>A little room for inspiration.</h3><p>Make something you love, then save it here.</p></div>`;
}
function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function exportImage(format,width,height) {
  const svg=gradientSVG(config,width,height);
  if (format==='svg') {downloadBlob(new Blob([svg],{type:'image/svg+xml'}),`lumi-${width}x${height}.svg`);return;}
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try {
    const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('The image could not be generated. Try SVG instead.'));image.src=url;});
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context)throw new Error('PNG is unavailable in this browser. Try SVG.');context.drawImage(image,0,0);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG export failed. Try SVG.');downloadBlob(blob,`lumi-${width}x${height}.png`);
  } finally {URL.revokeObjectURL(url);}
}

document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.preset)choosePreset(button.dataset.preset);
  if(button.dataset.mode){previewMode=button.dataset.mode;$('#glassExample').hidden=previewMode!=='glass';$('#typeExample').hidden=previewMode!=='type';$('#canvasCrosshair').hidden=previewMode!=='canvas';for(const tab of document.querySelectorAll('[data-mode]')){const selected=tab.dataset.mode===previewMode;tab.classList.toggle('selected',selected);tab.setAttribute('aria-pressed',String(selected));}}
  if(button.dataset.type && button.dataset.type!==config.type){config.type=button.dataset.type;customEdit();pushHistory();updatePreview();}
  if(button.dataset.close)closeDialog(button.dataset.close);
  if(button.dataset.load){const item=saved.find(p=>p.id===button.dataset.load);if(item){config=sanitizeConfig(item.config);currentName=item.name;selectedId='';pushHistory();render();closeDialog('libraryDialog');toast(`${item.name} is back in the studio.`);}}
  if(button.dataset.remove){const item=saved.find(p=>p.id===button.dataset.remove);const next=saved.filter(p=>p.id!==button.dataset.remove);if(storage.set('lumi-collection-v1',next)){saved=next;renderLibrary();updatePreview();const heading=$('#libraryTitle');heading.tabIndex=-1;heading.focus();toast(`${item?.name||'Gradient'} removed from this browser.`);}else toast('Your collection could not be updated. The gradient is still saved.');}
});
document.addEventListener('input',event=>{
  const target=event.target;
  if(target.hasAttribute('data-color-picker')){const index=Number(target.dataset.colorPicker);config.colors[index]=normalizeHex(target.value);customEdit();const field=document.querySelector(`[data-hex="${index}"]`);field.value=config.colors[index];field.setAttribute('aria-invalid','false');target.previousElementSibling.style.background=config.colors[index];updatePreview();}
  if(target.hasAttribute('data-hex')){const colour=normalizeHex(target.value);target.setAttribute('aria-invalid',String(!colour));if(colour){const index=Number(target.dataset.hex);config.colors[index]=colour;customEdit();const picker=document.querySelector(`[data-color-picker="${index}"]`);picker.value=colour;picker.previousElementSibling.style.background=colour;updatePreview();}}
  if(target.id==='angleRange'){config.angle=Number(target.value);customEdit();updatePreview();}
  if(target.id==='noiseRange'){config.noise=Number(target.value)/100;customEdit();updatePreview();}
});
document.addEventListener('change',event=>{if(event.target.matches('[data-color-picker],[data-hex],#angleRange,#noiseRange')){if(event.target.hasAttribute('data-hex')){const colour=normalizeHex(event.target.value);if(!colour){toast('Use a hex colour such as #0593C6.');return;}event.target.value=colour;}pushHistory();}});
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
$('#saveButton').addEventListener('click',()=>{if(saved.length>=24){toast('Your collection holds 24 gradients. Remove one to make a little space.');return;}$('#savePreview').style.background=gradientCSS(config);$('#savedName').value=currentName==='Your creation'?'':currentName;$('#saveError').textContent='';$('#savedName').setAttribute('aria-invalid','false');openDialog('saveDialog');});
$('#saveForm').addEventListener('submit',event=>{event.preventDefault();const name=$('#savedName').value.trim();if(!name||name.length>40){$('#saveError').textContent='Give your gradient a name, up to 40 characters.';$('#savedName').setAttribute('aria-invalid','true');$('#savedName').focus();return;}const item={id:crypto.randomUUID(),name,config:clone(config)};const next=[item,...saved];if(!storage.set('lumi-collection-v1',next)){toast('Browser storage is unavailable. You can still export your gradient.');return;}saved=next;currentName=name;history[historyIndex]=snapshot();updatePreview();closeDialog('saveDialog');toast('A good mood, kept. Saved to your collection.');});
$('#exportButton').addEventListener('click',()=>{$('#exportPreview').style.background=gradientCSS(config);$('#exportStatus').textContent='';openDialog('exportDialog');});
$('#exportForm').addEventListener('submit',async event=>{event.preventDefault();const button=$('#downloadButton');const [width,height]=$('#exportSize').value.split('x').map(Number);const format=new FormData(event.target).get('format');button.disabled=true;$('#exportStatus').textContent='Making a little magic…';try{await exportImage(format,width,height);$('#exportStatus').textContent=`Your ${width} × ${height} ${format.toUpperCase()} is ready.`;toast('Your gradient is ready to go.');}catch(error){$('#exportStatus').textContent=error.message;}finally{button.disabled=false;}});
$('#copyCssButton').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(cssText());toast('CSS copied. Make something beautiful.');}catch{$('#manualCss').value=cssText();openDialog('copyDialog');}});
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
$('#gradientCanvas').dataset.mode = previewMode;
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{$('#gradientCanvas').dataset.mode=button.dataset.mode;}));
renderPresets();render();
