# PriceLab — sistema de precios dinámicos (alquiler lujo Dubai)

Herramienta para **analizar competitividad** frente a rangos de mercado simulados (estilo OneClickDrive / Renty / Octane) y **proponer precio web + oferta WhatsApp**.

## Qué incluye

| Parte | Descripción |
|--------|-------------|
| `config.yaml` | **Todo configurable**: umbrales, % demanda, estacionalidad, fin de semana, disponibilidad, tiempo sin reserva, descuento WhatsApp. |
| `data/fleet.json` | **Tu flota** (precio actual, unidades, horas desde última reserva). |
| `data/market_benchmarks.json` | **Min / avg / max** AED/día por modelo (simulado; sustituye por tus scraping o datos reales). |
| `src/pricing_engine.py` | Motor: competencia → demanda → disponibilidad → tiempo. |
| `run_report.py` | Informe en terminal + **CSV**. |
| `app.py` | **Dashboard Streamlit** (tabla coloreada + detalle). |

## Instalación (local)

```bash
cd pricelab
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Uso

### 1) Informe en consola + CSV

```bash
cd pricelab
python3 run_report.py
# opcional:
python3 run_report.py --out output/mi_informe.csv
```

### 2) Dashboard (recomendado para el dueño del negocio)

```bash
cd pricelab
streamlit run app.py
```

Se abre el navegador (por defecto `http://localhost:8501`).

## Cómo actualizar datos

1. **Tu flota**: edita `data/fleet.json`.
2. **Mercado**: edita `data/market_benchmarks.json` (o conecta más adelante a CSV/API).
3. **Reglas**: edita `config.yaml` sin tocar código.

## Notas

- Los rangos de mercado son **orientativos**; sustitúyelos por datos reales cuando los tengas.
- Zona horaria de demanda (fin de semana / mes): **Asia/Dubai**.
- El índice de competencia = `mi_precio / precio_medio_mercado`.

## Integración futura (opcional)

- Sustituir `market_benchmarks.json` por salida de scrapers o Google Sheets.
- Llamar a `run_all()` desde un cron y enviar el CSV por email.
