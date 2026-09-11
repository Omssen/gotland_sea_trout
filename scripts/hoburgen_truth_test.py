#!/usr/bin/env python3
"""
Exact numeric truth test for surface currents around Hoburgen, Gotland.

This script deliberately does NOT render a map and does NOT call WMTS.
It downloads numeric uo/vo from the official Copernicus Marine Baltic Sea
Physics hourly dataset and samples five fixed reference points.

Input time is LOCAL Gotland time (Europe/Stockholm).
Output contains:
- requested local time
- exact UTC time sent to Copernicus
- uo / vo in m/s
- speed in m/s
- flow direction (TO direction, degrees clockwise from true north)
- compass sector
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import xarray as xr
import copernicusmarine

DATASET_ID = "cmems_mod_bal_phy_anfc_PT1H-i"
LOCAL_TZ = ZoneInfo("Europe/Stockholm")

# Fixed diagnostic points around Hoburgen.
# These are intentionally offshore sample points, not coastline claims.
POINTS = {
    "W":  {"lon": 17.93, "lat": 56.93},
    "SW": {"lon": 18.02, "lat": 56.84},
    "S":  {"lon": 18.18, "lat": 56.79},
    "SE": {"lon": 18.38, "lat": 56.84},
    "E":  {"lon": 18.48, "lat": 56.94},
}

def parse_local_time(s: str) -> pd.Timestamp:
    ts = pd.Timestamp(s)
    if ts.tzinfo is None:
        ts = ts.tz_localize(LOCAL_TZ)
    else:
        ts = ts.tz_convert(LOCAL_TZ)
    return ts

def find_coord(ds: xr.Dataset, standard_name: str, candidates: list[str]) -> str:
    for name, var in ds.coords.items():
        if str(var.attrs.get("standard_name", "")).lower() == standard_name:
            return name
    for name in candidates:
        if name in ds.coords or name in ds.variables:
            return name
    raise KeyError(f"Coordinate for {standard_name} not found. Available: {list(ds.coords)}")

def surface_2d(da: xr.DataArray) -> xr.DataArray:
    # After Copernicus subsetting there should be exactly one time and one shallow depth.
    # Squeeze only length-1 dimensions; preserve horizontal dimensions.
    return da.squeeze(drop=True)

def direction_deg(u: float, v: float) -> float:
    # u > 0 east; v > 0 north. atan2(East, North) -> clockwise from north.
    return (math.degrees(math.atan2(u, v)) + 360.0) % 360.0

def compass(deg: float) -> str:
    names = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return names[int((deg + 11.25) // 22.5) % 16]

def nearest_from_grid(ds: xr.Dataset, lon_name: str, lat_name: str, lon: float, lat: float):
    lon_da = ds[lon_name]
    lat_da = ds[lat_name]

    # Rectilinear grid: easiest and exact nearest selection.
    if lon_da.ndim == 1 and lat_da.ndim == 1:
        sub = ds.sel({lon_name: lon, lat_name: lat}, method="nearest")
        return sub

    # Curvilinear grid: find nearest geographic cell.
    lon2 = np.asarray(lon_da)
    lat2 = np.asarray(lat_da)
    dist2 = (lon2 - lon) ** 2 + (lat2 - lat) ** 2
    if not np.isfinite(dist2).any():
        raise ValueError("No finite geographic coordinates in subset")
    idx = np.unravel_index(np.nanargmin(dist2), dist2.shape)
    indexers = {dim: i for dim, i in zip(lon_da.dims, idx)}
    return ds.isel(indexers)

def scalar(sub: xr.Dataset, name: str) -> float:
    da = surface_2d(sub[name])
    arr = np.asarray(da).astype(float).ravel()
    arr = arr[np.isfinite(arr)]
    if len(arr) == 0:
        return float("nan")
    return float(arr[0])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local-time", required=True, help="Europe/Stockholm local time, e.g. 2026-09-11T22:00:00")
    ap.add_argument("--output-dir", default="out")
    args = ap.parse_args()

    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)

    local_ts = parse_local_time(args.local_time)
    utc_ts = local_ts.tz_convert("UTC")

    # Tiny bbox around all five points, padded enough to guarantee nearby wet grid cells.
    lons = [p["lon"] for p in POINTS.values()]
    lats = [p["lat"] for p in POINTS.values()]
    min_lon, max_lon = min(lons) - 0.08, max(lons) + 0.08
    min_lat, max_lat = min(lats) - 0.08, max(lats) + 0.08

    nc_path = out / "hoburgen_subset.nc"

    # Exact same UTC instant as start/end. Nearest coordinate selection is explicit.
    copernicusmarine.subset(
        dataset_id=DATASET_ID,
        variables=["uo", "vo"],
        minimum_longitude=min_lon,
        maximum_longitude=max_lon,
        minimum_latitude=min_lat,
        maximum_latitude=max_lat,
        minimum_depth=0,
        maximum_depth=1,
        start_datetime=utc_ts.isoformat(),
        end_datetime=utc_ts.isoformat(),
        coordinates_selection_method="nearest",
        output_directory=str(out),
        output_filename=nc_path.name,
        overwrite=True,
        netcdf_compression_level=1,
    )

    ds = xr.open_dataset(nc_path)

    lon_name = find_coord(ds, "longitude", ["longitude", "lon", "LONGITUDE"])
    lat_name = find_coord(ds, "latitude", ["latitude", "lat", "LATITUDE"])

    results = []
    for label, p in POINTS.items():
        sub = nearest_from_grid(ds, lon_name, lat_name, p["lon"], p["lat"])
        u = scalar(sub, "uo")
        v = scalar(sub, "vo")

        # Extract actual sampled grid coordinates when possible.
        try:
            sampled_lon = float(np.asarray(sub[lon_name]).squeeze())
            sampled_lat = float(np.asarray(sub[lat_name]).squeeze())
        except Exception:
            sampled_lon, sampled_lat = p["lon"], p["lat"]

        if not (math.isfinite(u) and math.isfinite(v)):
            item = {
                "point": label,
                "requested_lon": p["lon"],
                "requested_lat": p["lat"],
                "sampled_lon": sampled_lon,
                "sampled_lat": sampled_lat,
                "valid": False,
                "reason": "uo/vo are NaN at nearest sampled model cell",
            }
        else:
            speed = math.hypot(u, v)
            deg = direction_deg(u, v)
            item = {
                "point": label,
                "requested_lon": p["lon"],
                "requested_lat": p["lat"],
                "sampled_lon": sampled_lon,
                "sampled_lat": sampled_lat,
                "valid": True,
                "uo_m_s": round(u, 5),
                "vo_m_s": round(v, 5),
                "speed_m_s": round(speed, 5),
                "direction_to_deg": round(deg, 1),
                "direction_to_compass": compass(deg),
            }
        results.append(item)

    payload = {
        "source": "Copernicus Marine / SMHI Baltic Sea Physics Analysis and Forecast",
        "dataset_id": DATASET_ID,
        "requested_local_time": local_ts.isoformat(),
        "requested_utc_time": utc_ts.isoformat(),
        "direction_convention": "TO direction; uo>0 east, vo>0 north; degrees clockwise from north",
        "points": results,
    }

    (out / "hoburgen_truth.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    lines = [
        "# Hoburgen – numerischer Strömungs-Wahrheitstest",
        "",
        f"- Lokale Zeit (Gotland): **{local_ts.strftime('%d.%m.%Y %H:%M %Z')}**",
        f"- UTC an Copernicus: **{utc_ts.strftime('%Y-%m-%d %H:%MZ')}**",
        f"- Dataset: `{DATASET_ID}`",
        "",
        "| Punkt | uo m/s | vo m/s | Speed m/s | Flussrichtung → | Modellpunkt |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for r in results:
        if r["valid"]:
            lines.append(
                f"| {r['point']} | {r['uo_m_s']:.5f} | {r['vo_m_s']:.5f} | "
                f"{r['speed_m_s']:.5f} | {r['direction_to_deg']:.1f}° {r['direction_to_compass']} | "
                f"{r['sampled_lat']:.4f}, {r['sampled_lon']:.4f} |"
            )
        else:
            lines.append(f"| {r['point']} | — | — | — | — | {r['reason']} |")

    lines += [
        "",
        "## Abnahmekriterium",
        "",
        "Dieser Test bewertet nur die echten numerischen Modellwerte. "
        "Er sagt noch nicht, welches Modell die reale Strömung am besten getroffen hat. "
        "Er ist die Grundlage für den Vergleich mit FCOO, DMI und Fishing in Denmark.",
        "",
    ]
    (out / "hoburgen_truth.md").write_text("\n".join(lines), encoding="utf-8")

    print((out / "hoburgen_truth.md").read_text(encoding="utf-8"))

if __name__ == "__main__":
    main()
