#!/usr/bin/env python3
"""
CLI: imprime recomendaciones y guarda CSV.
Uso:  cd pricelab && python3 run_report.py
      python3 run_report.py --out precios_recomendados.csv
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from src.loaders import load_config, load_fleet, load_market
from src.pricing_engine import run_all


def main() -> None:
    parser = argparse.ArgumentParser(description="PriceLab — informe de precios")
    parser.add_argument("--out", type=Path, default=Path("output/recommendations.csv"), help="CSV de salida")
    args = parser.parse_args()

    config = load_config()
    fleet = load_fleet()
    market = load_market()
    results = run_all(config, fleet, market)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "model",
        "year",
        "my_current_price",
        "market_min",
        "market_avg",
        "market_max",
        "competitiveness_index",
        "recommended_price_aed",
        "whatsapp_offer_aed",
        "reasons",
    ]
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in results:
            w.writerow(
                {
                    "model": r.model,
                    "year": r.year,
                    "my_current_price": r.my_current_price,
                    "market_min": r.market_min,
                    "market_avg": r.market_avg,
                    "market_max": r.market_max,
                    "competitiveness_index": r.competitiveness_index,
                    "recommended_price_aed": r.recommended_price,
                    "whatsapp_offer_aed": r.whatsapp_offer_price,
                    "reasons": " | ".join(r.reasons),
                }
            )

    print(f"CSV guardado: {args.out.resolve()}\n")
    print("=" * 72)
    for r in results:
        print(f"\n{r.model} ({r.year})")
        print(f"  Actual: {r.my_current_price:.0f} AED  →  Recomendado web: {r.recommended_price:.0f} AED")
        print(f"  Oferta WhatsApp sugerida: {r.whatsapp_offer_price:.0f} AED")
        print(f"  Índice competencia (vs avg): {r.competitiveness_index}")
        print("  Motivos:")
        for line in r.reasons:
            print(f"    • {line}")
    print("\n" + "=" * 72)


if __name__ == "__main__":
    main()
