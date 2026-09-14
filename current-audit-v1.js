/* BUILD 6271 — FiD reference audit for 2026-09-14 09:00 CEST (07:00Z). */
(function(){
 const REF_TIME='2026-09-14T07:00:00.000Z';
 const REF=[
  {name:'W',lat:56.98,lon:17.95,exp:225,label:'SW'},
  {name:'SW',lat:56.82,lon:17.95,exp:225,label:'SW'},
  {name:'S',lat:56.69,lon:18.18,exp:270,label:'W'},
  {name:'SE',lat:56.74,lon:18.48,exp:235,label:'SW'},
  {name:'E',lat:56.92,lon:18.62,exp:225,label:'SW'}
 ];
 function delta(a,b){let d=Math.abs((((a-b)+540)%360)-180);return d}
 function dir8(d){return ['N','NO','O','SO','S','SW','W','NW'][Math.round((((d%360)+360)%360)/45)%8]}
 function currentTime(){try{const d=new Date(timelineHours[timelineIndex]);d.setMinutes(0,0,0);return d.toISOString()}catch(e){return ''}}
 function ensureBox(){let el=document.getElementById('currentAudit');if(el)return el;el=document.createElement('div');el.id='currentAudit';el.style.cssText='position:absolute;left:14px;top:92px;z-index:900;background:rgba(7,54,68,.94);color:#fff;padding:9px 11px;border-radius:12px;font:700 12px/1.35 system-ui;max-width:320px;box-shadow:0 3px 12px #0003;pointer-events:none';document.getElementById('map')?.appendChild(el);return el}
 function audit(samples){
  const t=currentTime(),rows=REF.map(r=>{const q=numericVector(r.lat,r.lon,samples);if(!q)return {...r,actual:null,dd:null};return {...r,actual:q.dir,dd:delta(q.dir,r.exp),speed:q.v}});
  const valid=rows.filter(r=>Number.isFinite(r.actual));const mean=valid.length?valid.reduce((s,r)=>s+r.dd,0)/valid.length:NaN;window.GST_CURRENT_AUDIT={time:t,reference:'FiD screenshot 2026-09-14 09:00 CEST',rows,meanDelta:mean};
  const el=ensureBox();if(t!==REF_TIME){el.style.display='none';return}el.style.display='block';
  const ok=Number.isFinite(mean)&&mean<=35;el.innerHTML='<b>FiD ↔ DMI Richtungscheck</b><br>'+rows.map(r=>r.name+': FiD '+r.label+' · DMI '+(r.actual==null?'–':Math.round(r.actual)+'° '+dir8(r.actual))+(r.dd==null?'':' · Δ'+Math.round(r.dd)+'°')).join('<br>')+'<br><b>Ø Δ '+(Number.isFinite(mean)?Math.round(mean)+'°':'–')+' · '+(ok?'ähnlich':'abweichend')+'</b>';
 }
 const original=window.drawNumericCurrent;
 if(typeof original==='function')window.drawNumericCurrent=function(samples,layer){const out=original(samples,layer);try{audit(samples)}catch(e){console.warn('current audit',e)}return out};
})();