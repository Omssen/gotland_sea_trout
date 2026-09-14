/* BUILD 6270 — persistent DMI overlay. Build replacement first, then swap; no blank interval. */
(function(){
  let rasterLayer=null,arrowGroup=null;
  const bands=[
    [.05,[221,240,216,140]], [.10,[185,224,179,146]], [.16,[139,205,139,152]],
    [.23,[96,180,111,158]], [.31,[176,199,86,164]], [.40,[224,205,72,170]],
    [.50,[238,174,62,176]], [.65,[231,112,53,182]], [Infinity,[201,55,45,190]]
  ];
  function rgba(v){for(const b of bands)if(v<b[0])return b[1];return bands[bands.length-1][1]}
  function raw(g,i,j){const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];if(!Number.isFinite(u)||!Number.isFinite(n))return null;const q=vdFrom(u,n);return {u,n,v:q.v,dir:q.dir}}
  function edge(a,first){if(a.length<2)return first?a[0]-.01:a[0]+.01;return first?a[0]-(a[1]-a[0])/2:a[a.length-1]+(a[a.length-1]-a[a.length-2])/2}
  function makeRaster(samples){
    const g=samples.numericGrid,W=g.xs.length,H=g.ys.length,cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const c=cv.getContext('2d'),img=c.createImageData(W,H),d=img.data;
    for(let i=0;i<g.ys.length;i++)for(let j=0;j<g.xs.length;j++){
      const lat=g.ys[i],lon=g.xs[j],q=raw(g,i,j);if(!q||!insideRenderDomain(lat,lon)||isLandCoast(lat,lon))continue;
      const a=rgba(q.v),x=j,y=H-1-i,k=(y*W+x)*4;d[k]=a[0];d[k+1]=a[1];d[k+2]=a[2];d[k+3]=a[3]
    }
    c.putImageData(img,0,0);
    const bounds=[[edge(g.ys,true),edge(g.xs,true)],[edge(g.ys,false),edge(g.xs,false)]];
    return {url:cv.toDataURL('image/png'),bounds};
  }
  function addArrow(group,lat,lon,q,latStep,lonStep){
    if(q.v<.025)return;const r=q.dir*Math.PI/180,len=Math.min(latStep||.05,(lonStep||.08)*Math.cos(lat*Math.PI/180))*.55;
    const dy=Math.cos(r)*len,dx=Math.sin(r)*len/Math.max(.25,Math.cos(lat*Math.PI/180)),tail=[lat-dy*.5,lon-dx*.5],head=[lat+dy*.5,lon+dx*.5],hl=q.dir+155,hr=q.dir-155,hlen=len*.32;
    const p=b=>{const rr=b*Math.PI/180;return [head[0]+Math.cos(rr)*hlen,head[1]+Math.sin(rr)*hlen/Math.max(.25,Math.cos(lat*Math.PI/180))]};
    L.polyline([tail,head,p(hl),head,p(hr)],{pane:'currentVectorPane',renderer:arrowRenderer,color:'#142d34',weight:2,opacity:.86,interactive:false,lineCap:'round',lineJoin:'round'}).addTo(group);
  }
  const arrowRenderer=L.canvas({padding:.15,pane:'currentVectorPane'});
  function makeArrows(samples){
    const g=samples.numericGrid,group=L.layerGroup(),stride=3,latStep=g.ys.length>1?Math.abs(g.ys[1]-g.ys[0]):.05,lonStep=g.xs.length>1?Math.abs(g.xs[1]-g.xs[0]):.08;
    for(let i=0;i<g.ys.length;i+=stride)for(let j=0;j<g.xs.length;j+=stride){const lat=g.ys[i],lon=g.xs[j],q=raw(g,i,j);if(!q||!insideRenderDomain(lat,lon)||isLandCoast(lat,lon))continue;addArrow(group,lat,lon,q,latStep,lonStep)}
    return group;
  }
  drawNumericCurrent=function(samples,layer){
    const r=makeRaster(samples),newRaster=L.imageOverlay(r.url,r.bounds,{pane:'seaDataPane',opacity:1,interactive:false}),newArrows=makeArrows(samples);
    newRaster.addTo(layer);newArrows.addTo(layer);
    const oldRaster=rasterLayer,oldArrows=arrowGroup;rasterLayer=newRaster;arrowGroup=newArrows;
    if(oldRaster&&layer.hasLayer(oldRaster))layer.removeLayer(oldRaster);if(oldArrows&&layer.hasLayer(oldArrows))layer.removeLayer(oldArrows);
  };
})();