/* v6.2.4k SMOOTH FIELD + explicit compass arrows
   Performance patch: adaptive low-res field, lighter blur, fewer vector samples,
   no off-screen tile buffer. Numeric CMEMS values and directions are unchanged.
   Coast fix: final canvas output is hard-clipped to closed OSM land polygons. */
(function(){
  function smoothRgb(v){const s=[[0,[239,248,240]],[.05,[220,240,216]],[.10,[195,229,188]],[.16,[157,211,148]],[.23,[112,191,116]],[.31,[176,207,96]],[.40,[225,216,83]],[.50,[240,193,73]],[.62,[241,151,65]],[.75,[225,95,57]]];if(v<=0)return s[0][1];for(let i=1;i<s.length;i++)if(v<=s[i][0]){const t=(v-s[i-1][0])/(s[i][0]-s[i-1][0]);return s[i-1][1].map((a,j)=>Math.round(a+(s[i][1][j]-a)*t))}return s[s.length-1][1]}
  function edgeFade(lat,lon,samples){const g=samples?.numericGrid;if(!g)return 0;const s=g.ys[0],n=g.ys[g.ys.length-1],w=g.xs[0],e=g.xs[g.xs.length-1];if(lat<s||lat>n||lon<w||lon>e)return 0;const ns=Math.min((lat-s)*111.2,(n-lat)*111.2),ew=Math.min((lon-w)*111.2*Math.cos(lat*Math.PI/180),(e-lon)*111.2*Math.cos(lat*Math.PI/180)),t=Math.max(0,Math.min(1,Math.min(ns,ew)/10));return t*t*(3-2*t)}
  function fieldFactor(z){return z>=14?6:z>=12?7:z>=10?8:10}
  numericSmoothCurrentLayer=function(samples){
    const G=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericSmoothK'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),factor=fieldFactor(coords.z),margin=4,low=document.createElement('canvas'),lw=Math.ceil(size.x/factor)+margin*2,lh=Math.ceil(size.y/factor)+margin*2;low.width=lw;low.height=lh;
      const lc=low.getContext('2d',{alpha:true}),img=lc.createImageData(lw,lh),d=img.data,origin=L.point(coords.x*size.x,coords.y*size.y);
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
        const ll=map.unproject(origin.add([(x-margin)*factor+factor/2,(y-margin)*factor+factor/2]),coords.z);
        if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
        const ef=edgeFade(ll.lat,ll.lng,samples),fade=domainFade(ll.lat,ll.lng);if(ef<=0||fade<=0)continue;
        const rgb=smoothRgb(q.v),k=(y*lw+x)*4,a=q.quality==='raw'?148:62;d[k]=rgb[0];d[k+1]=rgb[1];d[k+2]=rgb[2];d[k+3]=Math.round(a*fade*ef)
      }
      lc.putImageData(img,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='medium';ctx.filter='blur(2.5px)';ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);ctx.filter='none';
      eraseLandFromTile(ctx,coords,size);
      return tile
    }});
    return new G({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:0,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]})
  };
  function arrow(ctx,x,y,q){if(q.v<.018){ctx.beginPath();ctx.arc(x,y,2.3,0,Math.PI*2);ctx.fillStyle='rgba(20,45,52,.72)';ctx.fill();return}const s=Math.min(1,q.v/.45),len=12+s*7,head=4+s*1.4,op=q.quality==='raw'?.84:.45,r=q.dir*Math.PI/180,dx=Math.sin(r),dy=-Math.cos(r),x1=x-dx*len*.5,y1=y-dy*len*.5,x2=x+dx*len*.5,y2=y+dy*len*.5,px=-dy,py=dx,hx=x2-dx*head,hy=y2-dy*head;ctx.strokeStyle=`rgba(20,45,52,${op})`;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.moveTo(hx+px*head*.62,hy+py*head*.62);ctx.lineTo(x2,y2);ctx.lineTo(hx-px*head*.62,hy-py*head*.62);ctx.stroke()}
  function vectorGap(z){return z>=14?52:z>=12?58:z>=10?64:72}
  function vectors(samples){
    const V=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericCompassCanvas'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),origin=L.point(coords.x*size.x,coords.y*size.y),gap=vectorGap(coords.z),offset=gap/2;
      for(let y=offset;y<size.y;y+=gap)for(let x=offset;x<size.x;x+=gap){const ll=map.unproject(origin.add([x,y]),coords.z);if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;const q=numericCoastalVector(ll.lat,ll.lng,samples);if(q)arrow(ctx,x,y,q)}
      eraseLandFromTile(ctx,coords,size);
      return tile
    }});
    return new V({pane:'currentVectorPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:0,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]})
  }
  drawNumericCurrent=function(samples,layer){numericSmoothCurrentLayer(samples).addTo(layer);vectors(samples).addTo(layer)};
  const oldShow=showNumericCurrent;showNumericCurrent=async function(){await oldShow();status('NUMERISCH · CURRENT GRID · OSM-Küstenmaske · CMEMS-Werte/Pfeilrichtungen unverändert')};
})();
