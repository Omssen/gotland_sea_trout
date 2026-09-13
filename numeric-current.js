/* Gotland Sea Trout v6.2.4k CURRENT TRUTH PATCH
   Reference data: 2026-09-13 12:00 CEST / 10:00 UTC
   Copernicus Marine / SMHI, cmems_mod_bal_phy_anfc_PT1H-i
*/
let numericGridCache=null;

function prepareNumericGrid(samples){
  const ys=[...new Set(samples.map(p=>p.lat))].sort((a,b)=>a-b);
  const xs=[...new Set(samples.map(p=>p.lon))].sort((a,b)=>a-b);
  const yi=new Map(ys.map((v,i)=>[v,i])), xi=new Map(xs.map((v,i)=>[v,i]));
  const cols=xs.length, uu=new Float32Array(ys.length*cols), nn=new Float32Array(ys.length*cols);
  uu.fill(NaN); nn.fill(NaN);
  for(const p of samples){ const k=yi.get(p.lat)*cols+xi.get(p.lon); uu[k]=p.u; nn[k]=p.n; }
  samples.numericGrid={ys,xs,cols,uu,nn};
  return samples;
}
function numericBracket(a,x){
  if(!a.length||x<a[0]||x>a[a.length-1])return null;
  let l=0,h=a.length-1;
  while(h-l>1){const m=(l+h)>>1;if(a[m]<=x)l=m;else h=m}
  if(x===a[h])return[h,h,0];
  return[l,h,(x-a[l])/(a[h]-a[l]||1)];
}
function numericVector(lat,lon,samples){
  const g=samples?.numericGrid, by=g&&numericBracket(g.ys,lat), bx=g&&numericBracket(g.xs,lon);
  if(!by||!bx)return null;
  const [i0,i1,ty]=by,[j0,j1,tx]=bx;
  const cells=[[i0,j0,(1-tx)*(1-ty)],[i0,j1,tx*(1-ty)],[i1,j0,(1-tx)*ty],[i1,j1,tx*ty]];
  let su=0,sn=0,sw=0;
  for(const [i,j,w] of cells){
    const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];
    if(Number.isFinite(u)&&Number.isFinite(n)){su+=u*w;sn+=n*w;sw+=w}
  }
  return sw?vdFrom(su/sw,sn/sw):null;
}
async function loadNumericGridFile(){
  if(numericGridCache)return numericGridCache;
  const response=await fetch('data/current/latest.json?v=6251',{cache:'no-store'});
  if(!response.ok)throw Error('Grid HTTP '+response.status);
  const data=await response.json();
  const samples=prepareNumericGrid((data.points||[]).map(p=>{
    const u=+p.u,n=+p.v,x=vdFrom(u,n);
    return {lat:+p.lat,lon:+p.lon,u,n,v:x.v,dir:x.dir};
  }).filter(p=>Number.isFinite(p.u)&&Number.isFinite(p.n)));
  if(samples.length<1000)throw Error('Grid unvollständig: '+samples.length);
  numericGridCache={data,samples};
  return numericGridCache;
}
const numericOldNearest=nearestVectorFast, numericOldIdw=idwVector;
nearestVectorFast=(lat,lon,s)=>s?.numericGrid?numericVector(lat,lon,s):numericOldNearest(lat,lon,s);
idwVector=(lat,lon,s)=>s?.numericGrid?numericVector(lat,lon,s):numericOldIdw(lat,lon,s);

async function showNumericCurrent(){
  currentLayer.clearLayers(); active.current=true; updateTimeline();
  if(!map.hasLayer(currentLayer))currentLayer.addTo(map);
  status('Lade validiertes Copernicus/SMHI-Grid…');
  const g=await loadNumericGridFile(), s=g.samples;
  const chosen=timelineHours[timelineIndex]||new Date(), have=new Date(g.data.requested_utc_time);
  if(Number.isFinite(have.getTime())&&Math.abs(chosen-have)>31*60000){
    throw Error('Referenz-Grid gilt für 13.09.2026 12:00 CEST');
  }
  if(typeof drawNumericCurrent==='function') drawNumericCurrent(s,currentLayer);
  else { drawScalarBands(s,currentLayer,currentColor,true,'current'); drawStaticVectors(s,currentLayer,'current'); }
  updateLandCover(); renderLegends();
  status(`NUMERISCH · ${s.length.toLocaleString('de-DE')} validierte CMEMS-Strömungsvektoren · lokales Raster`);
}

/* Critical wiring fix: app.js previously kept calling the browser CMEMS request and
   therefore fell back to WMTS. Route only the current layer to the validated local grid.
   All other vector layers keep their existing app.js behaviour. */
const numericOriginalLoadVectors=loadVectors;
loadVectors=async function(kind){
  if(kind!=='current')return numericOriginalLoadVectors(kind);
  try{
    await showNumericCurrent();
  }catch(e){
    console.error('Validiertes Current-Grid konnte nicht geladen werden:',e);
    currentLayer.clearLayers();
    active.current=true; updateTimeline();
    if(!map.hasLayer(currentLayer))currentLayer.addTo(map);
    updateLandCover(); renderLegends();
    status('Strömungsraster nicht verfügbar · kein WMTS-Ersatzbild, damit keine Scheingenauigkeit entsteht.');
  }
};
