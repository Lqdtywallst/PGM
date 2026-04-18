# Checklist de Mantenimiento 2026-04-18

- cada archivo nuevo tiene una justificacion clara
- cada archivo nuevo cae en la carpeta correcta
- nada no publico entra en `site/`
- toda referencia local apunta a un archivo existente
- sitemap solo contiene URLs canonicas, publicas y activas
- cada pagina publica mantiene una canonical valida y un solo `h1`
- cada pagina publica mantiene `title` y meta description especificos y no reciclados por error
- cada pagina publica importante mantiene sus metadatos OG/Twitter y el schema esperado
- ninguna pagina publica referencia localhost, staging, previews o labs
- cada nueva landing o PDP entra en el enlazado interno y en sitemap cuando toca
- `npm test` pasa antes de publicar
- `npm run audit:seo` pasa si hay cambios en sitemap, canonicals, metadatos o nuevas URLs
- `npm run test:e2e` pasa para las rutas criticas
- `npm run audit:final` se usa antes de publicar cambios amplios o lotes con impacto SEO/funcional
- no se suben `output/`, `temp/`, `test-results/` ni logs
- si aparece una duda razonable, se archiva fuera de `site/` antes de borrar
