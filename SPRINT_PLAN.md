# Sprint plan — mi-boleta

Plan de trabajo **desagregado** para el ciclo actual. Complementa el plan de kickoff (fases 0–4 en `.cursor/plans/`) y el resumen de estado en `README.md`.

**Estado del producto (ago 2026):** usable a nivel país. Diputados nacionales, generales **2019–2025**, todas las provincias, wizard lista → electos → votos, hemiciclo por ley, fotos parciales, metodología en `/metodologia/`. UI rediseño Inter (hay cambios locales sin commitear).

---

## Cómo leer este plan

- **P0** = este sprint / corto plazo (alto valor o ya pedido).
- **P1** = siguiente ciclo (producto visible o datos que mejoran cobertura).
- **P2** = extensiones del plan original (más tarde).
- Cada ítem tiene: qué / por qué / tareas / criterio de hecho.
- Commits: siempre los hace Agustina (el agente no commitea).

---

## Hecho (no reabrir salvo regresión)

| Ítem | Notas |
| --- | --- |
| Fase 0 — Setup Next + Pages + `data/` | Hecho |
| Fase 1 — Pipeline votos + leyes curadas | ArgentinaDatos + HCDN |
| Fase 2 — Listas CNE nacionales + matching | 2019/2021/2023/2025; suplentes; `match_review` vacío |
| Fase 3 — Wizard + home + metodología | Hecho; rediseño Inter |
| Provincias (no solo CABA/BA) | Hecho |
| Fotos ArgentinaDatos | Hecho; cobertura parcial (~435/1157 en `legislators.csv`) |
| Hemiciclo por ley | Nómina del acta; hover foto/nombre/bloque; pills de fuerza |
| Listas 2019/2021 | Con `unrar` |
| Ampliar leyes 2024–2026 | ~15/año; 2020–2023 más flacos por cobertura de actas |

---

## P0 — Sprint actual

### 0.1 Handles de X/Twitter (`@`) de diputados + hover

**Qué:** Obtener el `@` (handle de X/Twitter) de los diputados y mostrarlo en el tooltip del hemiciclo (y, si aplica, en hover de avatares de la lista electa).

**Por qué:** Hoy el hover ya muestra foto, nombre, bloque, distrito y voto. El `@` cierra el puente “quién es esta banca” → redes.

**Tareas**

1. **Inventario de fuentes** (en orden de preferencia):
   - Datasets públicos de handles (p. ej. proyectos tipo gabinete/legisladores en X, listados colaborativos).
   - Perfiles / fichas oficiales HCDN si exponen redes.
   - ArgentinaDatos: hoy **no** trae redes en `/v1/diputados/diputados` — no depender de eso.
   - Fallback: archivo manual `data/processed/twitter_handles.csv` (o columna en `legislators.csv`) curado + aliases.
2. **Schema:** agregar `twitter` (o `x_handle`) a `legislators.csv` y propagar a `chamber_by_law.json` / seats del hemiciclo (y a `candidates_with_seats` si el hover de la lista lo necesita).
3. **Ingest:** script o paso en `ingest:process` que cruce por `legislator_id` / nombre normalizado; dejar `match` + reporte de sin handle.
4. **Cobertura mínima del sprint:** composición **actual** de la Cámara (~257) con la mayor cobertura posible; histórico es nice-to-have.
5. **UI hover (hemiciclo):** en el tooltip de `chamber-hemicycle.tsx`, debajo del bloque/distrito, mostrar `@handle` si existe (texto plano o link a `https://x.com/...`). Sin handle → no inventar; omitir la línea.
6. **UI hover (lista electa):** mismo dato en hover/focus del avatar o del nombre en `elegir-wizard` / explorer, si el patrón de tooltip ya existe o es barato de reutilizar.
7. **Docs:** anotar fuente y límites en `FUENTES.md` + párrafo corto en `/metodologia/` (origen no oficial / cobertura parcial / no es verificación de X).

**Criterio de hecho**

- [ ] Columna de handle en processed + regenerable por script.
- [ ] Hover del hemiciclo muestra `@…` cuando hay dato.
- [ ] Lista de pendientes / sin handle documentada (CSV de review o sección en metodología).
- [ ] `FUENTES.md` actualizado.

---

### 0.2 Cerrar / commitear pulido UI en curso

**Qué:** Hay cambios locales sin commitear en `globals.css`, `layout.tsx`, `metodologia`, `page.tsx`, `elegir-wizard`, `featured-votes-explorer`.

**Tareas**

1. Revisar diff vs Figma / feedback reciente (bordes 3px, radius 20px, hemiciclo decorativo, copy).
2. Smoke en desktop + mobile.
3. Commit por Agustina cuando esté OK.

**Criterio de hecho**

- [ ] Diff revisado y estable en `npm run dev` / `build:pages`.
- [ ] Commit hecho por la mantenedora.

---

### 0.3 Paridad de interacciones del prototipo Figma

**Qué:** En el chat de diseño se pasó el proto [QMV en Figma](https://www.figma.com/proto/cfj9K7GWHCLRx883AuejUQ/QMV?node-id=122-1490). Falta un pase explícito: listar interacciones del proto → gaps vs app → implementar las prioritarias.

**Tareas**

1. Recorrer el prototipo y documentar en este archivo (o issue) cada interacción: trigger → efecto esperado.
2. Priorizar (P0 vs P1) qué falta en home / wizard / hemiciclo / buscar por proyecto.
3. Implementar el lote P0 acordado.

**Criterio de hecho**

- [ ] Lista de interacciones + estado (hecho / gap / diferido).
- [ ] Gaps P0 implementados o explícitamente movidos a P1.

---

## P1 — Siguiente ciclo

### 1.1 Cobertura de leyes 2020–2023

**Estado:** ~3 / 1 / 7 / 6 leyes en 2020–2023 vs meta ~15/año (limitado por actas en ArgentinaDatos).

**Tareas**

1. Auditar `actas_index` / raw por año: qué actas nominales existen.
2. Curar hasta el tope realista por año (si no hay 15, documentar el techo).
3. Regenerar `votes_featured` + hemiciclos por ley.
4. Actualizar copy de metodología (“meta vs cobertura”).

**Criterio de hecho**

- [ ] Máxima cobertura posible documentada por año.
- [ ] `featured_laws.json` + votos regenerados.

---

### 1.2 Mejorar cobertura de fotos

**Estado:** ~435/1157 con URL; en cámara actual la cobertura es mejor pero no total.

**Tareas**

1. Medir % con foto en composición actual vs histórico.
2. Explorar fuentes alternativas (HCDN, scrapes estáticos) solo si hay URL estable y licencia OK.
3. Placeholder consistente cuando falte (ya hay).

**Criterio de hecho**

- [ ] Métrica publicada en metodología.
- [ ] Mejora medible o límite documentado.

---

### 1.3 Apoyo DINE / resultados

**Qué:** Si el cruce nombre↔lista no alcanza en algún distrito/año, usar resultados DINE / mininterior como apoyo.

**Tareas**

1. Evaluar si hoy hace falta (match 2019–2025 está en 100% con suplentes).
2. Si no hace falta: marcar como **standby** y no implementar.
3. Si aparece un mismatch nuevo: prototipar cruce por distrito + agrupación.

**Criterio de hecho**

- [ ] Decisión explícita: implementar o dejar en standby con motivo.

---

### 1.4 Pulido hemiciclo (geometría / bloques)

**Contexto:** Hubo varias iteraciones (filas, arco izquierda–derecha, tamaño de puntos, hover, pills). Puede quedar deuda visual vs mock HCDN.

**Tareas**

1. Checklist visual contra el mock de bloques.
2. Ajustes de layout solo si hay regression clara.
3. No reabrir el eje metodológico (posición = bloque del acta; color = voto del proyecto).

**Criterio de hecho**

- [ ] Sign-off visual o issues puntuales listados.

---

## P2 — Extensiones (plan original Fase 4)

### 2.1 Senado

- Fuentes de votos/listas distintas (más frágiles).
- Mismo flujo producto: boleta → electos → votos curados.
- Estimar como proyecto aparte, no mezclar en P0.

### 2.2 Votaciones “divididas” automáticas

- Sección aparte de la curada editorial.
- Criterio objetivo (margen estrecho, alta participación, etc.) + disclaimer.

### 2.3 Comparar listas

- UI: mi lista vs otra (mismos proyectos).
- Requiere UX clara para no volverse “score”.

### 2.4 PASO / más cargos

- Fuera de alcance salvo pedido explícito.

---

## Backlog de diseño (de chats) — tracking

| Pedido | Estado |
| --- | --- |
| Tipografía Inter en todo | Hecho |
| Hemiciclo decorativo hero (SVG Figma) | Hecho (decorativo) |
| Hemiciclo interactivo por ley | Hecho |
| Hover banca: foto, nombre, bloque | Hecho |
| Pills de bloque → atenuar resto | Hecho |
| Botones/selectores: borde 3px, radius 20px | En curso / verificar en diff local |
| SVG “Elegí tu lista” full-bleed / rotado | En curso / verificar |
| Proto Figma: mapear interacciones | Pendiente (P0.3) |
| `@` en hover | Pendiente (P0.1) — **nuevo** |

---

## Orden sugerido de ejecución (esta semana)

1. **0.1** Handles `@` + hover (dato + UI + docs).
2. **0.2** Cerrar pulido UI local y dejar listo para commit.
3. **0.3** Listar gaps del proto Figma; implementar solo lo P0.
4. Arrancar **1.1** o **1.2** según tiempo.

---

## Fuera de este sprint

- Commits del agente.
- Supabase / DB (sigue sin sentido para el MVP).
- Scraping en runtime (todo vía `scripts/ingest` → `data/processed`).
- Score ideológico / ranking moral.
