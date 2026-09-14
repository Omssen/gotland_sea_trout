/* BUILD 6276 diagnostics only: measure fetch, grid preparation and render without changing current data or direction logic. */
(function(){
  const t={fetch:0,grid:0,render:0,total:0,tries:0};
  const now=()=>performance&&performance.now?performance.now():Date.now();
  if(typeof gstFetchRun==='function'){
    const f=gstFetchRun;
    gstFetchRun=async function(){const s=now();t.tries++;try{return await f.apply(this,arguments)}finally{t.fetch+=now()-s}};
  }
  if(typeof prepareNumericGrid==='function'){
    const p=prepareNumericGrid;
    prepareNumericGrid=function(){const s=now();try{return p.apply(this,arguments)}finally{t.grid+=now()-s}};
  }
  if(typeof drawNumericCurrent==='function'){
    const d=drawNumericCurrent;
    drawNumericCurrent=function(){const s=now();try{return d.apply(this,arguments)}finally{t.render+=now()-s}};
  }
  if(typeof showNumericCurrent==='function'){
    const sh=showNumericCurrent;
    showNumericCurrent=async function(){
      t.fetch=t.grid=t.render=t.total=0;t.tries=0;const s=now();
      try{return await sh.apply(this,arguments)}finally{
        t.total=now()-s;
        const el=document.getElementById('status');
        const base=el&&el.textContent?el.textContent:'';
        const ms=x=>(x/1000).toFixed(2)+'s';
        const diag='DIAG · Gesamt '+ms(t.total)+' · DMI '+ms(t.fetch)+' · Grid '+ms(t.grid)+' · Render '+ms(t.render)+' · Versuche '+t.tries;
        if(el)el.textContent=(base?base+' · ':'')+diag;
        console.log(diag);
      }
    };
  }
})();
