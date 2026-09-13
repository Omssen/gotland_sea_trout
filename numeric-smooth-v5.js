/* v6.2.4k SMOOTH FIELD
   Keeps vector directions untouched. Only the speed background is rendered more smoothly
   and with gentler coastal transitions while preserving the honest tiny-fill mask. */
(function(){
  function smoothRgb(v){
    const stops=[[0,[239,248,240]],[.05,[220,240,216]],[.10,[195,229,188]],[.16,[157,211,148]],[.23,[112,191,116]],[.31,[176,207,96]],[.40,[225,216,83]],[.50,[240,193,73]],[.62,[241,151,65]],[.75,[225,95,57]]];
    if(v<=stops[0][0])return stops[0][1];
    for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){
      const [v0,c0]=stops[i-1],[v1,c1]=stops[i],t=(v-v0)/(v1-v0||1);
      return c0.map((a,j)=>Math.round(a+(c1[j]-a)*t));
    }
    return stops[stops.length-1][1];
  }
  function edgeFade(lat,lon,samples){
    const g=samples?.numericGrid;if(!g||!g.ys.length||!g.xs.length)return 0;
    const s=g.ys[0],n=g.ys[g.ys.length-1],w=g.xs[0],e=g.xs[g.xs.length-1];
    if(lat<s||lat>n||lon<w||lon>e)return 0;
    const ns=Math.min((lat-s)*111.2,(n-lat)*111.2);
    const ew=Math.min((lon-w)*111.2*Math.cos(lat*Math.PI/180),(e-lon)*111.2*Math.cos(lat*Math.PI/180));
    const t=Math.max(0,Math.min(1,Math.min(ns,ew)/10));return t*t*(3-2*t);
  }
  numericSmoothCurrentLayer=function(samples){
    const Smooth=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericSmoothV5'),size=this.getTileSize();
      tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),factor=4,margin=8;
      const low=document.createElement('canvas'),lw=Math.ceil(size.x/factor)+margin*2,lh=Math.ceil(size.y/factor)+margin*2;
      low.width=lw;low.height=lh;
      const lc=low.getContext('2d',{alpha:true}),img=lc.createImageData(lw,lh),d=img.data,origin=L.point(coords.x*size.x,coords.y*size.y);
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
        const ll=map.unproject(origin.add([(x-margin)*factor+factor/2,(y-margin)*factor+factor/2]),coords.z);
        if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
        const ef=edgeFade(ll.lat,ll.lng,samples),fade=domainFade(ll.lat,ll.lng);if(ef<=0||fade<=0)continue;
        const rgb=smoothRgb(q.v),k=(y*lw+x)*4;
        const a=q.quality==='raw'?148:62;
        d[k]=rgb[0];d[k+1]=rgb[1];d[k+2]=rgb[2];d[k+3]=Math.round(a*fade*ef);
      }
      lc.putImageData(img,0,0);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='blur(5.5px)';
      ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);ctx.filter='none';
      return tile;
    }});
    return new Smooth({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]});
  };
  const oldShow=showNumericCurrent;
  showNumericCurrent=async function(){await oldShow();status('NUMERISCH · SMOOTH FIELD · Pfeilrichtungen unverändert · geglättete Geschwindigkeitsfläche');};
})();
