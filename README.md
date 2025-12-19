# 🏥 Sistema de Gestión de Citas - Kmina Salud

Sistema completo de agendamiento de horas médicas con panel de administración avanzado.

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Ejecutar el Servidor

```bash
node server.js
```

El servidor estará disponible en: `http://localhost:3000`

## 🔐 Acceso Administrativo

**Contraseña:** `Kmina.2026$$`

## 📊 Características Principales

### Para Pacientes

- ✅ Reserva de citas online
- ✅ Selección de especialidad y especialista
- ✅ Búsqueda de horarios disponibles
- ✅ Confirmación automática por WhatsApp

### Para Administradores

- ✅ **Gestión de Citas:**
  - Editar citas existentes
  - Crear citas manualmente (para llamadas telefónicas)
  - Eliminar citas
  - Búsqueda y filtros avanzados
  - Vista de tabla y calendario

- ✅ **Gestión de Especialistas:**
  - Agregar nuevos especialistas
  - Eliminar especialistas
  - Configurar horarios personalizados

- ✅ **Reportes y Estadísticas:**
  - 4 gráficos analíticos (Especialistas, Tendencia, Previsión, Horarios Pico)
  - KPIs en tiempo real
  - Exportación a Excel con múltiples hojas

- ✅ **Filtros Avanzados:**
  - Búsqueda por nombre de paciente
  - Filtro por rango de fechas
  - Filtro por especialista
  - Aplicación en tiempo real

- ✅ **Vista de Calendario:**
  - Visualización mensual de citas
  - Navegación por meses
  - Click en día para filtrar
  - Click en cita para editar

## 💾 Persistencia de Datos

### Base de Datos SQLite

El sistema utiliza **SQLite** para almacenar todos los datos de forma persistente:

- **Archivo:** `database.db`
- **Ubicación:** Raíz del proyecto
- **Tablas:**
  - `specialists` - Especialistas y sus horarios
  - `appointments` - Citas agendadas

### ⚠️ Importante para Render

En **Render (plan gratuito)**, el sistema de archivos es **efímero**. Esto significa que:

❌ Los datos se **perderán** al reiniciar el servidor
❌ El archivo `database.db` se **borrará** en cada deploy

### ✅ Soluciones para Persistencia en Render

#### Opción 1: PostgreSQL (Recomendado)

1. Crear una base de datos PostgreSQL en Render
2. Modificar el código para usar PostgreSQL en lugar de SQLite
3. Los datos persistirán permanentemente

#### Opción 2: Servicio de Base de Datos Externa

- **Supabase** (PostgreSQL gratuito)
- **PlanetScale** (MySQL gratuito)
- **MongoDB Atlas** (MongoDB gratuito)

#### Opción 3: Render Persistent Disks (Pago)

- Agregar un disco persistente a tu servicio en Render
- Los datos se mantendrán entre reinicios

### 🔄 Comportamiento Actual

**Primera vez que se ejecuta:**

```
✅ Base de datos inicializada con 7 especialistas de Kmina Salud
```

**Especialistas iniciales:**

**Kinesiología:**

- Sebastian Davies Tapia
- Eric Farias Gajardo

**Psicología:**

- Estefania Zumaran
- Sussy Aquez Macaya
- Gonzalo Labarca

**Fonoaudiología:**

- Fonoaudiólogo (A definir) - *Placeholder hasta confirmar profesional*

**Nutrición:**

- Nutricionista (A definir) - *Placeholder hasta confirmar profesional*

**Reinicios posteriores (local):**

```
✅ Base de datos cargada: 7 especialista(s) encontrado(s)
```

Los especialistas que agregues manualmente se **mantendrán** en la base de datos local.

### 🔄 Resetear Base de Datos

Si necesitas reiniciar la base de datos con los especialistas por defecto:

**Windows:**

```bash
reset-database.bat
```

**Linux/Mac:**

```bash
chmod +x reset-database.sh
./reset-database.sh
```

O manualmente:

```bash
# Eliminar base de datos
rm database.db  # Linux/Mac
del database.db  # Windows

# Reiniciar servidor
node server.js
```

## 📁 Estructura del Proyecto

```
agendamiento-horas-medicas/
├── server.js              # Servidor Node.js + API
├── database.db            # Base de datos SQLite (generada automáticamente)
├── package.json           # Dependencias
├── public/
│   ├── index.html         # Interfaz principal
│   ├── app.js             # Lógica del frontend
│   ├── styles.css         # Estilos
│   ├── Logo.png           # Logo de Kmina
│   └── Images/            # Imágenes de especialistas
└── README.md              # Este archivo
```

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js + Express
- **Base de Datos:** SQLite3
- **Frontend:** HTML5 + JavaScript Vanilla + CSS3
- **Gráficos:** Chart.js
- **Exportación:** SheetJS (xlsx)
- **Notificaciones:** WhatsApp Web API

## 📞 Integración WhatsApp

El sistema genera enlaces de WhatsApp automáticamente para:

- Confirmación de citas online
- Confirmación de citas manuales
- Confirmación de ediciones

**Número configurado:** +56 9 2071 5811

Para cambiar el número, editar en `server.js` líneas 215 y 240.

## 🎨 Personalización

### Cambiar Colores

Editar variables CSS en `public/styles.css`:

```css
:root {
  --primary: #d81b60;
  --secondary: #880e4f;
  --bg-light: #fff0f5;
  /* ... más variables */
}
```

### Cambiar Contraseña de Admin

Editar en `server.js` línea 108:

```javascript
if (password === 'Kmina.2026$$') {
```

### 📋 **Configuración por Defecto:**

Todos los especialistas tienen:

- **Horario:** 08:00 - 20:00 (12 horas)
- **Duración de cita:** 30 minutos
- **Bloques disponibles:** 24 citas por día
- **Días:** Lunes a Viernes (configurable desde el panel)

### Modificar Horarios por Defecto

Los especialistas nuevos se crean con los horarios que definas en el formulario de administración.

## 📊 Exportación de Datos

El botón "Exportar Excel" genera un archivo con 4 hojas:

1. **Dashboard** - KPIs y resumen ejecutivo
2. **Resumen por Fecha** - Citas agrupadas por especialista y fecha
3. **Detalle Completo** - Todas las citas con información completa
4. **Por Previsión** - Estadísticas de tipos de previsión

## 🐛 Solución de Problemas

### El servidor no inicia

```bash
# Verificar que Node.js esté instalado
node --version

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### No aparecen los especialistas

- Verificar que existe el archivo `database.db`
- Revisar la consola del servidor para mensajes de error
- Eliminar `database.db` y reiniciar para recrear la base de datos

### Los filtros no funcionan

- Verificar que JavaScript esté habilitado en el navegador
- Abrir la consola del navegador (F12) para ver errores
- Limpiar caché del navegador

## 📝 Licencia

Desarrollado para Kmina Salud - 2025

## 🤝 Soporte

Para soporte técnico, contactar a:

- 📧 Email: <kminasalud@gmail.com>
- 📞 Teléfono: +56 9 2071 5811
- 📸 Instagram: @kmina_salud
