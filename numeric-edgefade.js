/* v6.2.4g soft data-edge fade. Keeps current V2 arrows unchanged. */
(function(){
  const oldLayer=numericSmoothCurrentLayer;
  const oldDraw=drawNumericCurrent;
  function edgeFade(lat,lon,samples){
    const g=samples?.numericGrid;if(!g||!g.ys.length||!g.xs.length)return 0;
    const s=g.ys[0],n=g.ys[g.ys.length-1],w=g.xs[0],e=g.xs[g.xs.length-1];
    if(lat<s||lat>n||lon<w||lon>e)return 0;
    const kmNS=Math.min((lat-s)*111.2,(n-lat)*111.2);
    const kmEW=Math.min((lon-w)*111.2*Math.cos(lat*Math.PI/180),(e-lon)*111.2*Math.cos(lat*Math.PI/180));
    const t=Math.max(0,Math.min(1,Math.min(kmNS,kmEW)/18));
    return t*t*(3-2*t);
  }
  numericSmoothCurrentLayer=function(samples){
    const Smooth=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericEdgeFade'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),factor=4,margin=8;
      const low=document.createElement('canvas'),lw=Math.ceil(size.x/factor)+margin*2,lh=Math.ceil(size.y/factor)+margin*2;low.width=lw;low.height=lh;
      const lc=low.getContext('2d',{alpha:true}),img=lc.createImageData(lw,lh),d=img.data,origin=L.point(coords.x*size.x,coords.y*size.y);
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
        const ll=map.unproject(origin.add([(x-margin)*factor+factor/2,(y-margin)*factor+factor/2]),coords.z);
        if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
        const ef=edgeFade(ll.lat,ll.lng,samples);if(ef<=0)continue;
        const rgb=numericCurrentColor(q.v),k=(y*lw+x)*4,fade=domainFade(ll.lat,ll.lng),a=q.quality==='raw'?148:62;
        d[k]=rgb[0];d[k+1]=rgb[1];d[k+2]=rgb[2];d[k+3]=Math.round(a*fade*ef);
      }
      lc.putImageData(img,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='blur(7px)';
      ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);ctx.filter='none';return tile;
    }});
    return new Smooth({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:false,updateWhenZooming:false,keepBuffer:2,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]});
  };
  const oldShow=showNumericCurrent;
  showNumericCurrent=async function(){await oldShow();status('NUMERISCH · CURRENT V2 · weicher Datenrand · keine Fern-Extrapolation');};
})();
