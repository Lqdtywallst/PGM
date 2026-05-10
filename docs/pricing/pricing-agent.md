# Pricing Agent

Agente interno para revisar precios por coche usando tres senales:

- demanda propia: reservas guardadas en PostgreSQL si `DATABASE_URL` existe; si no, JSON local en `output/runtime-reservations`
- mercado comparable: snapshot fresco en `server/data/competitor-prices.json`
- guardrails comerciales: suelos, techos, maximo cambio por ejecucion y redondeo definidos en `server/data/pricing-policy.json`

## Modo seguro

Por defecto el agente solo recomienda:

```bash
npm run agent:pricing
```

Genera un informe en `artifacts/pricing-agent/<timestamp>/report.md` y `report.json`.

Para validar que la cobertura de competencia esta completa:

```bash
npm run audit:pricing
```

Este comando falla si no todos los coches tienen datos frescos de competencia. Es intencional: evita aplicar precios con informacion incompleta.

## Datos De Competencia

El agente no inventa precios de otras empresas ni hace scraping por defecto. Para comparar contra mercado real:

1. Copia `server/data/competitor-prices.example.json` a `server/data/competitor-prices.json`.
2. Sustituye las empresas de ejemplo por precios observados o por datos de un proveedor/API permitido.
3. Mantiene `capturedAt` reciente; por defecto, mas de 14 dias se considera obsoleto.

Formato minimo:

```json
{
  "generatedAt": "2026-04-25T00:00:00.000Z",
  "currency": "AED",
  "prices": [
    {
      "vehicleId": "mercedes-g63-amg",
      "company": "Competitor name",
      "dailyPrice": 1800,
      "availability": "available",
      "capturedAt": "2026-04-25T00:00:00.000Z",
      "url": "https://example.com/source-page"
    }
  ]
}
```

## Aplicar Cambios

Solo aplica si hay cambios recomendados y no estan bloqueados por falta de datos frescos:

```bash
npm run agent:pricing:apply
```

El apply actualiza `server/data/fleet-cards.json`, regenera `site/pages/core/fleet.html` y sincroniza de forma best-effort textos/precios en paginas estaticas de marcas y vehiculos.

Si alguna vez necesitas probar escenarios sin competencia fresca, existe:

```bash
node scripts/pricing/run-pricing-agent.js --apply --allow-missing-competitors
```

No es recomendable para produccion.

## Politica Actual

- objetivo de mercado: un 2.5% mejor que el precio comparable mas bajo fresco
- cambio maximo por ejecucion: 8%
- redondeo: pasos de 50 AED
- aplicacion bloqueada si falta competencia fresca
- demanda alta sube precios dentro de guardrails
- demanda baja solo baja precios si ya hay historial propio; sin historial no toca nada

## Automatizacion Recomendada

Ejecutar en cron o GitHub Actions en dos fases:

1. `npm run agent:pricing` a diario para generar informe.
2. `npm run agent:pricing:apply` solo cuando `server/data/competitor-prices.json` se alimente con datos frescos y revisados.

El siguiente paso natural seria crear un conector de mercado permitido que actualice `competitor-prices.json` automaticamente antes de ejecutar el agente.
