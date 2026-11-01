# propertymaps.cl

Sitio estático de Property Maps (JE Inversiones SpA): portada de la marca más una página por proyecto.

| Ruta | Qué es |
|---|---|
| `/` | Portada: la marca y sus dos proyectos (sin formulario propio) |
| `/elquillay/` | Parcelas El Quillay (Bulnes, a 15 min de Chillán): lotes en línea, formulario, WhatsApp |
| `/miradornuble/` | Parcelas Mirador del Ñuble: formulario, WhatsApp |
| `/privacidad/` · `/terminos/` | Páginas legales |
| `assets/` | `css/site.css`, `js/site.js`, `img/` |

Sin build: se sirve tal cual. En local, `python3 -m http.server 8765` en esta carpeta (o `servir.py`
del proyecto, que no cachea). Los archivos que empiezan con `_` son solo para revisar y no se suben.

Los formularios envían a los webhooks de n8n de TerraWorks (`el-quillay-lead` y `mirador-nuble-lead`),
que crean el contacto y la oportunidad en el CRM y mandan el evento Lead a la API de conversiones de Meta.
La documentación técnica vive en la carpeta del proyecto en TerraWorks (`docs/INTEGRACION-WEB-N8N-HIGHLEVEL.md`).
