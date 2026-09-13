/* v6.2.4i DIRECTION CHECK
   Draw current vectors with explicit screen geometry:
   0=N, 90=E, 180=S, 270=W. No canvas rotation ambiguity. */
(function(){
  function drawCompassArrow(ctx,x,y,q){
    if(q.v<.018){ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fillStyle='rgba(20,45,52,.72)';ctx.fill();return;}
    const s=Math.min(1,q.v/.45),len=12+s*7,head=4+s*1.4,op=q.quality==='raw'?.84:.45;
    const r=q.dir*Math.PI/180;
    const dx=Math.sin(r),dy=-Math.cos(r);
    const x1=x-dx*len*.5,y1=y-dy*len*.5,x2=x+dx*len*.5,y2=y+dy*len*.5;
    const px=-dy,py=dx;
    const hx=x2-dx*head,hy=y2-dy*head;
    ctx.strokeStyle=`rgba(20,45,52,${op})`;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.moveTo(hx+px*head*.62,hy+py*head*.62);ctx.lineTo(x2,y2);ctx.lineTo(hx-px*head*.62,hy-py*head*.62);ctx.stroke();
  }
  function compassVectorCanvas(samples){
    const V=L.GridLayer.extend({createTile:function(coords){
      const tile=L.DomUtil.create('canvas','numericCompassCanvas'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      const ctx=tile.getContext('2d',{alpha:true}),origin=L.point(coords.x*size.x,coords.y*size.y),gap=44,offset=22;
      for(let y=offset;y<size.y;y+=gap)for(let x=offset;x<size.x;x+=gap){
        const ll=map.unproject(origin.add([x,y]),coords.z);
        if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
        const q=numericCoastalVector(ll.lat,ll.lng,samples);if(!q)continue;
        drawCompassArrow(ctx,x,y,q);
      }
      return tile;
    }});
    return new V({pane:'currentVectorPane',tileSize:256,opacity:1,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,noWrap:true,bounds:[[GOTLAND_RENDER_DOMAIN.s,GOTLAND_RENDER_DOMAIN.w],[GOTLAND_RENDER_DOMAIN.n,GOTLAND_RENDER_DOMAIN.e]]});
  }
  drawNumericCurrent=function(samples,layer){numericSmoothCurrentLayer(samples).addTo(layer);compassVectorCanvas(samples).addTo(layer);};
  const oldShow=showNumericCurrent;
  showNumericCurrent=async function(){await oldShow();status('NUMERISCH · DIRECTION CHECK · 0°=N · 90°=E · 180°=S · 270°=W · explizite Geometrie');};
})();
