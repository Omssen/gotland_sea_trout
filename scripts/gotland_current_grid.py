#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, math
from pathlib import Path
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd
import xarray as xr
import copernicusmarine

DATASET_ID = "cmems_mod_bal_phy_anfc_PT1H-i"
LOCAL_TZ = ZoneInfo("Europe/Stockholm")
BBOX = {"min_lon":17.35,"max_lon":20.15,"min_lat":56.55,"max_lat":58.35}

def parse_local_time(s):
    ts = pd.Timestamp(s)
    return ts.tz_localize(LOCAL_TZ) if ts.tzinfo is None else ts.tz_convert(LOCAL_TZ)

def find_coord(ds, std, candidates):
    for name,var in ds.coords.items():
        if str(var.attrs.get("standard_name","")).lower() == std:
            return name
    for name in candidates:
        if name in ds.coords or name in ds.variables:
            return name
    raise KeyError(std)

def direction_deg(u,v):
    return (math.degrees(math.atan2(u,v))+360.0)%360.0

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--local-time",required=True)
    ap.add_argument("--output-dir",default="out")
    ap.add_argument("--step",type=int,default=1)
    args=ap.parse_args()

    out=Path(args.output_dir); out.mkdir(parents=True,exist_ok=True)
    local_ts=parse_local_time(args.local_time)
    utc_ts=local_ts.tz_convert("UTC")
    nc=out/"gotland_current_subset.nc"

    copernicusmarine.subset(
        dataset_id=DATASET_ID, variables=["uo","vo"],
        minimum_longitude=BBOX["min_lon"], maximum_longitude=BBOX["max_lon"],
        minimum_latitude=BBOX["min_lat"], maximum_latitude=BBOX["max_lat"],
        minimum_depth=0, maximum_depth=1,
        start_datetime=utc_ts.isoformat(), end_datetime=utc_ts.isoformat(),
        coordinates_selection_method="nearest",
        output_directory=str(out), output_filename=nc.name,
        overwrite=True, netcdf_compression_level=1
    )

    ds=xr.open_dataset(nc)
    lon_name=find_coord(ds,"longitude",["longitude","lon","LONGITUDE"])
    lat_name=find_coord(ds,"latitude",["latitude","lat","LATITUDE"])
    u=ds["uo"].squeeze(drop=True); v=ds["vo"].squeeze(drop=True)
    lon=ds[lon_name]; lat=ds[lat_name]
    points=[]

    if lon.ndim==1 and lat.ndim==1:
        ua=np.asarray(u); va=np.asarray(v)
        lons=np.asarray(lon); lats=np.asarray(lat)
        for iy in range(0,len(lats),args.step):
            for ix in range(0,len(lons),args.step):
                try:
                    uu=float(ua[iy,ix]); vv=float(va[iy,ix])
                except Exception:
                    uu=float(ua[ix,iy]); vv=float(va[ix,iy])
                if not (math.isfinite(uu) and math.isfinite(vv)): continue
                points.append({
                    "lat":round(float(lats[iy]),5),"lon":round(float(lons[ix]),5),
                    "u":round(uu,5),"v":round(vv,5),
                    "speed":round(math.hypot(uu,vv),5),
                    "dir":round(direction_deg(uu,vv),1)
                })
    else:
        lon2=np.asarray(lon); lat2=np.asarray(lat); ua=np.asarray(u); va=np.asarray(v)
        for idx in np.ndindex(lon2.shape):
            if any(i % args.step for i in idx): continue
            uu=float(ua[idx]); vv=float(va[idx])
            if not (math.isfinite(uu) and math.isfinite(vv)): continue
            points.append({
                "lat":round(float(lat2[idx]),5),"lon":round(float(lon2[idx]),5),
                "u":round(uu,5),"v":round(vv,5),
                "speed":round(math.hypot(uu,vv),5),
                "dir":round(direction_deg(uu,vv),1)
            })

    payload={
        "source":"Copernicus Marine / SMHI",
        "dataset_id":DATASET_ID,
        "requested_local_time":local_ts.isoformat(),
        "requested_utc_time":utc_ts.isoformat(),
        "direction_convention":"TO direction; u>0 east, v>0 north",
        "bbox":BBOX,"step":args.step,"point_count":len(points),"points":points
    }
    jp=out/"gotland_current.json"
    jp.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    md=f"""# Gotland Current Grid

- Local: **{local_ts.strftime('%d.%m.%Y %H:%M %Z')}**
- UTC: **{utc_ts.strftime('%Y-%m-%d %H:%MZ')}**
- Dataset: `{DATASET_ID}`
- Points: **{len(points)}**
- JSON size: **{jp.stat().st_size/1024:.1f} KiB**

Numeric model data, not WMTS rendering.
"""
    (out/"gotland_current.md").write_text(md,encoding="utf-8")
    print(md)

if __name__=="__main__":
    main()
