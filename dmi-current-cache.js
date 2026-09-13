/* Keep the last successful DMI grid for the selected timeline hour.
   This prevents the coast-mask refresh from issuing a second DMI request
   that can fail/rate-limit and clear a field that was already visible. */
(function(){
  const networkGrid=gstDmiGrid;
  const cache=new Map();
  gstDmiGrid=async function(){
    const d=new Date(timelineHours[timelineIndex]||Date.now());
    d.setMinutes(0,0,0);
    const key=d.toISOString();
    if(cache.has(key))return cache.get(key);
    const g=await networkGrid();
    cache.set(key,g);
    if(cache.size>8)cache.delete(cache.keys().next().value);
    return g;
  };
})();
