/* DMI live current loader for v6-test */
window.GST_DMI_CURRENT_URL='https://'+'opendataapi.dmi.dk/v1/forecastedr/collections/dkss_nsbs';
async function gstDmiCurrentQuery(){
 const d=new Date(timelineHours[timelineIndex]||Date.now());d.setMinutes(0,0,0);
 const q=new URLSearchParams({bbox:'17.65,56.65,19.95,58.15',crs:'crs84','parameter-name':'current-u,current-v',datetime:d.toISOString().replace('.000Z','Z'),f:'GeoJSON'});
 return json(window.GST_DMI_CURRENT_URL+'/cube?'+q.toString());
}
function gstDmiPoint(ft){
 const c=ft?.geometry?.coordinates||[],p=ft?.properties||{};
 const lon=Number(c[0]),lat=Number(c[1]),u=Number(p['current-u']),n=Number(p['current-v']);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(u)||!Number.isFinite(n))return null;
 const x=vdFrom(u,n);return {lat,lon,u,n,v:x.v,dir:x.dir,step:p.step||null};
}
async function gstDmiGrid(){
 const data=await gstDmiCurrentQuery();
 const pts=(data?.features||[]).map(gstDmiPoint).filter(Boolean);
 if(pts.length<100)throw Error('DMI-Raster unvollständig: '+pts.length);
 return {data,samples:prepareNumericGrid(pts)};
}
showNumericCurrent=async function(){
 currentLayer.clearLayers();active.current=true;updateTimeline();if(!map.hasLayer(currentLayer))currentLayer.addTo(map);
 status('Lade DMI HBM/HIROMB-Strömung…');
 const g=await gstDmiGrid(),s=g.samples;
 if(typeof drawNumericCurrent==='function')drawNumericCurrent(s,currentLayer);else{drawScalarBands(s,currentLayer,currentColor,true,'current');drawStaticVectors(s,currentLayer,'current')}
 updateLandCover();renderLegends();
 status('DMI DKSS/HBM · '+s.length.toLocaleString('de-DE')+' Strömungsvektoren');
};
const gstDmiOtherVectors=numericOriginalLoadVectors;
loadVectors=async function(kind){
 if(kind!=='current')return gstDmiOtherVectors(kind);
 try{await showNumericCurrent()}catch(e){console.error(e);currentLayer.clearLayers();active.current=true;updateTimeline();if(!map.hasLayer(currentLayer))currentLayer.addTo(map);updateLandCover();renderLegends();status('DMI-Strömung nicht verfügbar · '+(e?.message||e))}
};
