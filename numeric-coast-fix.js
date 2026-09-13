/* v6.2.4k COAST MASK FIX
   Use stitched closed OSM coastline rings for land/water classification.
   Root-cause fix: the original app rejected any closed ring taller than 0.95°,
   while Gotland itself spans about 1.07° north-south. That forced the renderer
   back to the coarse fallback polygon and produced the recurring diagonal coast errors. */
(function(){
  // IMPORTANT: loadCoastMask() is already in-flight when this file executes, but
  // its async continuation resolves validLandRing dynamically. Replacing this
  // binding here therefore affects the actual OSM-ring filtering before the
  // Overpass response is processed.
  validLandRing=function(r){
    if(!Array.isArray(r)||r.length<8)return false;
    const b=ringBBox(r),spanLat=b.n-b.s,spanLon=b.e-b.w;
    // Gotland main island is ~1.07° tall. Keep a generous safety margin while
    // still rejecting absurd/global rings.
    if(spanLat>1.35||spanLon>1.80)return false;
    const landHits=LAND_ANCHORS.filter(a=>inPoly(a[0],a[1],r)).length;
    const seaHits=SEA_ANCHORS.filter(a=>inPoly(a[0],a[1],r)).length;
    return landHits>0&&seaHits===0;
  };

  function activeLandPolys(){
    return (Array.isArray(coastMaskPolys)&&coastMaskPolys.length)?coastMaskPolys:landMasks();
  }

  // One land/water decision for current colour field, arrows and overlay.
  isLandCoast=function(lat,lon){
    if(lat<56.62||lat>58.28||lon<17.48||lon>20.05)return false;
    const polys=activeLandPolys();
    for(const poly of polys) if(inPoly(lat,lon,poly)) return true;
    return false;
  };
  isLandDisplay=function(lat,lon){ return isLandCoast(lat,lon); };

  eraseLandFromTile=function(ctx,coords,size){
    const origin=L.point(coords.x*size.x,coords.y*size.y),polys=activeLandPolys();
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    for(const poly of polys){
      if(!poly||poly.length<3)continue;
      ctx.beginPath();
      let used=false;
      for(const p of poly){
        const pt=map.project(L.latLng(p[0],p[1]),coords.z).subtract(origin);
        if(!used){ctx.moveTo(pt.x,pt.y);used=true}else ctx.lineTo(pt.x,pt.y);
      }
      if(used){ctx.closePath();ctx.fill();}
    }
    ctx.restore();
  };

  landOverlayGrid=function(){
    const LandGrid=L.GridLayer.extend({createTile:function(coords,done){
      const tile=L.DomUtil.create('canvas','landOverlayTile'),size=this.getTileSize();
      tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),img=new Image();
      img.crossOrigin='anonymous';
      img.onload=()=>{
        try{
          ctx.drawImage(img,0,0,size.x,size.y);
          const origin=L.point(coords.x*size.x,coords.y*size.y),polys=activeLandPolys();
          ctx.globalCompositeOperation='destination-in';
          ctx.beginPath();
          for(const poly of polys){
            if(!poly||poly.length<3)continue;
            let used=false;
            for(const p of poly){
              const pt=map.project(L.latLng(p[0],p[1]),coords.z).subtract(origin);
              if(!used){ctx.moveTo(pt.x,pt.y);used=true}else ctx.lineTo(pt.x,pt.y);
            }
            if(used)ctx.closePath();
          }
          ctx.fillStyle='#000';ctx.fill('nonzero');
          ctx.globalCompositeOperation='source-over';
        }catch(e){console.warn('Polygon-Landoverlay',e)}
        done(null,tile);
      };
      img.onerror=()=>done(null,tile);
      img.src=baseTileUrl(coords);
      return tile;
    }});
    return new LandGrid({pane:'landCoverPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:0,noWrap:true,bounds:[[56.62,17.48],[58.28,20.05]],className:'landOverlayGrid polygonLandMask'});
  };

  Promise.resolve(loadCoastMask()).then(()=>{
    console.info('GST coast mask rings:',coastMaskPolys.length,'segments:',coastSegments.length);
    updateLandCover();
    if(active.current)loadVectors('current');
  }).catch(e=>console.warn('GST coast-mask refresh failed',e));
})();
