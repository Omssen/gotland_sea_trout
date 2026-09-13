/* v6.2.4k COAST MASK FIX
   Use stitched closed OSM coastline rings for land/water classification.
   Raw coastline scanline pairing was unreliable around islands, bays and the Hoburgen tip. */
(function(){
  function activeLandPolys(){
    return (Array.isArray(coastMaskPolys)&&coastMaskPolys.length)?coastMaskPolys:landMasks();
  }

  // Robust point-in-land test: evaluate complete closed island rings independently.
  isLandCoast=function(lat,lon){
    if(lat<56.62||lat>58.28||lon<17.48||lon>20.05)return false;
    const polys=activeLandPolys();
    for(const poly of polys) if(inPoly(lat,lon,poly)) return true;
    return false;
  };

  // Same geometry for display masking. Never pair crossings from unrelated coastlines.
  isLandDisplay=function(lat,lon){ return isLandCoast(lat,lon); };

  // Precise vector land erase for canvas layers, using the same closed rings.
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

  // Put the base map back only on actual land polygons.
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

  // Refresh once the stitched OSM rings arrive.
  Promise.resolve(loadCoastMask()).then(()=>{
    updateLandCover();
    if(active.current)loadVectors('current');
  }).catch(()=>{});
})();
