'use strict';
/* 지구를 지켜ZOOM! - 18종의 완성형 동물 그림을 꾸미는 무료 정적 웹앱.
   원본 동물 그림은 SVG/도형으로 대체하지 않습니다. */
const $ = id => document.getElementById(id);
const CANVAS = 900;
const root = $('stage');
const context = root.getContext('2d');
const CACHE = new Map();
let LIB=[], STICKERS=[], activeSpecies=null, activePose=0;
let habitat='전체', search='', activeTab='accessory';
let scene=emptyScene(), selected='base';
let overrides={}, drafts={}, history=[], future=[];
let drag=null, dragMoved=false, isReady=false;
let toastHandle=null, assetError=false;
const categories={accessory:'소품',expression:'표정',pattern:'무늬'};
const colorPresets=[['natural','원본 색감'],['warm','따뜻하게'],['cool','시원하게'],['pastel','파스텔'],['mono','연필 느낌']];
function emptyScene(){return {base:{x:450,y:445,scale:1,rotation:0,flip:false},items:[],preset:'natural',brightness:100,saturation:100};}
function clone(v){return JSON.parse(JSON.stringify(v));}
function clamp(x,min,max){return Math.min(max,Math.max(min,x));}
function currentAnimal(){return LIB.find(x=>x.id===activeSpecies);}
function currentPose(){return currentAnimal()?.poses[activePose];}
function key(){return `${activeSpecies}:${activePose}`;}
function assetPath(){return overrides[key()]?.data||currentPose()?.path||'';}
function fileLabel(){return `${currentAnimal()?.name||'동물'}_${currentPose()?.name||'동작'}_캐릭터.png`.replace(/[\\/:*?"<>|]/g,'_');}
function notify(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastHandle);toastHandle=setTimeout(()=>t.classList.remove('show'),2700);}
function getImage(path){if(!path)return null;if(CACHE.has(path))return CACHE.get(path);
 const image=new Image();image.decoding='async';const obj={image,loaded:false,failed:false};CACHE.set(path,obj);
 image.onload=()=>{obj.loaded=true;obj.failed=false;renderCanvas();if(path===assetPath()){$('loadingBadge').hidden=true;updateQualityNotice();}};
 image.onerror=()=>{obj.failed=true;obj.loaded=false;renderCanvas();if(path===assetPath()){$('loadingBadge').hidden=true;updateQualityNotice();}};
 image.src=path;return obj;}
function record(){history.push(JSON.stringify(scene));if(history.length>65)history.shift();future=[];updateUndoButtons();}
function updateUndoButtons(){$('undoBtn').disabled=history.length===0;$('redoBtn').disabled=future.length===0;}
function undo(){if(!history.length)return;future.push(JSON.stringify(scene));scene=JSON.parse(history.pop());selected='base';renderEditor();notify('이전 꾸미기로 돌아왔어요.');}
function redo(){if(!future.length)return;history.push(JSON.stringify(scene));scene=JSON.parse(future.pop());selected='base';renderEditor();notify('다시 적용했어요.');}
function saveDraft(){if(activeSpecies!==null)drafts[key()]=clone(scene);}
function selectSpecies(id){const a=LIB.find(x=>x.id===id);if(!a)return;saveDraft();activeSpecies=id;activePose=0;applyDraft();renderAll();}
function selectPose(poseIndex){if(!currentAnimal()||!currentAnimal().poses[poseIndex])return;saveDraft();activePose=poseIndex;applyDraft();renderAll();}
function applyDraft(){scene=drafts[key()]?clone(drafts[key()]):emptyScene();selected='base';history=[];future=[];getImage(assetPath());$('loadingBadge').hidden=!assetPath()||getImage(assetPath())?.loaded;updateUndoButtons();}
function renderAll(){renderAnimals();renderGallery();renderEditor();}
function setSearch(q){search=q.trim().replace(/\s+/g,'');renderAnimals();}
function renderAnimals(){let filtered=LIB.filter(a=>(habitat==='전체'||a.habitat===habitat)&&a.name.replace(/\s+/g,'').includes(search));$('animalList').innerHTML='';if(!filtered.length){const e=document.createElement('div');e.className='empty';e.textContent='찾는 동물이 없어요. 다른 이름으로 검색해 보세요.';$('animalList').append(e);return;}
 for(const a of filtered){const b=document.createElement('button');b.type='button';b.className='animal-button'+(a.id===activeSpecies?' selected':'');b.setAttribute('aria-pressed',String(a.id===activeSpecies));const image=document.createElement('img');image.src=overrides[`${a.id}:0`]?.data||a.poses[0].path;image.alt='';image.loading='lazy';const detail=document.createElement('span');detail.className='animal-text';const name=document.createElement('strong');name.textContent=a.name;const meta=document.createElement('small');meta.textContent=`${a.habitat} · 동작 5개`;detail.append(name,meta);b.append(image,detail);b.onclick=()=>selectSpecies(a.id);$('animalList').append(b);}}
function renderGallery(){const a=currentAnimal();if(!a)return;$('poseHeading').textContent=`${a.name}의 다양한 동작`;$('poseCount').textContent=`${a.poses.length}개`;$('poseGallery').innerHTML='';a.poses.forEach((pose,i)=>{const b=document.createElement('button');b.type='button';b.className='pose-button'+(i===activePose?' active':'');b.setAttribute('aria-pressed',String(i===activePose));const img=document.createElement('img');img.src=overrides[`${a.id}:${i}`]?.data||pose.path;img.alt=`${a.name}: ${pose.name}`;img.loading='eager';img.onerror=()=>{b.title='현재 이미지 파일을 불러오지 못했습니다. 파일 경로를 확인하세요.';img.style.opacity='.2';};const cap=document.createElement('span');cap.className='pose-caption';cap.textContent=pose.name;const q=document.createElement('span');q.className='quality-tag '+(pose.quality==='preview'?'preview':'');q.textContent=pose.quality==='preview'?'시안 · 확인 필요':'원본 · 고해상도';b.append(img,cap,q);b.onclick=()=>selectPose(i);$('poseGallery').append(b);});}
function updateQualityNotice(){const pose=currentPose(),out=$('qualityNotice');if(!pose)return;const replacement=overrides[key()];const src=assetPath(),img=getImage(src);let txt='',warning=false;
 if(replacement){txt='교사가 직접 불러온 이미지로 편집 중입니다. 실제 투명 여부는 이미지 파일 자체의 배경에 따라 달라집니다.';warning=false;}
 else if(!pose.hasTransparency){txt='⚠ 원본 PNG에 흰 배경이 포함되어 있습니다. 현재 저장하면 흰 배경도 함께 남습니다. 투명 배경 PNG를 준비하면 교사용 이미지 교체 기능으로 바꿀 수 있어요.';warning=true;}
 else if(pose.quality==='preview'){txt='⚠ 이 동작은 576×576px 저해상도 분리 시안입니다. 확대하면 흐려지거나 그림·글자 일부가 잘릴 수 있으니 고해상도 원본으로 교체해 주세요.';warning=true;}
 else{txt='✓ 원본에 투명 영역이 있어요. 그림을 꾸민 뒤 PNG로 저장하면 투명 부분이 유지됩니다.';}
 if(img?.failed){txt='⚠ 파일을 찾지 못했습니다: '+pose.path+' — 이미지 경로를 확인하세요.';warning=true;}
 out.textContent=txt;out.classList.toggle('warning',warning);}
function renderEditor(){const a=currentAnimal();if(!a)return;
 $('selectionLabel').textContent=`${a.name} · ${currentPose().name}`;
 updateQualityNotice();
 $('targetName').textContent=selected==='base'?'🐾 동물 캐릭터':(scene.items.find(it=>it.id===selected)?.name||'🎨 소품을 선택해 주세요');
 $('deleteStickerBtn').disabled=selected==='base';$('frontBtn').disabled=selected==='base';
 $('brightness').value=scene.brightness;$('saturation').value=scene.saturation;$('brightOutput').textContent=scene.brightness+'%';$('satOutput').textContent=scene.saturation+'%';
 renderColorPresets();renderCanvas();updateUndoButtons();}
function renderStickerTab(){const grid=$('stickerGrid');grid.innerHTML='';for(const sticker of STICKERS.filter(s=>s.category===activeTab)){const b=document.createElement('button');b.className='sticker-button';b.type='button';const img=document.createElement('img');img.src=sticker.path;img.alt='';const txt=document.createElement('span');txt.textContent=sticker.name;b.append(img,txt);b.onclick=()=>addSticker(sticker);grid.append(b);}}
function setTab(which){activeTab=which;document.querySelectorAll('.tabs button').forEach(b=>{const active=b.dataset.tab===which;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false');});$('colorTab').hidden=which!=='color';$('stickerTab').hidden=which==='color';if(which!=='color')renderStickerTab();}
function renderColorPresets(){const box=$('colorPresets');box.innerHTML='';for(const [id,name] of colorPresets){const b=document.createElement('button');b.type='button';b.textContent=name;b.classList.toggle('active',scene.preset===id);b.onclick=()=>{record();scene.preset=id;renderEditor();};box.append(b);}}
function addSticker(def){record();const n=scene.items.length;const id='it-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);scene.items.push({id,stickerId:def.id,name:def.name,x:450+(n%5)*30-60,y:380+Math.floor(n/5)*24,size:150,rotation:0,flip:false});selected=id;getImage(def.path);renderEditor();notify(def.name+' 추가! 그림 위에서 움직여 보세요.');}
function activeObj(){return selected==='base'?scene.base:scene.items.find(it=>it.id===selected)||scene.base;}
function doEdit(fn){record();fn();renderEditor();}
function applyMove(dx,dy){doEdit(()=>{let o=activeObj();o.x=clamp(o.x+dx,-100,1000);o.y=clamp(o.y+dy,-100,1000);});}
function applyScale(k){doEdit(()=>{let o=activeObj();if(selected==='base')o.scale=clamp(o.scale*k,.22,2.4);else o.size=clamp(o.size*k,24,530);});}
function rotate(deg){doEdit(()=>{let o=activeObj();o.rotation=((o.rotation+deg)%360+360)%360;});}
function resetSelected(){doEdit(()=>{if(selected==='base')scene.base={x:450,y:445,scale:1,rotation:0,flip:false};else{const o=activeObj();o.x=450;o.y=405;o.rotation=0;o.size=150;o.flip=false;}});}
function deleteSelected(){if(selected==='base')return;doEdit(()=>{scene.items=scene.items.filter(x=>x.id!==selected);selected='base';});notify('선택한 소품을 삭제했어요.');}
function bringFront(){if(selected==='base')return;doEdit(()=>{const idx=scene.items.findIndex(x=>x.id===selected);if(idx>=0){const v=scene.items.splice(idx,1)[0];scene.items.push(v);}});}
function fitObjectTransform(ctx,x,y,size,angle,flip,draw){ctx.save();ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);ctx.scale(flip?-1:1,1);draw();ctx.restore();}
function drawCanvas(ctx,guide=true){ctx.clearRect(0,0,CANVAS,CANVAS);const source=assetPath();const pair=getImage(source);
 if(pair?.loaded){const b=scene.base;ctx.save();ctx.filter=filterString();fitObjectTransform(ctx,b.x,b.y,690*b.scale,b.rotation,b.flip,()=>{ctx.drawImage(pair.image,-345*b.scale,-345*b.scale,690*b.scale,690*b.scale);});ctx.restore();}
 else if(pair?.failed){ctx.fillStyle='#ae5c4d';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText('캐릭터 이미지를 찾을 수 없어요',450,430);ctx.font='18px sans-serif';ctx.fillText('이미지 파일을 확인해 주세요',450,464);}
 for(const it of scene.items){const def=STICKERS.find(x=>x.id===it.stickerId);if(!def)continue;const sticker=getImage(def.path);if(sticker?.loaded)fitObjectTransform(ctx,it.x,it.y,it.size,it.rotation,it.flip,()=>ctx.drawImage(sticker.image,-it.size/2,-it.size/2,it.size,it.size));}
 if(guide){const o=activeObj(),width=selected==='base'?690*o.scale:o.size;ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rotation*Math.PI/180);ctx.strokeStyle='#2f9165';ctx.lineWidth=3;ctx.setLineDash([13,10]);ctx.strokeRect(-width/2,-width/2,width,width);ctx.setLineDash([]);ctx.fillStyle='#2f9165';for(const [xx,yy] of [[-width/2,-width/2],[width/2,-width/2],[width/2,width/2],[-width/2,width/2]]){ctx.beginPath();ctx.arc(xx,yy,7,0,Math.PI*2);ctx.fill();}ctx.restore();}}
function filterString(){const p={natural:'',warm:'sepia(.20) hue-rotate(-8deg)',cool:'sepia(.12) hue-rotate(145deg)',pastel:'saturate(.65) brightness(1.06)',mono:'grayscale(.83)'}[scene.preset]||'';return `brightness(${scene.brightness}%) saturate(${scene.saturation}%) ${p}`;}
function renderCanvas(){if(!isReady)return;drawCanvas(context,true);}
function pointerPosition(e){const r=root.getBoundingClientRect();return{x:(e.clientX-r.left)*CANVAS/r.width,y:(e.clientY-r.top)*CANVAS/r.height};}
function hit(obj,pos,size){const dx=pos.x-obj.x,dy=pos.y-obj.y,angle=-obj.rotation*Math.PI/180;const x=dx*Math.cos(angle)-dy*Math.sin(angle),y=dx*Math.sin(angle)+dy*Math.cos(angle);return Math.abs(x)<=size/2&&Math.abs(y)<=size/2;}
function itemAt(pos){for(let i=scene.items.length-1;i>=0;i--){const it=scene.items[i];if(hit(it,pos,it.size))return it.id;}if(hit(scene.base,pos,690*scene.base.scale))return 'base';return null;}
function onPointerDown(e){if(e.button!==0&&e.pointerType==='mouse')return;const pos=pointerPosition(e),target=itemAt(pos);if(!target){selected='base';renderEditor();return;}
 selected=target;const obj=activeObj();drag={x:pos.x,y:pos.y,sx:obj.x,sy:obj.y,before:JSON.stringify(scene)};dragMoved=false;root.setPointerCapture(e.pointerId);renderEditor();e.preventDefault();}
function onPointerMove(e){if(!drag)return;const pos=pointerPosition(e);const dx=pos.x-drag.x,dy=pos.y-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)dragMoved=true;const o=activeObj();o.x=clamp(drag.sx+dx,-100,1000);o.y=clamp(drag.sy+dy,-100,1000);renderCanvas();e.preventDefault();}
function onPointerUp(){if(!drag)return;if(dragMoved){history.push(drag.before);if(history.length>65)history.shift();future=[];updateUndoButtons();}drag=null;}
function blobDownload(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);}
async function savePNG(){const btn=$('downloadBtn');if(btn.disabled)return;const original=btn.innerHTML;btn.disabled=true;btn.textContent='PNG 이미지 만드는 중…';try{
 const base=getImage(assetPath());if(!base?.loaded)throw new Error('동물 이미지가 로딩되지 않았습니다.');
 const used=scene.items.map(it=>STICKERS.find(x=>x.id===it.stickerId)?.path).filter(Boolean);
 await Promise.all(used.map(src=>new Promise((resolve,reject)=>{const image=getImage(src);if(image.loaded)return resolve();if(image.failed)return reject(new Error('소품 파일 누락'));image.image.addEventListener('load',resolve,{once:true});image.image.addEventListener('error',reject,{once:true});})));
 const canvas=document.createElement('canvas');canvas.width=CANVAS;canvas.height=CANVAS;const ctx=canvas.getContext('2d');drawCanvas(ctx,false);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG 내보내기 실패')),'image/png'));blobDownload(blob,fileLabel());
 notify('PNG를 저장했어요! 캔바에서 열어 보세요.');
 }catch(e){console.error(e);notify('PNG 저장 실패: 이미지가 제대로 로드되었는지 확인해 주세요.');}finally{btn.disabled=false;btn.innerHTML=original;}}
function saveJSON(){saveDraft();const data={app:'ecozoo-character-designer',version:1,selectedSpecies:activeSpecies,selectedPose:activePose,drafts,overrides};const str=JSON.stringify(data);blobDownload(new Blob([str],{type:'application/json;charset=utf-8'}),'지구를지켜ZOOM_꾸미기작업.json');notify('작업 파일을 저장했어요.');}
async function readJSON(file){try{if(!file||file.size>30000000)throw new Error('작업 파일이 너무 큽니다.');const data=JSON.parse(await file.text());if(data.app!=='ecozoo-character-designer'||data.version!==1||!LIB.find(x=>x.id===data.selectedSpecies))throw new Error('지원하지 않는 파일 형식');
 drafts=data.drafts&&typeof data.drafts==='object'?data.drafts:{};overrides=data.overrides&&typeof data.overrides==='object'?data.overrides:{};
 // Only known data URLs for replacement images are accepted.
 for(const k of Object.keys(overrides)){const value=overrides[k];if(!LIB.some(a=>a.poses.some((_,i)=>`${a.id}:${i}`===k))||!value||typeof value.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(value.data)){delete overrides[k];}}
 activeSpecies=data.selectedSpecies;activePose=clamp(Number(data.selectedPose)||0,0,4);scene=drafts[key()]?clone(drafts[key()]):emptyScene();if(!scene.base||!Array.isArray(scene.items))scene=emptyScene();selected='base';history=[];future=[];getImage(assetPath());renderAll();notify('작업을 불러왔어요.');
 }catch(e){console.error(e);notify('이 웹앱에서 저장한 JSON 작업 파일만 열 수 있어요.');}}
async function teacherUpload(file){if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>10000000){notify('10MB 이하의 PNG·JPG·WEBP 이미지만 가능해요.');return;}
 const reader=new FileReader();reader.onload=()=>{const value=reader.result;if(typeof value!=='string')return;overrides[key()]={data:value,filename:file.name};getImage(value);renderGallery();renderEditor();notify('새 이미지를 현재 동작에 적용했어요. 작업 저장도 해 주세요.');};reader.onerror=()=>notify('이미지를 읽지 못했습니다.');reader.readAsDataURL(file);}
function setupControls(){
 $('search').addEventListener('input',e=>setSearch(e.target.value));$('clearSearch').onclick=()=>{$('search').value='';setSearch('');habitat='전체';renderHabitat();};
 document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
 $('baseBtn').onclick=()=>{selected='base';renderEditor();};$('deleteStickerBtn').onclick=deleteSelected;
 $('undoBtn').onclick=undo;$('redoBtn').onclick=redo;
 $('smaller').onclick=()=>applyScale(.9);$('bigger').onclick=()=>applyScale(1.1);
 $('rotateLeft').onclick=()=>rotate(-15);$('rotateRight').onclick=()=>rotate(15);
 $('moveLeft').onclick=()=>applyMove(-18,0);$('moveRight').onclick=()=>applyMove(18,0);$('moveUp').onclick=()=>applyMove(0,-18);$('moveDown').onclick=()=>applyMove(0,18);
 $('flipBtn').onclick=()=>doEdit(()=>{activeObj().flip=!activeObj().flip;});$('centerBtn').onclick=resetSelected;$('frontBtn').onclick=bringFront;
 $('resetBtn').onclick=()=>{if(!confirm('현재 동작의 꾸미기를 모두 초기화할까요?'))return;doEdit(()=>{scene=emptyScene();selected='base';});notify('기본 모습으로 돌아왔어요.');};
 $('downloadBtn').onclick=savePNG;$('saveProjectBtn').onclick=saveJSON;$('loadProjectBtn').onclick=()=>$('loadInput').click();$('loadInput').onchange=async e=>{await readJSON(e.target.files[0]);e.target.value='';};
 for(const [id,prop] of [['brightness','brightness'],['saturation','saturation']]){$(id).addEventListener('pointerdown',()=>record());$(id).addEventListener('keydown',()=>record());$(id).addEventListener('input',e=>{scene[prop]=Number(e.target.value);$(prop==='brightness'?'brightOutput':'satOutput').textContent=scene[prop]+'%';renderCanvas();});}
 root.addEventListener('pointerdown',onPointerDown);root.addEventListener('pointermove',onPointerMove);root.addEventListener('pointerup',onPointerUp);root.addEventListener('pointercancel',onPointerUp);
 $('overrideInput').onchange=e=>{teacherUpload(e.target.files[0]);e.target.value='';};
 $('removeOverrideBtn').onclick=()=>{if(overrides[key()]){delete overrides[key()];renderGallery();renderEditor();notify('이 동작의 원본 이미지로 되돌렸어요.');}};
 document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}else if((e.key==='Delete'||e.key==='Backspace')&&selected!=='base'){e.preventDefault();deleteSelected();}});
}
function renderHabitat(){const area=$('habitatFilter');area.innerHTML='';for(const name of ['전체','극지','숲','사막','초원','산']){const b=document.createElement('button');b.textContent=name;b.classList.toggle('active',habitat===name);b.onclick=()=>{habitat=name;renderHabitat();renderAnimals();};area.append(b);}}
async function init(){setupControls();try{const [animalsResponse,stickersResponse]=await Promise.all([fetch('./animals.json'),fetch('./stickers.json')]);if(!animalsResponse.ok||!stickersResponse.ok)throw new Error('데이터 파일을 찾지 못했습니다.');const animalsData=await animalsResponse.json();LIB=animalsData.animals;STICKERS=await stickersResponse.json();if(LIB.length!==18||LIB.some(x=>x.poses.length!==5))throw new Error('18종×5개 이미지 목록이 올바르지 않습니다.');
 isReady=true;renderHabitat();setTab('accessory');selectSpecies(LIB[0].id);notify('준비 완료! 동물을 골라 꾸며 보세요.');
 }catch(e){console.error(e);$('animalList').innerHTML='<div class="empty">동물 이미지를 불러오지 못했어요.<br>GitHub Pages에 게시하거나 로컬 서버에서 열어 주세요.<br>ZIP에서 모든 파일을 함께 풀어야 합니다.</div>';$('qualityNotice').textContent='데이터 로딩 실패: '+e.message;notify('이미지 데이터 파일을 확인해 주세요.');}}
init();
