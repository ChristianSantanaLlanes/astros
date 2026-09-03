# Forge

Gestor de ideas: captura, ordena, prioriza y mueve ideas de punta a punta.

## Desarrollo

```bash
npm install
npm run dev
```

- App: http://localhost:5173
- Progreso en vivo: http://localhost:5173/progress.html

Persistencia local en IndexedDB (`forge-ideas`). No es un mock: crear, editar, buscar, comentar, cambiar estado y reordenar sobreviven al recargo.

## Atajos

| Tecla | Acción |
| --- | --- |
| `C` | Enfocar captura |
| `⌘K` | Paleta |
| `/` | Buscar |
| `J` / `K` | Siguiente / anterior |
| `Enter` | Abrir |
| `Esc` | Cerrar |
| `X` | Seleccionar |
| `Alt+1–4` | Cambiar estado |
| `Alt+↑/↓` | Reordenar |
| `⌘⌫` | Borrar (con deshacer) |
