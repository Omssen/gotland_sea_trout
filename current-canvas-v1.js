/* Single persistent canvas renderer: smooth field + lightweight arrows. */
(function(){
 let samples=null,canvas=null,timer=null;
 const stops=[[0,[239,248,240]],[.05,[220,240,216]],[.10,[195,229,188]],[.16,[157,211,148]],[.23,[112,191,116]],[.31,[176,207,96]],[.40,[225,216,83]],[.50,[240,193,73]],[.62,[241,151,65]],[.75,[225,95,57]]];
 function col(v){if(v<=0)return stops[0][1];for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){const a=stops[i-1],b=stops[i],t=(v-a[0])/(b[0]-a[0]);return a[1].map((x,j)=>Math.round(x+(b[1][j]-x)*t))}return stops[stops.length-1][1]}
 function vec(lat,lon){const q=numericVector(lat,lon,samples);if(!q||isLandCoast(lat,lon))return null;return q}
 function arrow(c,x,y,q){if(q.v<.018){c.beginPath();c.arc(x,y,2,0,7);c.fillStyle='rgba(20,45,52,.72)';c.fill();return}const r=q.dir*Math.PI/180,dx=Math.sin(r),dy=-Math.cos(r),L=16,H=5,x1=x-dx*L/2,y1=y-dy*L/2,x2=x+dx*L/2,y2=y+dy*L/2,px=-dy,py=dx;c.strokeStyle='rgba(20,45,52,.84)';c.lineWidth=2;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.moveTo(x2-dx*H+px*3,y2-dy*H+py*3);c.lineTo(x2,y2);c.lineTo(x2-dx*H-px*3,y2-dy*H-py*3);c.stroke()}
 function draw(){
  if(!canvas||!samples)return;
  const s=map.getSize(),w=s.x,h=s.y,d=Math.min(1.5,devicePixelRatio||1),z=map.getZoom();
  canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+'px';canvas.style.height=h+'px';L.DomUtil.setPosition(canvas,map.containerPointToLayerPoint([0,0]));
  const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
  const step=z>=13?5:z>=11?6:8,lw=Math.ceil(w/step)+2,lh=Math.ceil(h/step)+2,low=document.createElement('canvas');low.width=lw;low.height=lh;
  const lc=low.getContext('2d'),img=lc.createImageData(lw,lh),px=img.data;
  for(let gy=0;gy<lh;gy++)for(let gx=0;gx<lw;gx++){
   const x=(gx-.5)*step,y=(gy-.5)*step,ll=map.containerPointToLatLng([x,y]);
   if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;
   const q=vec(ll.lat,ll.lng);if(!q)continue;const a=col(q.v),k=(gy*lw+gx)*4;px[k]=a[0];px[k+1]=a[1];px[k+2]=a[2];px[k+3]=118;
  }
  lc.putImageData(img,0,0);c.save();c.globalAlpha=1;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.filter='blur(1.2px)';c.drawImage(low,-step,-step,lw*step,lh*step);c.filter='none';c.restore();
  const gap=z>=13?62:z>=11?76:94;
  for(let y=gap/2;y<h;y+=gap)for(let x=gap/2;x<w;x+=gap){const ll=map.containerPointToLatLng([x,y]);if(!insideRenderDomain(ll.lat,ll.lng)||isLandCoast(ll.lat,ll.lng))continue;const q=vec(ll.lat,ll.lng);if(q)arrow(c,x,y,q)}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(draw,140)}
 const Layer=L.Layer.extend({onAdd(){canvas=L.DomUtil.create('canvas','gstCurrentCanvas');canvas.style.position='absolute';canvas.style.pointerEvents='none';map.getPane('currentVectorPane').appendChild(canvas);map.on('moveend zoomend resize',schedule);draw()},onRemove(){map.off('moveend zoomend resize',schedule);clearTimeout(timer);canvas?.remove();canvas=null}});
 drawNumericCurrent=function(s,layer){samples=s;new Layer().addTo(layer)};
})();
