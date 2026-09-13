/* v6.2.4f CURRENT RENDER V2
   Compact FiD-like direction symbols, calm-water dots, soft visual confidence.
   Raw Copernicus wet cells remain authoritative; no long coastal extrapolation. */
(function(){
  const RAW=numericVector;
  const MAX_TINY_FILL_KM=1.15;

  function nearWet(lat,lon,samples){
    const direct=RAW(lat,lon,samples); if(direct){direct.quality='raw';return direct;}
    if(isLandCoast(lat,lon))return null;
    const g=samples?.numericGrid;if(!g)return null;
    const ci=numericNearestIndex(g.ys,lat),cj=numericNearestIndex(g.xs,lon);if(ci==null||cj==null)return null;
    let su=0,sn=0,sw=0,best=Infinity;
    for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
      const i=ci+di,j=cj+dj;if(i<0||j<0||i>=g.ys.length||j>=g.xs.length)continue;
      const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];if(!Number.isFinite(u)||!Number.isFinite(n))continue;
      const dy=(g.ys[i]-lat)*111.2,dx=(g.xs[j]-lon)*111.2*Math.cos(lat*Math.PI/180),km=Math.hypot(dx,dy);
      if(km>MAX_TINY_FILL_KM)continue;
      const w=1/Math.max(.2,km*km);su+=u*w;sn+=n*w;sw+=w;best=Math.min(best,km);
    }
    if(!sw)return null;
    const q=vdFrom(su/sw,sn/sw);q.quality='tiny-fill';q.fillKm=best;return q;
  }
  numericCoastalVector=nearWet;

  numericSmoothCurrentLayer=function(samples){
    const Smooth=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericCurrentV2'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),factor=4,margin=6;
      const low=document.createElement('canvas'),lw=Math.ceil(size.x/factor)+margin*2,lh=Math.ceil(size.y/factor)+margin*2;low.width=lw;low.height=lh;
      const lc=low.getContext('2d',{alpha:true}),img=lc.createImageData(lw,lh),d=img.data,origin=L.point(coords.x*size.x,coords.y*size.y);
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
        const ll=map.unproject(origin.add([(x-margin)*factor+factor/2,(y-margin)*factor+factor/2]),coords.z);
        if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=nearWet(ll.lat,ll.lng,samples);if(!q)continue;
        const rgb=numericCurrentColor(q.v),k=(y*lw+x)*4,fade=domainFade(ll.lat,ll.lng),a=q.quality==='raw'?145:68;
        d[k]=rgb[0];d[k+1]=rgb[1];d[k+2]=rgb[2];d[k+3]=Math.round(a*fade);
      }
      lc.putImageData(img,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='blur(5px)';
      ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);ctx.filter='none';return tile;
    }});
    return new Smooth({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:2,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]});
  };

  function seeds(){
    const size=map.getSize(),z=map.getZoom(),gap=z>=14?34:z>=12?38:z>=10?42:46,out=[];let row=0;
    for(let y=gap*.55;y<size.y;y+=gap,row++)for(let x=gap*.55+(row%2?gap*.5:0);x<size.x;x+=gap){
      const ll=map.containerPointToLatLng([x,y]);if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
      out.push(ll);if(out.length>=650)return out;
    }return out;
  }
  function symbol(q){
    if(q.v<.018)return L.divIcon({className:'currentGlyph',html:'<span style="display:block;width:5px;height:5px;border-radius:50%;background:#173d48;opacity:.72"></span>',iconSize:[5,5],iconAnchor:[2.5,2.5]});
    const s=Math.min(1,q.v/.45),len=13+s*7,head=4+s*1.5,op=q.quality==='raw'?.84:.45;
    return L.divIcon({className:'currentGlyph',html:`<svg width="${len+5}" height="14" viewBox="0 0 ${len+5} 14" style="transform:rotate(${q.dir-90}deg);overflow:visible"><path d="M2 7 H${len} M${len-head} ${7-head*.62} L${len} 7 L${len-head} ${7+head*.62}" fill="none" stroke="rgba(20,45,52,${op})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,iconSize:[len+5,14],iconAnchor:[(len+5)/2,7]});
  }
  drawNumericCurrent=function(samples,layer){
    numericSmoothCurrentLayer(samples).addTo(layer);
    for(const ll of seeds()){
      const q=nearWet(ll.lat,ll.lng,samples);if(!q)continue;
      L.marker([ll.lat,ll.lng],{pane:'currentVectorPane',icon:symbol(q),keyboard:false,interactive:false}).addTo(layer);
    }
  };

  const oldShow=showNumericCurrent;
  showNumericCurrent=async function(){await oldShow();status('NUMERISCH · Rohdaten + kompakte Richtungssymbole · Punkte = sehr schwache Strömung · No-Data nicht extrapoliert');};
})();
