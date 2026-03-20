"""
Dynamic pricing engine for PriceLab.
All percentage rules are driven by config.yaml.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import pytz


@dataclass
class PricingResult:
    model: str
    year: int
    my_current_price: float
    market_min: float
    market_avg: float
    market_max: float
    competitiveness_index: float
    recommended_price: float
    whatsapp_offer_price: float
    reasons: list[str] = field(default_factory=list)
    steps_detail: list[str] = field(default_factory=list)


def _round_nearest(value: float, nearest: int) -> float:
    return round(value / nearest) * nearest


def resolve_benchmark(
    vehicle: dict,
    benchmarks: dict[str, dict],
    config: dict[str, Any],
) -> tuple[float, float, float, str]:
    """Return (min, avg, max) and note."""
    key = vehicle.get("model_key") or vehicle["model"]
    b = benchmarks.get(key)
    if b:
        return float(b["min"]), float(b["avg"]), float(b["max"]), f"benchmark:{key}"
    # fuzzy: partial match
    m = vehicle["model"].lower()
    for bk, bv in benchmarks.items():
        if bk.lower() in m or m in bk.lower():
            return float(bv["min"]), float(bv["avg"]), float(bv["max"]), f"benchmark:~{bk}"
    # fallback: spread around current price
    pct = config.get("market", {}).get("fallback_spread_pct", 15) / 100.0
    cur = float(vehicle["my_daily_price_aed"])
    return cur * (1 - pct), cur, cur * (1 + pct), "fallback:no_benchmark"


def dubai_now() -> datetime:
    return datetime.now(pytz.timezone("Asia/Dubai"))


def demand_multipliers(config: dict, when: datetime | None = None) -> tuple[float, list[str]]:
    when = when or dubai_now()
    mult = 1.0
    reasons: list[str] = []
    d = config["demand"]
    wd = when.weekday()
    if wd in d["weekend_days"]:
        mult *= d["weekend_multiplier"]
        reasons.append(f"Weekend Dubai (+{(d['weekend_multiplier']-1)*100:.0f}%)")
    month = when.month
    if month in d["high_season_months"]:
        mult *= d["high_season_multiplier"]
        reasons.append(f"High season (+{(d['high_season_multiplier']-1)*100:.0f}%)")
    elif month in d["low_season_months"]:
        mult *= d["low_season_multiplier"]
        reasons.append(f"Low season ({(d['low_season_multiplier']-1)*100:.0f}%)")
    return mult, reasons


def compute_vehicle(
    vehicle: dict,
    benchmarks_map: dict[str, dict],
    config: dict[str, Any],
    when: datetime | None = None,
) -> PricingResult:
    when = when or dubai_now()
    mmin, mavg, mmax, bench_note = resolve_benchmark(vehicle, benchmarks_map, config)
    current = float(vehicle["my_daily_price_aed"])
    idx = current / mavg if mavg else 1.0

    reasons: list[str] = []
    steps: list[str] = []
    price = current

    c = config["competitiveness"]
    if idx > c["overpriced_threshold"]:
        pct = c["reduce_when_overpriced_pct"] / 100.0
        price *= 1 - pct
        reasons.append(
            f"Competitiveness: precio {idx:.2f}× vs media mercado (>{c['overpriced_threshold']}) → −{c['reduce_when_overpriced_pct']}%"
        )
        steps.append(f"Post-competitiveness: {price:.0f} AED")
    elif idx < c["underpriced_threshold"]:
        pct = c["increase_when_underpriced_pct"] / 100.0
        price *= 1 + pct
        reasons.append(
            f"Competitiveness: precio {idx:.2f}× vs media (<{c['underpriced_threshold']}) → +{c['increase_when_underpriced_pct']}%"
        )
        steps.append(f"Post-competitiveness: {price:.0f} AED")
    else:
        reasons.append(
            f"Competitiveness: índice {idx:.2f} en rango óptimo ({c['optimal_low']}–{c['optimal_high']}) → sin ajuste por competencia"
        )
        steps.append(f"Post-competitiveness: {price:.0f} AED")

    d_mult, d_reasons = demand_multipliers(config, when)
    price *= d_mult
    reasons.extend(d_reasons)
    steps.append(f"Post-demand (×{d_mult:.2f}): {price:.0f} AED")

    avail = vehicle.get("units_available", 1)
    ath = config["availability"]
    if avail == 1:
        p = ath["single_unit_premium_pct"] / 100.0
        price *= 1 + p
        reasons.append(f"Availability: 1 unidad libre → +{ath['single_unit_premium_pct']}%")
    elif avail >= ath["many_idle_threshold"]:
        p = ath["many_idle_discount_pct"] / 100.0
        price *= 1 - p
        reasons.append(
            f"Availability: {avail} unidades ({ath['many_idle_threshold']}+) → −{ath['many_idle_discount_pct']}%"
        )
    steps.append(f"Post-availability: {price:.0f} AED")

    tb = config["time_to_booking"]
    hours = float(vehicle.get("last_booking_hours_ago", 9999))
    if hours >= tb["stale_hours"]:
        p = tb["stale_discount_pct"] / 100.0
        price *= 1 - p
        reasons.append(f"Tiempo: sin reserva en {hours:.0f}h (≥{tb['stale_hours']}h) → −{tb['stale_discount_pct']}%")
    elif hours <= tb["hot_hours"]:
        p = tb["hot_premium_pct"] / 100.0
        price *= 1 + p
        reasons.append(f"Tiempo: última reserva hace {hours:.0f}h (≤{tb['hot_hours']}h) → +{tb['hot_premium_pct']}%")
    steps.append(f"Post time-to-booking: {price:.0f} AED")

    nearest = int(config.get("rounding", {}).get("nearest", 50))
    rec = _round_nearest(price, nearest)
    wa_pct = config.get("whatsapp", {}).get("discount_vs_web_pct", 3) / 100.0
    wa = _round_nearest(rec * (1 - wa_pct), nearest)

    reasons.insert(0, f"Mercado ({bench_note}): min {mmin:.0f} / avg {mavg:.0f} / max {mmax:.0f} AED/día")

    return PricingResult(
        model=vehicle["model"],
        year=int(vehicle.get("year", 0)),
        my_current_price=current,
        market_min=mmin,
        market_avg=mavg,
        market_max=mmax,
        competitiveness_index=round(idx, 3),
        recommended_price=rec,
        whatsapp_offer_price=wa,
        reasons=reasons,
        steps_detail=steps,
    )


def run_all(config: dict, fleet: dict, market: dict, when: datetime | None = None) -> list[PricingResult]:
    benchmarks = market["benchmarks"]
    out: list[PricingResult] = []
    for v in fleet["vehicles"]:
        out.append(compute_vehicle(v, benchmarks, config, when))
    return out
