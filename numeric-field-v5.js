/* v6.2.4k SMOOTH FIELD
   Smooth continuous speed shading. Direction arrows remain owned by numeric-direction-v4.js. */
(function(){
  const stops=[
    [0.00,[239,248,240]],[0.04,[222,242,219]],[0.08,[199,233,194]],
    [0.13,[166,218,158]],[0.20,[126,199,125]],[0.28,[159,200,102]],
    [0.38,[215,211,82]],[0.50,[241,190,69]],[0.65,[237,130,59]],[0.82,[210,62,48]]
  ];
  function rgb(v){
    v=Math.max(0,Math.min(.82,v));
    for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){
      const a=stops[i-1],b=stops[i],t=(v-a[0])/(b[0]-a[0]);
      return a[1].map((x,j)=>Math.round(x+(b[1][j]-x)*t));
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
      const tile=L.DomUtil.create('canvas','numericSmoothField'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),factor=4,margin=4;
      const low=document.createElement('canvas'),lw=Math.ceil(size.x/factor)+margin*2,lh=Math.ceil(size.y/factor)+margin*2;low.width=lw;low.height=lh;
      const lc=low.getContext('2d',{alpha:true}),img=lc.createImageData(lw,lh),d=img.data,origin=L.point(coords.x*size.x,coords.y*size.y);
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
        const ll=map.unproject(origin.add([(x-margin)*factor+factor/2,(y-margin)*factor+factor/2]),coords.z);
        if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
        const ef=edgeFade(ll.lat,ll.lng,samples);if(ef<=0)continue;
        const c=rgb(q.v),k=(y*lw+x)*4,df=domainFade(ll.lat,ll.lng);
        d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=Math.round((q.quality==='raw'?142:72)*df*ef);
      }
      lc.putImageData(img,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='blur(3.2px)';
      ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);ctx.filter='none';return tile;
    }});
    return new Smooth({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]});
  };
})();
