'use strict';
const roomDefs=[['vs','Habitaciones vacías sucias (VS)'],['dismantled','Habitaciones desmanteladas'],['isolation','Aislamientos']];
// Los estados operativos no tienen ninguna relación con las categorías fotográficas.
const defs=[
  ['qr','Falta de QR',['No','Sí'],['Sí']],
  ['keys','Llaves',['Completas','Faltantes','Con novedades'],['Faltantes','Con novedades']],
  ['checkout','Check Out',['Completo','Incompleto','Pendiente'],['Incompleto','Pendiente']],
  ['office','Estado de offices',['Limpio','Ordenado','Con observaciones','Pendiente'],['Con observaciones','Pendiente']],
  ['cart','Estado del carro',['Limpio','Ordenado','Equipado','Con observaciones','Pendiente'],['Con observaciones','Pendiente']],
  ['mops','Mopas',['Correctas','Fuera de lugar','Faltantes','Deterioradas'],['Fuera de lugar','Faltantes','Deterioradas']],
  ['wheels','Ruedas del carro',['Limpias','Sucias','Dañadas'],['Sucias','Dañadas']],
  ['cups','Jarras y vasos',['Limpios','Ordenados','Pendientes','Acumulados'],['Pendientes','Acumulados']],
  ['waste','Residuos y cestos',['Correctos','Desbordados','Sucios','Dañados'],['Desbordados','Sucios','Dañados']]
];
const multiIds=['office','cart','cups'];
const photoCategories=['Carro de limpieza','Cajones','Office de alimentación','Office de limpieza','Ropería','Otra foto del cierre'];
const photoIcons=['','🗄️','🍽️','🧹','🧺','📸'];
const photoLabel=category=>category==='Carro de limpieza'?category:`${photoIcons[photoCategories.indexOf(category)]||'📸'} ${category}`;
const photoHeadingHTML=category=>category==='Carro de limpieza'?CleaningCart.html()+' '+esc(category):esc(photoLabel(category));
const selected=r=>Array.isArray(r)?r:(r?[r]:[]);
const needsDetail=v=>['Pendiente','Pendientes','Con observaciones'].includes(v);
const materials=['Llaves','Mopas','Rejillas','Otros'];
const materialIcons=['🔑','🧹','🧽','📦'];
const CleaningCart={html:()=>'<img class="cart-icon" src="carro-limpieza.svg" alt="" aria-hidden="true">'};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const formatDate=v=>new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(v));
function options(id,values,label=v=>v){values.forEach(v=>$(id).add(new Option(label(v),v)));}
options('#person',['Participante DEMO 1','Participante DEMO 2']);options('#service',['Servicio DEMO A','Servicio DEMO B','Servicio DEMO C']);
$('#room-fields').innerHTML=roomDefs.map(([id,label])=>`<div class="room-row"><label for="${id}-count">${id==='isolation'?'<span aria-hidden="true">🦠</span> ':''}${label}</label><input id="${id}-count" type="number" min="0" max="100" value="0" required aria-label="Cantidad de ${label}"><input id="${id}-rooms" type="text" maxlength="500" placeholder="Números: 201, 202" aria-label="Números de ${label}" disabled></div>`).join('');
$('#status-fields').innerHTML=defs.map(([id,title,values])=>`<fieldset class="status-row"><legend>${id==='cart'?CleaningCart.html()+' ':({keys:'🔑',checkout:'📋'})[id]?`<span aria-hidden="true">${({keys:'🔑',checkout:'📋'})[id]}</span> `:''}${title}</legend><div class="choices">${values.map((v,i)=>`<label class="choice"><input type="${multiIds.includes(id)?'checkbox':'radio'}" name="${id}" value="${v}" ${i===0&&!multiIds.includes(id)?'required':''}>${v}</label>`).join('')}</div><div id="${id}-details">${values.filter(needsDetail).map(v=>`<label class="conditional" hidden>${v==='Con observaciones'?'Detallá cómo queda al cierre':'¿Qué queda pendiente al cierre?'}<textarea data-detail="${id}" data-condition="${v}" maxlength="800" rows="2" disabled></textarea></label>`).join('')}</div>${id==='qr'?'<label class="conditional" id="qr-extra" hidden>Habitaciones sin QR<input id="qr-rooms" type="text" maxlength="500" placeholder="Ej.: 201, 202"></label>':''}</fieldset>`).join('');
$('#materials').innerHTML=materials.map((v,i)=>`<label class="choice"><input name="material" type="checkbox" value="${v}"><span aria-hidden="true">${materialIcons[i]}</span> ${v}</label>`).join('');

let photos=[],uploadBusy=false,toastTimer;
options('#photo-category',photoCategories,photoLabel);
function updatePhotoCategoryIcon(){$('#photo-category-icon').innerHTML=$('#photo-category').value==='Carro de limpieza'?CleaningCart.html():'';}
$('#photo-category').addEventListener('change',updatePhotoCategoryIcon);updatePhotoCategoryIcon();
const value=id=>multiIds.includes(id)?[...document.querySelectorAll(`input[name="${id}"]:checked`)].map(n=>n.value):($(`input[name="${id}"]:checked`)?.value||'');
function collect(){return {person:$('#person').value,service:$('#service').value,date:new Date().toISOString(),rooms:Object.fromEntries(roomDefs.map(([id])=>[id,{count:Number($(`#${id}-count`).value),numbers:$(`#${id}-rooms`).value.trim()}])),states:Object.fromEntries(defs.map(([id])=>[id,value(id)])),details:Object.fromEntries(defs.map(([id])=>[id,Object.fromEntries([...document.querySelectorAll(`[data-detail="${id}"]`)].filter(n=>!n.disabled).map(n=>[n.dataset.condition,n.value.trim()]))])),qrRooms:value('qr')==='Sí'?$('#qr-rooms').value.trim():'',materials:[...document.querySelectorAll('[name=material]:checked')].map(n=>n.value),notes:$('#notes').value.trim(),photos:[...photos]};}
$('#closing-form').addEventListener('input',()=>{roomDefs.forEach(([id])=>{const input=$(`#${id}-rooms`),enabled=Number($(`#${id}-count`).value)>0;input.disabled=!enabled;input.required=enabled;if(!enabled)input.value='';input.setCustomValidity('');});const qr=value('qr')==='Sí';$('#qr-extra').hidden=!qr;$('#qr-rooms').required=qr;syncDetails();$('#form-message').textContent='';});
function syncDetails(){
  const other=[...document.querySelectorAll('[name=material]:checked')].some(n=>n.value==='Otros');
  $('#notes').required=other;
  $('#notes').setCustomValidity(other&&!$('#notes').value.trim()?'Contanos a qué se refiere “Otros” al cierre.':'');
  $('#notes-requirement').textContent=other?'(obligatorio: explicá “Otros”)':'(opcional)';
  document.querySelectorAll('[data-detail]').forEach(n=>{const active=selected(value(n.dataset.detail)).includes(n.dataset.condition);n.disabled=!active;n.required=active;n.setCustomValidity(active&&!n.value.trim()?'Aclará qué queda observado o pendiente al cierre.':'');n.closest('label').hidden=!active;});
  multiIds.forEach(id=>{const first=$(`input[name="${id}"]`);first.setCustomValidity(selected(value(id)).length?'':'Elegí al menos una condición de entrega.');});
}
function renderPhotos(){
  $('#photos').innerHTML=photos.map((p,i)=>`<div class="photo"><img src="${p.url}" alt="Estado al cierre: ${esc(p.category)}"><label>${p.category==='Carro de limpieza'?CleaningCart.html():''} Categoría<select data-category="${i}">${photoCategories.map(c=>`<option value="${esc(c)}" ${c===p.category?'selected':''}>${esc(photoLabel(c))}</option>`).join('')}</select></label><div class="photo-controls"><button type="button" class="secondary" data-remove="${i}">Eliminar</button><label class="upload">Reemplazar<input type="file" accept="image/*" data-replace="${i}" aria-label="Reemplazar foto de ${esc(p.category)}"></label></div></div>`).join('');
  $('#form-message').textContent='';
}
function removePhoto(index){if(uploadBusy)return;const [p]=photos.splice(index,1);if(p)URL.revokeObjectURL(p.url);renderPhotos();}
$('#photos').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b)removePhoto(Number(b.dataset.remove));});
$('#photos').addEventListener('change',e=>{if(e.target.matches('[data-category]')){if(uploadBusy){e.target.value=photos[Number(e.target.dataset.category)].category;return;}photos[Number(e.target.dataset.category)].category=e.target.value;renderPhotos();$('#form-message').textContent='';}if(e.target.matches('[data-replace]'))addPhotos(e,Number(e.target.dataset.replace));});
async function readPhoto(file,category){
  if(!file.type.startsWith('image/')||file.size>12*1024*1024)throw new Error('Elegí una imagen de hasta 12 MB.');
  const url=URL.createObjectURL(file);
  try{await new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=url;});return {url,category,file};}
  catch{URL.revokeObjectURL(url);throw new Error('No se pudo leer la foto. Probá con JPG, PNG o una captura de pantalla.');}
}
async function addPhotos(e,replaceIndex=null){
  if(uploadBusy)return;
  const input=e.target,files=[...input.files];if(!files.length)return;
  uploadBusy=true;
  const replacing=Number.isInteger(replaceIndex),original=replacing?photos[replaceIndex]:null;
  const category=original?original.category:$('#photo-category').value,failures=[];
  try{for(const file of files){
    if(!replacing&&photos.length>=10){failures.push('El límite es de 10 fotos.');break;}
    try{const photo=await readPhoto(file,category);if(replacing){photos[replaceIndex]=photo;URL.revokeObjectURL(original.url);break;}else photos.push(photo);}
    catch(error){failures.push(error.message);}
  }}finally{input.value='';uploadBusy=false;renderPhotos();}
  if(failures.length)toast([...new Set(failures)].join(' '));
}
$('#camera').addEventListener('change',e=>addPhotos(e));$('#gallery').addEventListener('change',e=>addPhotos(e));
function photoGalleryHTML(items){
  if(!items.length)return '<p class="hint">Sin fotografías adjuntas. Las fotos del cierre son opcionales.</p>';
  return photoCategories.map(category=>{
    const group=items.filter(p=>p.category===category);
    if(!group.length)return '';
    return `<section class="photo-group"><h4>${photoHeadingHTML(category)} (${group.length})</h4><div class="photo-grid">${group.map(p=>`<div class="photo"><img src="${p.url}" alt="Entrega al cierre: ${esc(category)}"><p>${photoHeadingHTML(category)}</p></div>`).join('')}</div></section>`;
  }).join('');
}
function detailRows(rows){return rows.map(([label,v])=>`<div class="detail-row"><strong>${/carro/i.test(label)?CleaningCart.html()+' ':''}${esc(label)}</strong>${esc(v)}</div>`).join('');}
function validationErrors(r){
  const errors=[];
  if(!r.person||!r.service)errors.push('Elegí nombre y servicio ficticios.');
  for(const [id,label] of roomDefs){
    const {count,numbers}=r.rooms[id],parts=numbers.split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean);
    if(!Number.isInteger(count)||count<0||count>100||parts.length!==count||new Set(parts).size!==parts.length)errors.push(`${label}: revisá cantidad y números, sin repeticiones.`);
  }
  for(const [id,label] of defs){
    if(!selected(r.states[id]).length)errors.push(`Elegí una condición para ${label}.`);
    for(const v of selected(r.states[id]).filter(needsDetail))if(!r.details[id]?.[v])errors.push(`Aclará ${label}: ${v}.`);
  }
  if(r.states.qr==='Sí'&&!r.qrRooms)errors.push('Indicá habitaciones sin QR.');
  if(r.materials.includes('Otros')&&!r.notes)errors.push('Explicá a qué se refiere “Otros”.');
  return errors;
}
function reviewHTML(r){return '<p class="notice"><strong>DEMO: no se guarda ni se envía información</strong><br>Estado ficticio AL CIERRE DE LA JORNADA.</p>'+detailRows([
  ['Participante',r.person],['Servicio',r.service],['Fecha y hora de Argentina',formatDate(r.date)],
  ...roomDefs.map(([id,label])=>[label,`${r.rooms[id].count}${r.rooms[id].numbers?' · '+r.rooms[id].numbers:''}`]),
  ...defs.map(([id,label])=>[label,selected(r.states[id]).map(v=>v+(r.details[id]?.[v]?': '+r.details[id][v]:'')).join(' · ')]),
  ['Habitaciones sin QR',r.qrRooms||'Ninguna'],['Materiales',r.materials.join(' · ')||'Sin selección'],['Otras novedades',r.notes||'Sin novedades adicionales']
])+photoGalleryHTML(r.photos);}
function discardPhotos(){photos.forEach(p=>URL.revokeObjectURL(p.url));photos=[];$('#photos').replaceChildren();$('#dialog-body').replaceChildren();}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},6500);}
$('#closing-form').addEventListener('submit',e=>{
  e.preventDefault();if(uploadBusy){toast('Esperá a que termine la vista previa.');return;}
  syncDetails();const r=collect(),errors=validationErrors(r);
  if(errors.length){$('#form-message').textContent=errors.join(' ');$('#form-message').scrollIntoView({block:'center'});return;}
  if(!$('#closing-form').reportValidity())return;
  $('#dialog-body').innerHTML=reviewHTML(r);$('#review').showModal();
});
for(const id of ['close-dialog','correct'])$('#'+id).addEventListener('click',()=>{$('#review').close();$('#dialog-body').replaceChildren();});
$('#simulate').addEventListener('click',()=>{
  $('#review').close();discardPhotos();$('#closing-form').reset();
  roomDefs.forEach(([id])=>{$(`#${id}-rooms`).disabled=true;$(`#${id}-rooms`).required=false;});
  $('#qr-extra').hidden=true;$('#qr-rooms').required=false;syncDetails();updatePhotoCategoryIcon();
  $('#form-message').textContent='';$('#done').showModal();
});
$('#restart').addEventListener('click',()=>{$('#done').close();$('#person').focus();});
window.addEventListener('pagehide',discardPhotos);
$('#clock').textContent=formatDate(new Date());
syncDetails();
