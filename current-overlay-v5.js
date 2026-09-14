/* BUILD 6277 — hard opaque current bands; <0.05 m/s unfilled; dense short raw arrows. */
(function(){
 let rasterLayer=null,arrowGroup=null;
 const bands=[
  [.10,[206,232,203,255]],[.20,[151,211,145,255]],[.30,[91,177,104,255]],
  [.40,[207,197,54,255]],[.60,[224,154,39,255]],[Infinity,[181,55,45,255]]
 ];
 function rgba(v){if(v<.05)return null;for(const b of bands)if(v<b[0])return b[1];return bands[bands.length-1][1]}
 function raw(g,i,j){const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];if(!Number.isFinite(u)||!Number.isFinite(n))return null;const q=vdFrom(u,n);return {v:q.v,dir:q.dir}}
 function edge(a,first){if(a.length<2)return first?a[0]-.01:a[0]+.01;return first?a[0]-(a[1]-a[0])/2:a[a.length-1]+(a[a.length-1]-a[a.length-2])/2}
 function makeRaster(samples){
  const g=samples.numericGrid,W=g.xs.length,H=g.ys.length,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d',{alpha:true}),img=c.createImageData(W,H),d=img.data;
  for(let i=0;i<H;i++)for(let j=0;j<W;j++){
   const q=raw(g,i,j);if(!q)continue;const lat=g.ys[i],lon=g.xs[j];if(!insideRenderDomain(lat,lon)||isLandCoast(lat,lon))continue;
   const a=rgba(q.v);if(!a)continue;const k=((H-1-i)*W+j)*4;d[k]=a[0];d[k+1]=a[1];d[k+2]=a[2];d[k+3]=a[3];
  }
  c.putImageData(img,0,0);
  return {url:cv.toDataURL('image/png'),bounds:[[edge(g.ys,true),edge(g.xs,true)],[edge(g.ys,false),edge(g.xs,false)]]};
 }
 const renderer=L.canvas({padding:.12,pane:'currentVectorPane'});
 function arrow(group,lat,lon,q,latStep,lonStep){
  if(q.v<.05)return;
  const r=q.dir*Math.PI/180,cos=Math.max(.25,Math.cos(lat*Math.PI/180));
  const len=Math.min(latStep||.05,(lonStep||.08)*cos)*.27,dy=Math.cos(r)*len,dx=Math.sin(r)*len/cos;
  const tail=[lat-dy*.5,lon-dx*.5],head=[lat+dy*.5,lon+dx*.5],hlen=len*.28;
  function wing(b){const rr=b*Math.PI/180;return [head[0]+Math.cos(rr)*hlen,head[1]+Math.sin(rr)*hlen/cos]}
  L.polyline([tail,head,wing(q.dir+150),head,wing(q.dir-150)],{pane:'currentVectorPane',renderer,color:'#132f36',weight:1.55,opacity:1,interactive:false,lineCap:'round',lineJoin:'round'}).addTo(group);
 }
 function makeArrows(samples){
  const g=samples.numericGrid,group=L.layerGroup(),latStep=g.ys.length>1?Math.abs(g.ys[1]-g.ys[0]):.05,lonStep=g.xs.length>1?Math.abs(g.xs[1]-g.xs[0]):.08;
  for(let i=0;i<g.ys.length;i++)for(let j=0;j<g.xs.length;j++){
   const q=raw(g,i,j);if(!q)continue;const lat=g.ys[i],lon=g.xs[j];if(!insideRenderDomain(lat,lon)||isLandCoast(lat,lon))continue;arrow(group,lat,lon,q,latStep,lonStep)
  }
  return group;
 }
 drawNumericCurrent=function(samples,layer){
  const r=makeRaster(samples),nr=L.imageOverlay(r.url,r.bounds,{pane:'seaDataPane',opacity:1,interactive:false}),na=makeArrows(samples);
  nr.addTo(layer);na.addTo(layer);const or=rasterLayer,oa=arrowGroup;rasterLayer=nr;arrowGroup=na;
  if(or&&layer.hasLayer(or))layer.removeLayer(or);if(oa&&layer.hasLayer(oa))layer.removeLayer(oa);
 };
})();