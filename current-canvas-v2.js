/* BUILD 6268 — direct DMI grid renderer. No smoothing/interpolated arrow directions. */
(function(){
 let samples=null,canvas=null,timer=null,layerInstance=null;
 const bands=[
  [.05,'rgba(221,240,216,.46)'],
  [.10,'rgba(185,224,179,.48)'],
  [.16,'rgba(139,205,139,.50)'],
  [.23,'rgba(96,180,111,.52)'],
  [.31,'rgba(176,199,86,.54)'],
  [.40,'rgba(224,205,72,.56)'],
  [.50,'rgba(238,174,62,.58)'],
  [.65,'rgba(231,112,53,.60)'],
  [Infinity,'rgba(201,55,45,.62)']
 ];
 function color(v){for(const b of bands)if(v<b[0])return b[1];return bands[bands.length-1][1]}
 function raw(g,i,j){const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];if(!Number.isFinite(u)||!Number.isFinite(n))return null;const q=vdFrom(u,n);return {u,n,v:q.v,dir:q.dir}}
 function mid(a,b){return(a+b)/2}
 function cellBounds(a,i){const lo=i?mid(a[i-1],a[i]):a[i]-(a[i+1]-a[i])/2,hi=i<a.length-1?mid(a[i],a[i+1]):a[i]+(a[i]-a[i-1])/2;return[lo,hi]}
 function arrow(c,x,y,q){if(q.v<.018){c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fillStyle='rgba(20,45,52,.68)';c.fill();return}const r=q.dir*Math.PI/180,dx=Math.sin(r),dy=-Math.cos(r),L=17,H=5,x1=x-dx*L/2,y1=y-dy*L/2,x2=x+dx*L/2,y2=y+dy*L/2,px=-dy,py=dx;c.strokeStyle='rgba(18,42,50,.88)';c.lineWidth=2;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.moveTo(x2-dx*H+px*3,y2-dy*H+py*3);c.lineTo(x2,y2);c.lineTo(x2-dx*H-px*3,y2-dy*H-py*3);c.stroke()}
 function draw(){
  if(!canvas||!samples?.numericGrid)return;
  const g=samples.numericGrid,size=map.getSize(),w=size.x,h=size.y,d=Math.min(1.5,window.devicePixelRatio||1),bounds=map.getBounds();
  canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);canvas.style.width=w+'px';canvas.style.height=h+'px';L.DomUtil.setPosition(canvas,map.containerPointToLayerPoint([0,0]));
  const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
  for(let i=0;i<g.ys.length;i++){
   const lat=g.ys[i];if(lat<bounds.getSouth()-.08||lat>bounds.getNorth()+.08)continue;const [s,n]=cellBounds(g.ys,i);
   for(let j=0;j<g.xs.length;j++){
    const lon=g.xs[j];if(lon<bounds.getWest()-.12||lon>bounds.getEast()+.12)continue;const q=raw(g,i,j);if(!q||isLandCoast(lat,lon)||!insideRenderDomain(lat,lon))continue;
    const [ww,e]=cellBounds(g.xs,j),p1=map.latLngToContainerPoint([n,ww]),p2=map.latLngToContainerPoint([s,e]);
    const x=Math.floor(Math.min(p1.x,p2.x)),y=Math.floor(Math.min(p1.y,p2.y)),cw=Math.ceil(Math.abs(p2.x-p1.x))+1,ch=Math.ceil(Math.abs(p2.y-p1.y))+1;
    if(x>w||y>h||x+cw<0||y+ch<0)continue;c.fillStyle=color(q.v);c.fillRect(x,y,cw,ch);
   }
  }
  const z=map.getZoom(),stride=z>=13?1:z>=11?2:3;
  for(let i=0;i<g.ys.length;i+=stride){const lat=g.ys[i];if(lat<bounds.getSouth()||lat>bounds.getNorth())continue;for(let j=0;j<g.xs.length;j+=stride){const lon=g.xs[j];if(lon<bounds.getWest()||lon>bounds.getEast())continue;const q=raw(g,i,j);if(!q||isLandCoast(lat,lon)||!insideRenderDomain(lat,lon))continue;const p=map.latLngToContainerPoint([lat,lon]);arrow(c,p.x,p.y,q)}}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(draw,80)}
 const Layer=L.Layer.extend({onAdd(){canvas=L.DomUtil.create('canvas','gstCurrentCanvas');canvas.style.position='absolute';canvas.style.pointerEvents='none';map.getPane('currentVectorPane').appendChild(canvas);map.on('moveend zoomend resize',schedule);draw()},onRemove(){map.off('moveend zoomend resize',schedule);clearTimeout(timer);canvas?.remove();canvas=null}});
 drawNumericCurrent=function(s,layer){samples=s;if(layerInstance&&layer.hasLayer(layerInstance))layer.removeLayer(layerInstance);layerInstance=new Layer();layerInstance.addTo(layer)};
})();