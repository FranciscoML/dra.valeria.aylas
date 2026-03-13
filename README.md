# Dra. Valeria Aylas — Landing Page

Sitio web profesional para **Dra. Valeria Aylas**, especialista en Medicina Física y Rehabilitación (Lima, Perú). Incluye sistema de agendamiento de citas conectado a Google Calendar y Gmail vía Google Apps Script.

🌐 **Live:** [dra-valeria-aylas.vercel.app](https://dra-valeria-aylas.vercel.app)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + Vanilla JS (sin frameworks) |
| Fuentes | Playfair Display + Jost (Google Fonts) |
| Deploy | Vercel (auto-deploy desde GitHub `main`) |
| Backend | Google Apps Script (Web App) |
| Calendario | Google Calendar API (via Apps Script) |
| Email | Gmail API (via Apps Script) |

---

## Estructura del repositorio

```
dra.valeria.aylas/
├── index.html          # Página principal (todo-en-uno: HTML + CSS inline + JS inline)
├── fonts/
│   └── poorich.ttf     # Fuente utilizada para encabezados
├── img/
│   ├── brand.webp      # Logotipo
│   └── dra-valeria-aylas.jpg   # Foto de la doctora (agregar manualmente)
└── README.md
```

> **Nota:** Vercel sirve `index.html` como entry point. El CSS y JS están embebidos inline en ese archivo para garantizar que los cambios apliquen sin depender de caché de archivos externos.

---

## Flujo de agendamiento

```
Usuario selecciona fecha
        ↓
GET /exec?action=disponibilidad&fecha=YYYY-MM-DD
        ↓
Apps Script consulta Google Calendar
        ↓
Devuelve array de slots ocupados → se deshabilitan en el <select>
        ↓
Usuario completa formulario y envía
        ↓
POST /exec  {name, email, phone, date, time, service, notes}
        ↓
Apps Script:
  1. Valida campos y disponibilidad
  2. Crea evento en Google Calendar
  3. Envía email de confirmación al paciente
  4. Envía notificación a la doctora
        ↓
Frontend abre WhatsApp con resumen de la cita
```

---

## Configuración inicial (primera vez)

### 1. Google Apps Script

1. Abre [script.google.com](https://script.google.com) con el Gmail de la doctora
2. Crea un nuevo proyecto → pega el contenido de `Code.gs`
3. Edita las constantes en `CONFIG`:
   ```javascript
   DRA_EMAIL:  "email.real@gmail.com",
   WA_NUMERO:  "51XXXXXXXXX",
   ```
4. Ve a ⚙️ **Configuración del proyecto** → zona horaria → `(GMT-05:00) America/Lima`
5. **Implementar** → Nueva implementación → Aplicación web:
   - Ejecutar como: **Yo**
   - Acceso: **Cualquier persona**
6. Copia la URL `/exec` generada

### 2. Conectar frontend

En `index.html`, reemplaza el valor de `APPS_SCRIPT_URL`:

```javascript
var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/TU_ID/exec';
```

### 3. Deploy

Haz commit y push a `main` → Vercel redespliega automáticamente en ~30 segundos.

---

## Endpoints del Apps Script

### `GET ?action=disponibilidad&fecha=YYYY-MM-DD`

Devuelve los slots ocupados para una fecha.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "ocupados": ["11:00", "12:00", "13:00"]
  }
}
```

### `POST /exec` — body JSON

Agenda una cita nueva.

```json
{
  "name":    "Juan",
  "lastname": "Pérez",
  "email":   "juan@ejemplo.com",
  "phone":   "+51 999 888 777",
  "date":    "2026-04-15",
  "time":    "10:00",
  "service": "Evaluación funcional",
  "notes":   "Opcional"
}
```

Respuesta exitosa:
```json
{
  "success": true,
  "message": "Cita agendada con éxito.",
  "data": {
    "evento_id": "...",
    "inicio": "2026-04-15 10:00",
    "fin":    "2026-04-15 11:00"
  }
}
```

---

## Pruebas del Apps Script (sin deploy)

Desde el editor de Apps Script, selecciona la función en el menú desplegable y presiona ▶:

| Función | Qué prueba |
|---------|-----------|
| `testDoGet()` | Consulta disponibilidad del 17/03/2026 |
| `testDoPost()` | Agenda una cita de prueba el 15/04/2026 a las 12:00 |
| `testHealthCheck()` | Verifica que la API responde |

> ⚠️ **No ejecutes `doGet` ni `doPost` directamente con ▶** — sin el objeto `e` siempre lanzan error. Usa las funciones `test*`.

---

## Slots de horario disponibles

```
08:00 · 09:00 · 10:00 · 11:00 · 12:00
14:00 · 15:00 · 16:00 · 17:00 · 18:00 · 19:00 · 20:00
```

Configurables en `CONFIG.HORA_INICIO` / `CONFIG.HORA_FIN` (Apps Script) y en el array `ALL_TIMES` del JS del frontend.
