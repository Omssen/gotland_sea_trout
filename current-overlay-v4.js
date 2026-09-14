/* BUILD 6278 — sharp opaque speed bands, no fill below 0.05 m/s, raw-direction arrows. */
(function(){
 let rasterLayer=null,arrowGroup=null;
 const bands=[
  [.10,[206,232,203,255]],[.20,[151,211,145,255]],[.30,[91,177,104,255]],
  [.40,[207,197,54,255]],[.60,[224,154,39,255]],[Infinity,[181,55,45,255]]
 ];
 function rgba(v){if(v<.05)return null;for(const b of bands)if(v<b[0])return b[1];return bands[bands.length-1][1]}
 function raw(g,i,j){if(i<0||j<0||i>=g.ys.length||j>=g.xs.length)return null;const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];if(!Number.isFinite(u)||!Number.isFinite(n))return null;const q=vdFrom(u,n);return {v:q.v,dir:q.dir}}
 function edge(a,first){if(a.length<2)return first?a[0]-.01:a[0]+.01;return first?a[0]-(a[1]-a[0])/2:a[a.length-1]+(a[a.length-1]-a[a.length-2])/2}
 function speedAt(g,y,x){
  const i=Math.max(0,Math.min(g.ys.length-2,Math.floor(y))),j=Math.max(0,Math.min(g.xs.length-2,Math.floor(x))),fy=y-i,fx=x-j;
  const a=raw(g,i,j),b=raw(g,i,j+1),c=raw(g,i+1,j),d=raw(g,i+1,j+1);
  if(a&&b&&c&&d)return a.v*(1-fx)*(1-fy)+b.v*fx*(1-fy)+c.v*(1-fx)*fy+d.v*fx*fy;
  const q=raw(g,Math.round(y),Math.round(x));return q?q.v:NaN;
 }
 function makeRaster(samples){
  const g=samples.numericGrid,S=4,W=(g.xs.length-1)*S+1,H=(g.ys.length-1)*S+1,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d',{alpha:true}),img=c.createImageData(W,H),d=img.data;
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){
   const gy=py/S,gx=px/S,v=speedAt(g,gy,gx);if(!Number.isFinite(v))continue;
   const i=Math.min(g.ys.length-1,gy),j=Math.min(g.xs.length-1,gx);
   const y0=Math.floor(i),x0=Math.floor(j),fy=i-y0,fx=j-x0;
   const y1=Math.min(g.ys.length-1,y0+1),x1=Math.min(g.xs.length-1,x0+1);
   const lat=g.ys[y0]*(1-fy)+g.ys[y1]*fy,lon=g.xs[x0]*(1-fx)+g.xs[x1]*fx;
   if(!insideRenderDomain(lat,lon)||isLandCoast(lat,lon))continue;
   const a=rgba(v);if(!a)continue;const k=((H-1-py)*W+px)*4;d[k]=a[0];d[k+1]=a[1];d[k+2]=a[2];d[k+3]=a[3];
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
  nr.addTo(layer);na.addTo(layer);if(nr._image){nr._image.style.imageRendering='pixelated';nr._image.style.opacity='1'}
  const or=rasterLayer,oa=arrowGroup;rasterLayer=nr;arrowGroup=na;
  if(or&&layer.hasLayer(or))layer.removeLayer(or);if(oa&&layer.hasLayer(oa))layer.removeLayer(oa);
 };
})();