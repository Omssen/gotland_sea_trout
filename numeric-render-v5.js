/* v6.2.4k SMOOTH FIELD
   Keeps the verified explicit arrow geometry from numeric-direction-v4.
   Only replaces the speed background: continuous color interpolation, finer sampling,
   light blur, and conservative coastal fill via numericCoastalVector. */
(function(){
  const stops=[
    [0.00,[239,248,240]],[0.04,[222,242,217]],[0.08,[198,233,190]],
    [0.13,[164,218,153]],[0.20,[119,197,119]],[0.28,[157,202,99]],
    [0.38,[218,215,78]],[0.50,[244,190,70]],[0.64,[239,132,60]],[0.80,[210,62,48]]
  ];
  function smoothRgb(v){
    v=Math.max(0,Math.min(.8,v||0));
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
        const rgb=smoothRgb(q.v),k=(y*lw+x)*4,fade=domainFade(ll.lat,ll.lng);
        const a=q.quality==='raw'?142:62;
        d[k]=rgb[0];d[k+1]=rgb[1];d[k+2]=rgb[2];d[k+3]=Math.round(a*fade*ef);
      }
      lc.putImageData(img,0,0);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='blur(1.35px)';
      ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);ctx.filter='none';return tile;
    }});
    return new Smooth({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]});
  };
  const previousDraw=drawNumericCurrent;
  drawNumericCurrent=function(samples,layer){
    /* v4's draw function includes its explicit compass-vector canvas. Temporarily suppress
       the old background constructor so only that arrow layer is retained. */
    const smooth=numericSmoothCurrentLayer;
    let oldAdd=numericSmoothCurrentLayer;
    try{
      /* draw our new background first */
      smooth(samples).addTo(layer);
      /* Recreate explicit arrows directly; avoids invoking v3's band background. */
      const V=L.GridLayer.extend({createTile:function(coords){
        const tile=L.DomUtil.create('canvas','numericCompassVectorsK'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
        const ctx=tile.getContext('2d',{alpha:true}),origin=L.point(coords.x*size.x,coords.y*size.y),gap=44,offset=22;
        for(let y=offset;y<size.y;y+=gap)for(let x=offset;x<size.x;x+=gap){
          const ll=map.unproject(origin.add([x,y]),coords.z);if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
          const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
          if(q.v<.018){ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fillStyle='rgba(20,45,52,.70)';ctx.fill();continue;}
          const s=Math.min(1,q.v/.45),len=12+s*7,head=4+s*1.4,op=q.quality==='raw'?.82:.42;
          const r=q.dir*Math.PI/180,dx=Math.sin(r),dy=-Math.cos(r),px=-dy,py=dx;
          const ax=x-dx*len/2,ay=y-dy*len/2,bx=x+dx*len/2,by=y+dy*len/2;
          ctx.strokeStyle=`rgba(20,45,52,${op})`;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.moveTo(bx-dx*head+px*head*.62,by-dy*head+py*head*.62);ctx.lineTo(bx,by);ctx.lineTo(bx-dx*head-px*head*.62,by-dy*head-py*head*.62);ctx.stroke();
        }return tile;
      }});
      new V({pane:'currentVectorPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]}).addTo(layer);
    }catch(e){console.error('smooth field renderer',e);previousDraw(samples,layer);}
  };
  const oldShow=showNumericCurrent;
  showNumericCurrent=async function(){await oldShow();status('NUMERISCH · SMOOTH FIELD · kontinuierliche Geschwindigkeit · explizite Kompass-Pfeile');};
})();
