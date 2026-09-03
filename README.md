# Forge

Gestor de ideas: captura, ordena, prioriza y mueve ideas de punta a punta.

## Desarrollo

```bash
npm install
npm run dev
```

- Landing: http://localhost:5173
- Dashboard: http://localhost:5173/app
- Progreso en vivo: http://localhost:5173/progress.html

Persistencia local en IndexedDB (`forge-ideas`). No es un mock: crear, editar, buscar, comentar, cambiar estado y reordenar sobreviven al recargo.

## Backup

En la barra lateral o con `⌘K`:

- **Descargar backup** — JSON completo (ideas, comentarios, etiquetas, canvas)
- **Restaurar backup** — reemplaza los datos de este navegador
- **Copiar idea como Markdown** — con una idea abierta en el detalle

## Ritual: Vaciar la cabeza

Atajo `R` o el ítem del menú. Flujo de ~15 minutos:

1. Capturar lo que quedó a medias
2. Elegir **una** idea para hoy (pasa a En progreso)
3. Aparcar el resto a Por hacer o dejarlo en bandeja
4. Cerrar con un resumen del día

## Atajos

| Tecla | Acción |
| --- | --- |
| `C` | Enfocar captura |
| `R` | Ritual diario |
| `⌘K` | Paleta |
| `/` | Buscar |
| `J` / `K` | Siguiente / anterior |
| `Enter` | Abrir |
| `Esc` | Cerrar |
| `X` | Seleccionar |
| `Alt+1–4` | Cambiar estado |
| `Alt+↑/↓` | Reordenar |
| `⌘⌫` | Borrar (con deshacer) |
