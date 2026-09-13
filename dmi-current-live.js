/* DMI live current loader for v6-test */
window.GST_DMI_CURRENT_URL='https://'+'opendataapi.dmi.dk/v1/forecastedr/collections/dkss_nsbs';
async function gstDmiCurrentQuery(){
 const d=new Date(timelineHours[timelineIndex]||Date.now());d.setMinutes(0,0,0);
 const q=new URLSearchParams({bbox:'17.65,56.65,19.95,58.15',crs:'crs84','parameter-name':'current-u,current-v',datetime:d.toISOString().replace('.000Z','Z'),f:'GeoJSON'});
 return json(window.GST_DMI_CURRENT_URL+'/cube?'+q.toString());
}
