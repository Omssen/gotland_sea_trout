window.GST_DMI_CURRENT_URL='https://'+'opendataapi.dmi.dk/v1/forecastedr/collections/dkss_nsbs';
let gstRuns=null;
function gstRunDate(id){
 const s=String(id||'');
 const d=new Date(s);
 if(Number.isFinite(d.getTime()))return d;
 const y=+s.slice(0,4),m=+s.slice(5,7),day=+s.slice(8,10),h=+s.slice(11,13),mi=+s.slice(13,15),se=+s.slice(15,17);
 const x=new Date(Date.UTC(y,m-1,day,h,mi||0,se||0));
 return Number.isFinite(x.getTime())?x:null;
}
function gstIds(data){
 const out=[];
 const scan=x=>{if(Array.isArray(x)){x.forEach(scan);return}if(x&&typeof x==='object'){if(typeof x.id==='string'&&gstRunDate(x.id))out.push(x.id);Object.values(x).forEach(scan)}};
 scan(data);return [...new Set(out)];
}
async function gstLoadRuns(){
 if(gstRuns)return gstRuns;
 const data=await json(window.GST_DMI_CURRENT_URL+'/instances');
 gstRuns=gstIds(data).map(id=>({id,date:gstRunDate(id)})).filter(x=>x.date).sort((a,b)=>a.date-b.date);
 if(!gstRuns.length)throw Error('DMI-Modellläufe nicht gefunden');
 return gstRuns;
}
async function gstPickRun(target){
 const runs=await gstLoadRuns();
 const limit=Math.min(target.getTime(),Date.now());
 let pick=runs[0];
 for(const r of runs)if(r.date.getTime()<=limit)pick=r;
 return pick;
}
async function gstDmiCurrentQuery(){
 const d=new Date(timelineHours[timelineIndex]||Date.now());d.setMinutes(0,0,0);
 const run=await gstPickRun(d);
 const q=new URLSearchParams({bbox:'17.65,56.65,19.95,58.15',crs:'crs84','parameter-name':'current-u,current-v',datetime:d.toISOString(),f:'GeoJSON'});
 const url=window.GST_DMI_CURRENT_URL+'/instances/'+encodeURIComponent(run.id)+'/cube?'+q.toString();
 const data=await json(url);data._gstRun=run.id;return data;
}
function gstDmiPoint(ft){
 const c=ft&&ft.geometry&&ft.geometry.coordinates||[],p=ft&&ft.properties||{};
 const lon=Number(c[0]),lat=Number(c[1]),u=Number(p['current-u']),n=Number(p['current-v']);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(u)||!Number.isFinite(n))return null;
 const x=vdFrom(u,n);return {lat,lon,u,n,v:x.v,dir:x.dir,step:p.step||null};
}
async function gstDmiGrid(){
 const data=await gstDmiCurrentQuery();
 const pts=(data.features||[]).map(gstDmiPoint).filter(Boolean);
 if(pts.length<100)throw Error('DMI-Raster unvollständig: '+pts.length+' Punkte');
 return {data,samples:prepareNumericGrid(pts)};
}
showNumericCurrent=async function(){
 currentLayer.clearLayers();active.current=true;updateTimeline();if(!map.hasLayer(currentLayer))currentLayer.addTo(map);
 status('Lade DMI HBM/HIROMB-Strömung…');
 const g=await gstDmiGrid(),s=g.samples;
 if(typeof drawNumericCurrent==='function')drawNumericCurrent(s,currentLayer);else{drawScalarBands(s,currentLayer,currentColor,true,'current');drawStaticVectors(s,currentLayer,'current')}
 updateLandCover();renderLegends();status('DMI DKSS/HBM · '+s.length.toLocaleString('de-DE')+' Vektoren · Lauf '+g.data._gstRun);
};
const gstDmiOtherVectors=numericOriginalLoadVectors;
loadVectors=async function(kind){
 if(kind!=='current')return gstDmiOtherVectors(kind);
 try{await showNumericCurrent()}catch(e){console.error('DMI current',e);currentLayer.clearLayers();active.current=true;updateTimeline();if(!map.hasLayer(currentLayer))currentLayer.addTo(map);updateLandCover();renderLegends();status('DMI-Strömung nicht verfügbar · '+(e&&e.message||e))}
};
