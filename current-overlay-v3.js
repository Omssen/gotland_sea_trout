/* BUILD 6269 — persistent DMI raster overlay + raw-grid arrows. No map redraw on pan/zoom. */
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
  function interp(g,fy,fx){
    const i0=Math.max(0,Math.min(g.ys.length-1,Math.floor(fy))),j0=Math.max(0,Math.min(g.xs.length-1,Math.floor(fx)));
    const i1=Math.min(g.ys.length-1,i0+1),j1=Math.min(g.xs.length-1,j0+1),ty=fy-i0,tx=fx-j0;
    let su=0,sn=0,sw=0;
    for(const [i,j,w] of [[i0,j0,(1-tx)*(1-ty)],[i0,j1,tx*(1-ty)],[i1,j0,(1-tx)*ty],[i1,j1,tx*ty]]){
      const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];if(Number.isFinite(u)&&Number.isFinite(n)){su+=u*w;sn+=n*w;sw+=w}
    }
    return sw?Math.hypot(su/sw,sn/sw):NaN;
  }
  function makeRaster(samples){
    const g=samples.numericGrid,scale=3,W=g.xs.length*scale,H=g.ys.length*scale,cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const c=cv.getContext('2d'),img=c.createImageData(W,H),d=img.data;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const fy=(H-1-y)/scale,fx=x/scale,i=Math.max(0,Math.min(g.ys.length-1,Math.round(fy))),j=Math.max(0,Math.min(g.xs.length-1,Math.round(fx)));
      const lat=g.ys[i],lon=g.xs[j];if(!insideRenderDomain(lat,lon)||isLandCoast(lat,lon))continue;
      const v=interp(g,fy,fx);if(!Number.isFinite(v))continue;const a=rgba(v),k=(y*W+x)*4;d[k]=a[0];d[k+1]=a[1];d[k+2]=a[2];d[k+3]=a[3]
    }
    c.putImageData(img,0,0);
    const bounds=[[edge(g.ys,true),edge(g.xs,true)],[edge(g.ys,false),edge(g.xs,false)]];
    return {url:cv.toDataURL('image/png'),bounds};
  }
  function addArrow(group,lat,lon,q,latStep,lonStep){
    if(q.v<.025)return;
    const r=q.dir*Math.PI/180,len=Math.min(latStep||.05,(lonStep||.08)*Math.cos(lat*Math.PI/180))*.55;
    const dy=Math.cos(r)*len,dx=Math.sin(r)*len/Math.max(.25,Math.cos(lat*Math.PI/180));
    const tail=[lat-dy*.5,lon-dx*.5],head=[lat+dy*.5,lon+dx*.5],hl=q.dir+155,hr=q.dir-155,hlen=len*.32;
    const p=(b)=>{const rr=b*Math.PI/180;return [head[0]+Math.cos(rr)*hlen,head[1]+Math.sin(rr)*hlen/Math.max(.25,Math.cos(lat*Math.PI/180))]};
    L.polyline([tail,head,p(hl),head,p(hr)],{pane:'currentVectorPane',renderer:arrowRenderer,color:'#142d34',weight:2,opacity:.86,interactive:false,lineCap:'round',lineJoin:'round'}).addTo(group);
  }
  const arrowRenderer=L.canvas({padding:.15,pane:'currentVectorPane'});
  function makeArrows(samples){
    const g=samples.numericGrid,group=L.layerGroup(),stride=2,latStep=g.ys.length>1?Math.abs(g.ys[1]-g.ys[0]):.05,lonStep=g.xs.length>1?Math.abs(g.xs[1]-g.xs[0]):.08;
    for(let i=0;i<g.ys.length;i+=stride)for(let j=0;j<g.xs.length;j+=stride){const lat=g.ys[i],lon=g.xs[j],q=raw(g,i,j);if(!q||!insideRenderDomain(lat,lon)||isLandCoast(lat,lon))continue;addArrow(group,lat,lon,q,latStep,lonStep)}
    return group;
  }
  drawNumericCurrent=function(samples,layer){
    if(rasterLayer&&layer.hasLayer(rasterLayer))layer.removeLayer(rasterLayer);if(arrowGroup&&layer.hasLayer(arrowGroup))layer.removeLayer(arrowGroup);
    const r=makeRaster(samples);rasterLayer=L.imageOverlay(r.url,r.bounds,{pane:'seaDataPane',opacity:1,interactive:false});arrowGroup=makeArrows(samples);rasterLayer.addTo(layer);arrowGroup.addTo(layer);
  };
})();