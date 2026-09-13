/* v6.2.4e HONEST MASK
   Keep Copernicus wet points authoritative. Only bridge tiny coastal gaps (~1 km),
   and mask the smoothed colour field so blur cannot paint large no-data areas. */
(function(){
  const MAX_FILL_KM=1.2;

  numericCoastalVector=function(lat,lon,samples){
    const direct=numericVector(lat,lon,samples);
    if(direct)return direct;
    if(isLandCoast(lat,lon))return null;
    const g=samples?.numericGrid;if(!g)return null;
    const ci=numericNearestIndex(g.ys,lat),cj=numericNearestIndex(g.xs,lon);
    if(ci==null||cj==null)return null;
    let su=0,sn=0,sw=0,count=0,bestKm=Infinity;
    for(let r=1;r<=2;r++){
      for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++){
        if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
        const i=ci+di,j=cj+dj;
        if(i<0||j<0||i>=g.ys.length||j>=g.xs.length)continue;
        const k=i*g.cols+j,u=g.uu[k],n=g.nn[k];
        if(!Number.isFinite(u)||!Number.isFinite(n))continue;
        const dy=(g.ys[i]-lat)*111.2;
        const dx=(g.xs[j]-lon)*111.2*Math.cos(lat*Math.PI/180);
        const km=Math.hypot(dx,dy);
        if(km>MAX_FILL_KM)continue;
        const w=1/Math.max(.25,km*km);
        su+=u*w;sn+=n*w;sw+=w;count++;bestKm=Math.min(bestKm,km);
      }
    }
    if(!sw||count<1)return null;
    const x=vdFrom(su/sw,sn/sw);
    x.coastalFill=true;x.fillKm=bestKm;
    return x;
  };

  numericSmoothCurrentLayer=function(samples){
    const Smooth=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericSmoothCurrent'),size=this.getTileSize();
      tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),factor=3,margin=5;
      const low=document.createElement('canvas'),mask=document.createElement('canvas');
      const lw=Math.ceil(size.x/factor)+margin*2,lh=Math.ceil(size.y/factor)+margin*2;
      low.width=mask.width=lw;low.height=mask.height=lh;
      const lc=low.getContext('2d',{alpha:true}),mc=mask.getContext('2d',{alpha:true});
      const img=lc.createImageData(lw,lh),msk=mc.createImageData(lw,lh),data=img.data,md=msk.data;
      const origin=L.point(coords.x*size.x,coords.y*size.y);
      for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
        const px=(x-margin)*factor+factor/2,py=(y-margin)*factor+factor/2;
        const ll=map.unproject(origin.add([px,py]),coords.z);
        if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
        const rgb=numericCurrentColor(q.v),k=(y*lw+x)*4,fade=domainFade(ll.lat,ll.lng);
        data[k]=rgb[0];data[k+1]=rgb[1];data[k+2]=rgb[2];data[k+3]=Math.round((q.coastalFill?112:166)*fade);
        md[k]=255;md[k+1]=255;md[k+2]=255;md[k+3]=Math.round(255*fade);
      }
      lc.putImageData(img,0,0);mc.putImageData(msk,0,0);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.filter='blur(2.4px)';
      ctx.drawImage(low,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);
      ctx.filter='none';
      ctx.globalCompositeOperation='destination-in';
      ctx.drawImage(mask,margin,margin,lw-margin*2,lh-margin*2,0,0,size.x,size.y);
      ctx.globalCompositeOperation='source-over';
      return tile;
    }});
    return new Smooth({pane:'seaDataPane',tileSize:256,opacity:1,updateWhenIdle:false,updateWhenZooming:false,keepBuffer:2,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]],className:'numericSmoothCurrentLayer'});
  };

  const oldShow=showNumericCurrent;
  showNumericCurrent=async function(){
    await oldShow();
    status('NUMERISCH · Copernicus/SMHI uo/vo · No-Data bleibt sichtbar · Küstenfüllung max. ~1 km');
  };
})();
