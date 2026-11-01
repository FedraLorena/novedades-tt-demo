/* Catálogo de habitaciones por servicio. No contiene asignaciones de personas. */
(function(root){
  'use strict';
  const ranges=Object.freeze({'2 A':[201,214],'2 B':[215,228],'2 C':[229,242],'2 D':[243,256],'1 A':[151,159],'1 B':[160,169],UTIP:[101,109],UTIA:[130,142],UCO:[117,129]});
  const roles=Object.freeze(['Soporte','Altas','Generales']);
  const normalize=v=>String(v||'').trim().toUpperCase().replace(/^([12])\s*([ABCD])$/,'$1 $2');
  function expand(service){
    let floor='';return [...new Set(String(service||'').split('+').map(part=>{
      let key=normalize(part);if(/^[12] [ABCD]$/.test(key))floor=key[0];else if(/^[ABCD]$/.test(key)&&floor)key=floor+' '+key;
      return key;
    }).filter(key=>Object.hasOwn(ranges,key)))];
  }
  const isRole=service=>roles.some(v=>v.toUpperCase()===normalize(service));
  function scope(service,concrete=[]){return isRole(service)?[...new Set((Array.isArray(concrete)?concrete:[]).map(normalize).filter(v=>Object.hasOwn(ranges,v)))]:expand(service);}
  const numbers=services=>[...new Set(services.flatMap(key=>{const r=ranges[key];return r?Array.from({length:r[1]-r[0]+1},(_,i)=>String(r[0]+i)):[];}))].sort((a,b)=>Number(a)-Number(b));
  const parse=value=>String(value||'').split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean);
  function problems(record){
    const result=[],concrete=record.roomServices??[];
    const validConcrete=Array.isArray(concrete)&&concrete.every(v=>typeof v==='string'&&Object.hasOwn(ranges,normalize(v)))&&new Set(concrete.map(normalize)).size===concrete.length;
    const services=scope(record.service,validConcrete?concrete:[]),allowed=new Set(numbers(services));
    if(!validConcrete)result.push({field:'scope',message:'Servicios de las habitaciones: elegí servicios concretos válidos, sin repetir.'});
    const labels={vs:'Habitaciones vacías sucias (VS)',dismantled:'Habitaciones desmanteladas',isolation:'Aislamientos'};
    for(const id of ['vs','dismantled','isolation']){
      const entry=record.rooms?.[id],list=parse(entry?.numbers);
      if(!entry||entry.count!==list.length||new Set(list).size!==list.length||list.some(v=>!allowed.has(v)))result.push({field:id,message:labels[id]+': seleccioná habitaciones de los servicios elegidos; la cantidad debe coincidir, sin repetir.'});
    }
    const qr=parse(record.qrRooms);
    if(record.states?.qr==='Sí'&&!qr.length)result.push({field:'qr',message:'Habitaciones sin QR: seleccioná al menos una habitación. Para Soporte, Altas o Generales, elegí primero los servicios concretos.'});
    if(record.states?.qr!=='Sí'&&qr.length||new Set(qr).size!==qr.length||qr.some(v=>!allowed.has(v)))result.push({field:'qr',message:'Habitaciones sin QR: revisá la selección del servicio, sin repetir.'});
    return result;
  }
  const errors=record=>problems(record).map(p=>p.message);
  const api=Object.freeze({ranges,roles,expand,isRole,scope,numbers,parse,errors,problems});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TTRooms=api;
})(typeof globalThis!=='undefined'?globalThis:this);

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
options('#person',['Participante DEMO 1','Participante DEMO 2']);options('#service',['1 A','1 B','UTIP','1 B + UTIP','1 A + 1 B + UTIP','UCO','UTIA','UCO + UTIA','2 A','2 B','2 C','2 D','2 A + B','2 B + C','2 C + D','Soporte','Altas','Generales']);
$('#room-fields').innerHTML=roomDefs.map(([id,label])=>`<div class="room-row"><label for="${id}-count">${id==='isolation'?'<span aria-hidden="true">🦠</span> ':''}${label}</label><input id="${id}-count" type="number" min="0" max="500" value="0" required aria-label="Cantidad de ${label}"><input id="${id}-rooms" type="text" maxlength="1500" placeholder="Números: 201, 202" aria-label="Números de ${label}" disabled></div>`).join('');
$('#status-fields').innerHTML=defs.map(([id,title,values])=>`<fieldset class="status-row"><legend>${id==='cart'?CleaningCart.html()+' ':({keys:'🔑',checkout:'📋'})[id]?`<span aria-hidden="true">${({keys:'🔑',checkout:'📋'})[id]}</span> `:''}${title}</legend><div class="choices">${values.map((v,i)=>`<label class="choice"><input type="${multiIds.includes(id)?'checkbox':'radio'}" name="${id}" value="${v}" ${i===0&&!multiIds.includes(id)?'required':''}>${v}</label>`).join('')}</div><div id="${id}-details">${values.filter(needsDetail).map(v=>`<label class="conditional" hidden>${v==='Con observaciones'?'Detallá cómo queda al cierre':'¿Qué queda pendiente al cierre?'}<textarea data-detail="${id}" data-condition="${v}" maxlength="800" rows="2" disabled></textarea></label>`).join('')}</div>${id==='qr'?'<div class="conditional" id="qr-extra" hidden><p>Habitaciones sin QR</p><input id="qr-rooms" type="text" maxlength="1500" placeholder="Ej.: 201, 202"></div>':''}</fieldset>`).join('');
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
  $('#photos').innerHTML=photos.map((p,i)=>`<div class="photo"><button type="button" class="photo-enlarge" data-enlarge="${i}" aria-label="Ampliar foto de ${esc(p.category)}"><img src="${p.url}" alt="Estado al cierre: ${esc(p.category)}"><span>🔎 Ampliar</span></button><label>${p.category==='Carro de limpieza'?CleaningCart.html():''} Categoría<select data-category="${i}">${photoCategories.map(c=>`<option value="${esc(c)}" ${c===p.category?'selected':''}>${esc(photoLabel(c))}</option>`).join('')}</select></label><div class="photo-controls"><button type="button" class="secondary" data-remove="${i}">Eliminar</button><label class="upload">Reemplazar<input type="file" accept="image/*" data-replace="${i}" aria-label="Reemplazar foto de ${esc(p.category)}"></label></div></div>`).join('');
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
    if(!Number.isInteger(count)||count<0||count>500||parts.length!==count||new Set(parts).size!==parts.length)errors.push(`${label}: revisá cantidad y números, sin repeticiones.`);
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
  ['Participante',r.person],['Servicio',r.service],...(r.roomServices?.length?[['Servicios de las habitaciones',r.roomServices.join(' · ')]]:[]),['Fecha y hora de Argentina',formatDate(r.date)],
  ...roomDefs.map(([id,label])=>[label,`${r.rooms[id].count}${r.rooms[id].numbers?' · '+r.rooms[id].numbers:''}`]),
  ...defs.map(([id,label])=>[label,selected(r.states[id]).map(v=>v+(r.details[id]?.[v]?': '+r.details[id][v]:'')).join(' · ')]),
  ['Habitaciones sin QR',r.qrRooms||'Ninguna'],['Materiales',r.materials.join(' · ')||'Sin selección'],['Otras novedades',r.notes||'Sin novedades adicionales']
])+photoGalleryHTML(r.photos);}
function discardPhotos(){photos.forEach(p=>URL.revokeObjectURL(p.url));photos=[];$('#photos').replaceChildren();$('#dialog-body').replaceChildren();}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},6500);}
$('#closing-form').addEventListener('submit',e=>{
  e.preventDefault();if(uploadBusy){toast('Esperá a que termine la vista previa.');return;}
  syncDetails();if(!$('#closing-form').reportValidity())return;const r=collect(),errors=validationErrors(r);
  if(errors.length){$('#form-message').textContent=errors.join(' ');$('#form-message').scrollIntoView({block:'center'});return;}
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

/* Selector táctil: adapta solo habitaciones; no consulta ni valida fotografías. */
(function(){
  'use strict';
  const form=document.querySelector('#closing-form'),service=document.querySelector('#service');
  const ids=['vs','dismantled','isolation','qr'],chosen=Object.fromEntries(ids.map(id=>[id,new Set()]));
  let concrete=[];
  const error=document.createElement('p');error.className='validation-message';error.setAttribute('role','alert');error.hidden=true;
  const scopeBox=document.createElement('section');scopeBox.className='room-scope';scopeBox.id='room-scope';
  document.querySelector('#room-fields').before(scopeBox);
  const pickers={};
  for(const id of ids){
    const bridge=document.querySelector('#'+id+'-rooms');bridge.type='hidden';bridge.required=false;
    const host=document.createElement('div');host.className='room-picker';host.id=id+'-picker';host.tabIndex=-1;
    const title=id==='qr'?'Habitaciones sin QR':roomDefs.find(([key])=>key===id)[1];host.setAttribute('aria-label',title);
    if(id==='qr')document.querySelector('#qr-extra').append(host);
    else {document.querySelector('#'+id+'-count').type='hidden';document.querySelector('#'+id+'-count').max='500';bridge.after(host);}
    pickers[id]=host;
  }
  function currentScope(){return TTRooms.scope(service.value,concrete);}
  function sync(){
    if(!document.querySelector('input[name="qr"][value="Sí"]').checked)chosen.qr.clear();
    for(const id of ids){
      const list=[...chosen[id]].sort((a,b)=>Number(a)-Number(b)),bridge=document.querySelector('#'+id+'-rooms');
      bridge.value=list.join(', ');bridge.required=false;bridge.disabled=false;bridge.setCustomValidity('');
      if(id!=='qr')document.querySelector('#'+id+'-count').value=String(list.length);
      const count=pickers[id].querySelector('[data-room-count]');if(count)count.textContent=String(list.length);
    }
  }
  function renderScope(){
    scopeBox.hidden=!TTRooms.isRole(service.value);
    scopeBox.innerHTML='<p><strong>🏥 ¿En qué servicios necesitás informar habitaciones?</strong></p><p class="hint">Podés elegir varios. Soporte, Altas y Generales no tienen habitaciones propias. Si no informás habitaciones, no hace falta elegir servicios.</p><div class="choices">'+Object.keys(TTRooms.ranges).map(key=>`<label class="choice"><input type="checkbox" data-room-service="${key}" ${concrete.includes(key)?'checked':''}>${key}</label>`).join('')+'</div>';
  }
  function render(){
    error.hidden=true;
    const scope=currentScope(),allowed=new Set(TTRooms.numbers(scope));let removed=false;
    for(const id of ids){
      for(const number of chosen[id])if(!allowed.has(number)){chosen[id].delete(number);removed=true;}
      pickers[id].innerHTML=scope.length?`<details><summary>Elegir habitaciones · <span data-room-count aria-live="polite">${chosen[id].size}</span> seleccionadas</summary>${scope.map(key=>`<fieldset class="room-group"><legend>${key}</legend><div class="room-buttons">${TTRooms.numbers([key]).map(n=>`<label class="choice"><input type="checkbox" data-room-kind="${id}" value="${n}" ${chosen[id].has(n)?'checked':''}>${n}</label>`).join('')}</div></fieldset>`).join('')}</details>`:'<p class="hint">Elegí el servicio'+(TTRooms.isRole(service.value)?' o los servicios concretos':'')+' para ver las habitaciones.</p>';
    }
    sync();if(removed)toast('Se quitaron las habitaciones que no pertenecen a los servicios elegidos. Revisá las selecciones.');
  }
  scopeBox.addEventListener('change',e=>{if(!e.target.matches('[data-room-service]'))return;concrete=[...scopeBox.querySelectorAll('input:checked')].map(n=>n.dataset.roomService);render();});
  form.addEventListener('change',e=>{
    if(e.target===service){concrete=[];renderScope();render();}
    else if(e.target.matches('[data-room-kind]')){error.hidden=true;const set=chosen[e.target.dataset.roomKind];e.target.checked?set.add(e.target.value):set.delete(e.target.value);sync();}
    else if(e.target.name==='qr'){sync();render();}
  });
  // Ejecutar después de las validaciones de estados del formulario original.
  form.addEventListener('input',sync);
  const originalCollect=collect;
  collect=function(){sync();return {...originalCollect(),roomServices:currentScope()};};
  form.addEventListener('submit',e=>{
    sync();const problems=TTRooms.problems(collect());
    if(problems.length){
      e.preventDefault();e.stopImmediatePropagation();document.querySelector('#form-message').textContent=problems.map(p=>p.message).join(' ');
      const first=problems[0],host=first.field==='scope'?scopeBox:pickers[first.field],details=host.querySelector('details');
      host.before(error);error.textContent=first.message;error.hidden=false;if(details)details.open=true;host.scrollIntoView({block:'center',behavior:'smooth'});host.focus({preventScroll:true});
    }
  },true);
  form.addEventListener('reset',()=>{for(const id of ids)chosen[id].clear();concrete=[];queueMicrotask(()=>{renderScope();render();});});
  renderScope();render();
})();

/* Validación visible del formulario y ampliación local de fotos. Sin red. */
(function(){
  'use strict';
  const form=document.querySelector('#closing-form'),message=document.querySelector('#form-message');
  const inline=document.createElement('p');inline.id='field-validation-message';inline.className='validation-message';inline.setAttribute('role','alert');inline.hidden=true;
  let checking=false,firstInvalid=null;
  form.noValidate=true;
  function title(control){
    if(control.dataset.detail)return defs.find(([id])=>id===control.dataset.detail)[1]+' · '+control.dataset.condition;
    if(control.name&&defs.some(([id])=>id===control.name))return defs.find(([id])=>id===control.name)[1];
    return ({person:'Colaborador/a',service:'Servicio',notes:'Detalle de las novedades del cierre','qr-rooms':'Habitaciones sin QR'})[control.id]||control.getAttribute('aria-label')||'Campo del formulario';
  }
  function show(control){
    const label=title(control),reason=control.validity.valueMissing?'Completá o seleccioná este campo.':control.validationMessage||'Revisá el valor ingresado.';
    message.textContent=label+': '+reason;
    const target=control.type==='hidden'?document.querySelector('#'+control.id.replace('-rooms','-picker')):control;
    if(target){(target.closest('.status-row')||target.closest('label')||target).before(inline);inline.textContent=message.textContent;inline.hidden=false;target.closest('details')?.setAttribute('open','');target.scrollIntoView({block:'center',behavior:'smooth'});target.focus({preventScroll:true});}
    control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby','field-validation-message');
  }
  form.addEventListener('invalid',e=>{e.preventDefault();if(checking){if(!firstInvalid)firstInvalid=e.target;}else show(e.target);},true);
  form.addEventListener('submit',e=>{
    syncDetails();checking=true;firstInvalid=null;const valid=form.checkValidity();checking=false;
    if(!valid){e.preventDefault();e.stopImmediatePropagation();if(firstInvalid)show(firstInvalid);else {message.textContent='Revisá los campos obligatorios del cierre.';message.scrollIntoView({block:'center'});}}
  },true);
  form.addEventListener('input',e=>{inline.hidden=true;e.target.removeAttribute('aria-invalid');if(e.target.getAttribute('aria-describedby')==='field-validation-message')e.target.removeAttribute('aria-describedby');});
  const viewer=document.querySelector('#photo-preview'),image=document.querySelector('#photo-preview-image'),caption=document.querySelector('#photo-preview-caption');
  document.querySelector('#photos').addEventListener('click',e=>{
    const button=e.target.closest('[data-enlarge]');if(!button)return;
    const photo=photos[Number(button.dataset.enlarge)];if(!photo)return;
    image.src=photo.url;image.alt='Foto ficticia del cierre: '+photo.category;caption.textContent=photo.category;viewer.showModal();
  });
  function clearPreview(){image.removeAttribute('src');image.alt='';caption.textContent='';}
  document.querySelector('#close-photo-preview').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('close',clearPreview);
})();
