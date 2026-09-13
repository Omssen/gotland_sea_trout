/* v6.2.4h FAST BANDS
   Faster canvas-only current display. Keeps V2 arrow style concept, but removes hundreds
   of DOM markers. Speed field uses clearer soft bands for easier reading on mobile. */
(function(){
  function bandRgb(v){
    if(v<.03)return [239,248,240];
    if(v<.07)return [215,239,211];
    if(v<.12)return [183,225,176];
    if(v<.18)return [143,207,135];
    if(v<.25)return [100,187,105];
    if(v<.35)return [191,214,91];
    if(v<.45)return [239,218,78];
    if(v<.58)return [244,170,66];
    if(v<.72)return [235,111,57];
    return [210,62,48];
  }
  function edgeFade(lat,lon,samples){
    const g=samples?.numericGrid;if(!g||!g.ys.length||!g.xs.length)return 0;
    const s=g.ys[0],n=g.ys[g.ys.length-1],w=g.xs[0],e=g.xs[g.xs.length-1];
    if(lat<s||lat>n||lon<w||lon>e)return 0;
    const ns=Math.min((lat-s)*111.2,(n-lat)*111.2);
    const ew=Math.min((lon-w)*111.2*Math.cos(lat*Math.PI/180),(e-lon)*111.2*Math.cos(lat*Math.PI/180));
    const t=Math.max(0,Math.min(1,Math.min(ns,ew)/14));return t*t*(3-2*t);
  }
  numericSmoothCurrentLayer=function(samples){
    const Fast=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericFastBands'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),factor=6,margin=3;
      const low=document.createElement('canvas'),lw=Math.ceil(size.x/factor)+margin*2,lh=Math.ceil(size.y/factor)+margin*2;low.width=lw;low.height=lh;
      const lc=low.getContext('2d',{alpha:true}),img=lc.createImageData(lw,lh),d=img.data,origin=L.point(coords.x*size.x,coords.y*size.y);
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
        const ll=map.unproject(origin.add([(x-margin)*factor+factor/2,(y-margin)*factor+factor/2]),coords.z);
        if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
        const ef=edgeFade(ll.lat,ll.lng,samples);if(ef<=0)continue;
        const rgb=bandRgb(q.v),k=(y*lw+x)*4,fade=domainFade(ll.lat,ll.lng),a=q.quality==='raw'?150:55;
        d[k]=rgb[0];d[k+1]=rgb[1];d[k+2]=rgb[2];d[k+3]=Math.round(a*fade*ef);
      }
      lc.putImageData(img,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='medium';ctx.filter='blur(2.2px)';
      ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);ctx.filter='none';return tile;
    }});
    return new Fast({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]});
  };
  function drawArrow(ctx,x,y,q){
    if(q.v<.018){ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fillStyle='rgba(20,45,52,.70)';ctx.fill();return;}
    const s=Math.min(1,q.v/.45),len=12+s*7,head=4+s*1.4,op=q.quality==='raw'?.82:.42,r=(q.dir-90)*Math.PI/180;
    ctx.save();ctx.translate(x,y);ctx.rotate(r);ctx.strokeStyle=`rgba(20,45,52,${op})`;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(len/2,0);ctx.moveTo(len/2-head,-head*.62);ctx.lineTo(len/2,0);ctx.lineTo(len/2-head,head*.62);ctx.stroke();ctx.restore();
  }
  function numericVectorCanvas(samples){
    const V=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericVectorCanvas'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),origin=L.point(coords.x*size.x,coords.y*size.y),gap=44,offset=22;
      for(let y=offset;y<size.y;y+=gap)for(let x=offset;x<size.x;x+=gap){
        const ll=map.unproject(origin.add([x,y]),coords.z);if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;drawArrow(ctx,x,y,q);
      }return tile;
    }});
    return new V({pane:'currentVectorPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]});
  }
  drawNumericCurrent=function(samples,layer){numericSmoothCurrentLayer(samples).addTo(layer);numericVectorCanvas(samples).addTo(layer);};
  const oldShow=showNumericCurrent;
  showNumericCurrent=async function(){await oldShow();status('NUMERISCH · FAST BANDS · klare Geschwindigkeitsstufen · Canvas-Pfeile für flüssigere Bedienung');};
})();
