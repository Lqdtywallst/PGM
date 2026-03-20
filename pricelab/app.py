"""
PriceLab Dashboard — Streamlit
Ejecutar:  cd pricelab && streamlit run app.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.loaders import load_config, load_fleet, load_market
from src.pricing_engine import run_all

st.set_page_config(page_title="PriceLab — Dynasty Prestige", layout="wide")
st.title("PriceLab")
st.caption("Recomendaciones de precio (Dubai) · datos de mercado simulados · edita `config.yaml` y `data/fleet.json`")

config = load_config()
fleet = load_fleet()
market = load_market()
results = run_all(config, fleet, market)

rows = []
for r in results:
    delta = r.recommended_price - r.my_current_price
    pct = (delta / r.my_current_price * 100) if r.my_current_price else 0
    comp = r.competitiveness_index
    if comp > 1.15:
        comp_label = "Caro vs mercado"
        comp_color = "🔴"
    elif comp < 0.92:
        comp_label = "Barato vs mercado"
        comp_color = "🟡"
    else:
        comp_label = "En rango"
        comp_color = "🟢"
    rows.append(
        {
            "Estado": f"{comp_color} {comp_label}",
            "Modelo": r.model,
            "Año": r.year,
            "Mi precio (AED)": r.my_current_price,
            "Mercado min": r.market_min,
            "Mercado avg": r.market_avg,
            "Mercado max": r.market_max,
            "Índice (mi/avg)": r.competitiveness_index,
            "Recomendado web": r.recommended_price,
            "Δ vs actual": delta,
            "Δ %": round(pct, 1),
            "WhatsApp": r.whatsapp_offer_price,
        }
    )

df = pd.DataFrame(rows)

st.subheader("Tabla de flota")
st.dataframe(
    df,
    use_container_width=True,
    hide_index=True,
)

st.subheader("Detalle por vehículo")
for r in results:
    with st.expander(f"{r.model} — recomendado {r.recommended_price:.0f} AED / día"):
        st.markdown("**Motivos (orden lógico del motor)**")
        for x in r.reasons:
            st.markdown(f"- {x}")
        st.markdown("**Pasos numéricos**")
        for x in r.steps_detail:
            st.code(x, language=None)

st.sidebar.header("Archivos")
st.sidebar.markdown(
    """
- `config.yaml` — todos los % y umbrales  
- `data/fleet.json` — tu flota  
- `data/market_benchmarks.json` — rangos de mercado  
"""
)
st.sidebar.markdown("Tras editar, recarga esta página (R).")

csv_bytes = df.to_csv(index=False).encode("utf-8")
st.download_button(
    "Descargar CSV (tabla resumen)",
    data=csv_bytes,
    file_name="pricelab_resumen.csv",
    mime="text/csv",
)
