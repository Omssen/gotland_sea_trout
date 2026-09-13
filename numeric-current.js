/* Gotland Sea Trout v6.2.4d FLOWLINE TEST
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
function numericNearestIndex(a,x){
  const b=numericBracket(a,x);if(!b)return null;
  return Math.abs(a[b[0]]-x)<=Math.abs(a[b[1]]-x)?b[0]:b[1];
}
/* Display-only coastal fill. Copernicus wet points stay untouched; this only bridges
   small holes in the model land/wet mask by averaging nearby valid sea cells. */
function numericCoastalVector(lat,lon,samples){
  const direct=numericVector(lat,lon,samples);if(direct)return direct;
  if(isLandCoast(lat,lon))return null;
  const g=samples?.numericGrid;if(!g)return null;
  const ci=numericNearestIndex(g.ys,lat),cj=numericNearestIndex(g.xs,lon);if(ci==null||cj==null)return null;
  let su=0,sn=0,sw=0,count=0,bestKm=Infinity;
  for(let r=1;r<=3;r++){
    for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++){
      if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
      const i=ci+di,j=cj+dj;if(i<0||j<0||i>=g.ys.length||j>=g.xs.length)continue;
      const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];if(!Number.isFinite(u)||!Number.isFinite(n))continue;
      const dy=(g.ys[i]-lat)*111.2,dx=(g.xs[j]-lon)*111.2*Math.cos(lat*Math.PI/180),km=Math.hypot(dx,dy);
      if(km>6.5)continue;
      const w=1/Math.max(.35,km*km);su+=u*w;sn+=n*w;sw+=w;count++;bestKm=Math.min(bestKm,km);
    }
    if(count>=3)break;
  }
  if(!sw)return null;
  const x=vdFrom(su/sw,sn/sw);x.coastalFill=true;x.fillKm=bestKm;return x;
}
async function loadNumericGridFile(){
  if(numericGridCache)return numericGridCache;
  const response=await fetch('data/current/latest.json?v=6243');
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
nearestVectorFast=(lat,lon,s)=>s?.numericGrid?numericCoastalVector(lat,lon,s):numericOldNearest(lat,lon,s);
idwVector=(lat,lon,s)=>s?.numericGrid?numericCoastalVector(lat,lon,s):numericOldIdw(lat,lon,s);

function numericMix(a,b,t){return Math.round(a+(b-a)*t)}
function numericRgb(hex){let h=hex.replace('#',''),n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
function numericCurrentColor(v){
  const stops=[[0,'#edf7ef'],[.05,'#dbeed9'],[.10,'#c3e3be'],[.16,'#9fd59d'],[.23,'#7ac77d'],[.31,'#58b96b'],[.40,'#b9d965'],[.50,'#e2cf55'],[.62,'#efa84b'],[.75,'#e66d43']];
  if(v<=stops[0][0])return numericRgb(stops[0][1]);
  for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){
    const [v0,c0]=stops[i-1],[v1,c1]=stops[i],t=(v-v0)/(v1-v0),a=numericRgb(c0),b=numericRgb(c1);
    return[numericMix(a[0],b[0],t),numericMix(a[1],b[1],t),numericMix(a[2],b[2],t)];
  }
  return numericRgb(stops[stops.length-1][1]);
}
function numericSmoothCurrentLayer(samples){
  const Smooth=L.GridLayer.extend({createTile:function(coords){
    const tile=L.DomUtil.create('canvas','numericSmoothCurrent'),size=this.getTileSize();
    tile.width=size.x;tile.height=size.y;
    const ctx=tile.getContext('2d',{alpha:true}),factor=3,margin=5;
    const low=document.createElement('canvas'),lw=Math.ceil(size.x/factor)+margin*2,lh=Math.ceil(size.y/factor)+margin*2;
    low.width=lw;low.height=lh;
    const lc=low.getContext('2d',{alpha:true}),img=lc.createImageData(lw,lh),data=img.data;
    const origin=L.point(coords.x*size.x,coords.y*size.y);
    for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
      const px=(x-margin)*factor+factor/2,py=(y-margin)*factor+factor/2;
      const ll=map.unproject(origin.add([px,py]),coords.z);
      if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
      const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
      const rgb=numericCurrentColor(q.v),k=(y*lw+x)*4,fade=domainFade(ll.lat,ll.lng);
      data[k]=rgb[0];data[k+1]=rgb[1];data[k+2]=rgb[2];data[k+3]=Math.round((q.coastalFill?142:166)*fade);
    }
    lc.putImageData(img,0,0);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='blur(3px)';
    ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);ctx.filter='none';
    return tile;
  }});
  return new Smooth({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:false,updateWhenZooming:false,keepBuffer:2,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]],className:'numericSmoothCurrentLayer'});
}
function numericFlowSeeds(){
  const size=map.getSize(),z=map.getZoom(),spacing=z>=14?34:z>=12?40:z>=10?46:52,out=[];
  let row=0;
  for(let y=spacing*.5;y<size.y;y+=spacing,row++)for(let x=spacing*.5+(row%2?spacing*.5:0);x<size.x;x+=spacing){
    const ll=map.containerPointToLatLng([x,y]);
    if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
    out.push({lat:ll.lat,lon:ll.lng});if(out.length>=520)return out;
  }
  return out;
}
function numericStepPoint(lat,lon,dir,km){
  const r=dir*Math.PI/180,dLat=Math.cos(r)*km/111.2,dLon=Math.sin(r)*km/(111.2*Math.max(.2,Math.cos(lat*Math.PI/180)));
  return{lat:lat+dLat,lon:lon+dLon};
}
function numericFlowLine(seed,samples){
  let c={lat:seed.lat,lon:seed.lon},q=numericCoastalVector(c.lat,c.lon,samples);if(!q)return null;
  const speed=q.v,stepKm=Math.max(.45,Math.min(1.05,.50+speed*1.6)),back=[];
  let p={...c};
  for(let i=0;i<2;i++){
    const v=numericCoastalVector(p.lat,p.lon,samples);if(!v)break;
    const n=numericStepPoint(p.lat,p.lon,(v.dir+180)%360,stepKm);if(isLandCoast(n.lat,n.lon))break;back.unshift([n.lat,n.lon]);p=n;
  }
  const forward=[[c.lat,c.lon]];p={...c};let last=q;
  for(let i=0;i<4;i++){
    const v=numericCoastalVector(p.lat,p.lon,samples);if(!v)break;last=v;
    const n=numericStepPoint(p.lat,p.lon,v.dir,stepKm);if(isLandCoast(n.lat,n.lon))break;forward.push([n.lat,n.lon]);p=n;
  }
  const pts=back.concat(forward);if(pts.length<2)return null;
  return{pts,speed,dir:last.dir,end:pts[pts.length-1],fill:q.coastalFill};
}
function numericFlowHead(dir,v,filled){
  const s=Math.min(1,v/.55),sz=10+s*4,opacity=filled?.58:.82;
  return L.divIcon({className:'currentGlyph',html:`<span style="display:block;font-size:${sz}px;line-height:${sz}px;color:rgba(20,45,52,${opacity});transform:rotate(${dir-90}deg);transform-origin:center">›</span>`,iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
}
function drawNumericCurrent(samples,layer){
  numericSmoothCurrentLayer(samples).addTo(layer);
  for(const seed of numericFlowSeeds()){
    const f=numericFlowLine(seed,samples);if(!f)continue;
    const weight=1.15+Math.min(1.35,f.speed/.38),opacity=f.fill?.42:.68;
    L.polyline(f.pts,{pane:'currentVectorPane',color:'#173d48',weight,opacity,interactive:false,smoothFactor:1.35,lineCap:'round',lineJoin:'round'}).addTo(layer);
    L.marker(f.end,{pane:'currentVectorPane',icon:numericFlowHead(f.dir,f.speed,f.fill),keyboard:false,interactive:false}).addTo(layer);
  }
}

async function showNumericCurrent(){
  currentLayer.clearLayers(); active.current=true; updateTimeline();
  if(!map.hasLayer(currentLayer))currentLayer.addTo(map);
  status('Lade numerisches Copernicus/SMHI-Grid…');
  const g=await loadNumericGridFile(), s=g.samples;
  const chosen=timelineHours[timelineIndex]||new Date(), have=new Date(g.data.requested_utc_time);
  if(Math.abs(chosen-have)>31*60000)throw Error('Referenz-Grid gilt für 13.09.2026 12:00 CEST');
  drawNumericCurrent(s,currentLayer);
  updateLandCover(); renderLegends();
  status(`NUMERISCH · ${s.length.toLocaleString('de-DE')} CMEMS uo/vo-Punkte · statische Flusslinien · Küstenlücken bis 6 km interpoliert`);
}

/* Bridge: make every existing current-layer trigger use the numeric grid.
   For times outside the one published test grid, keep the official WMTS as a safe fallback. */
const numericOldLoadVectors=loadVectors;
loadVectors=async function(kind){
  if(kind!=='current')return numericOldLoadVectors(kind);
  try{await showNumericCurrent();}
  catch(e){
    console.warn('Numeric current unavailable for selected time; WMTS fallback:',e);
    currentLayer.clearLayers();active.current=true;updateTimeline();
    if(!map.hasLayer(currentLayer))currentLayer.addTo(map);
    officialCurrentWmtsLayer().addTo(currentLayer);
    updateLandCover();renderLegends();
    status('Strömung · WMTS-Fallback · numerisches Test-Grid nur für 13.09.2026 12:00 CEST');
  }
};
