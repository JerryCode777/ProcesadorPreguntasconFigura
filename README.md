# 📚 Banco de Preguntas Preuniversitarias con IA

Sistema web avanzado desarrollado con FastAPI para generar y gestionar preguntas preuniversitarias en formato JSON, con **inteligencia artificial integrada** para autocompletado desde imágenes.

## ✨ Características Principales

### 🚀 **Captura Rápida con IA**
- **Drag & Drop** de imágenes de preguntas
- **Procesamiento automático** con múltiples APIs de IA
- **Autocompletado inteligente** de todos los campos del formulario
- **Soporte para ecuaciones matemáticas** en formato LaTeX
- **4 APIs de IA disponibles**: OpenAI GPT-4, Google Gemini, Claude Vision, Azure OpenAI

### 🧮 **Calculadora Científica Avanzada**
- **8 categorías de símbolos**: Básicos, Exponentes, Fracciones, Comparaciones, Trigonometría, Logaritmos, Letras Griegas, Matrices
- **70+ símbolos matemáticos** con un clic
- **Vista previa en tiempo real** con renderizado LaTeX
- **Inserción inteligente** con posicionamiento del cursor
- **Matrices personalizables** y vectores dinámicos

### 📋 **Formulario Inteligente**
- **5 opciones de respuesta** (A, B, C, D, E)
- **20 materias preconfiguradas**
- **Validaciones avanzadas** con retroalimentación visual
- **Autocompletado desde IA** con un clic
- **Vista previa matemática** en tiempo real

## 🗂️ Estructura del Proyecto

```
12unsaapp/
├── main.py                 # Aplicación FastAPI principal
├── models.py               # Modelos Pydantic
├── utils.py                # Funciones de utilidad
├── requirements.txt        # Dependencias
├── run.py                 # Script de ejecución
├── templates/
│   └── formulario.html    # Plantilla HTML
├── static/
│   ├── css/
│   │   └── styles.css     # Estilos CSS
│   └── js/
│       └── script.js      # JavaScript del frontend
└── banco_preguntas/       # Directorio generado automáticamente
    └── {materia}/
        ├── {tema}.json    # Archivos JSON por tema
        └── imagenes/      # Imágenes por materia
            └── {materia}_{tema}_001.jpg
```

## 🚀 Instalación y Ejecución

### 1. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 2. Ejecutar el servidor

**Opción A: Con el script de ejecución**
```bash
python run.py
```

**Opción B: Directamente con uvicorn**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Acceder a la aplicación

Abre tu navegador en: **http://localhost:8000**

## 🤖 Configuración de APIs de IA

### Paso 1: Copia el archivo de ejemplo
```bash
cp .env.example .env
```

### Paso 2: Configura tus API Keys

Edita el archivo `.env` y descomenta las APIs que quieras usar:

**OpenAI GPT-4 Vision (Recomendado):**
```bash
OPENAI_API_KEY=sk-tu-api-key-aqui
```

**Google Gemini Pro Vision:**
```bash
GEMINI_API_KEY=tu-api-key-aqui
```

**Anthropic Claude Vision:**
```bash
ANTHROPIC_API_KEY=tu-api-key-aqui
```

**Azure OpenAI:**
```bash
AZURE_OPENAI_API_KEY=tu-api-key-aqui
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com/
```

### 🔑 Obtener API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Google Gemini**: https://makersuite.google.com/app/apikey
- **Anthropic Claude**: https://console.anthropic.com/
- **Azure OpenAI**: https://portal.azure.com/

### 💡 Recomendaciones

1. **OpenAI GPT-4o** es el más preciso para texto matemático
2. **Google Gemini Pro** es gratuito hasta cierto límite
3. **Claude Vision** es excelente para comprensión contextual
4. Si no configuras ninguna API, el sistema usará **respuestas simuladas** para pruebas

## 📝 Uso

### 🚀 Modo IA (Recomendado para eficiencia)
1. **Arrastra una imagen** de la pregunta al área de captura
2. **Selecciona el servicio de IA** que prefieres
3. **Haz clic en "Procesar con IA"**
4. **Revisa y edita** los campos autocompletados
5. **Genera la pregunta** con un clic

### ✏️ Modo Manual (Para control total)

1. **Selecciona la materia** del dropdown (20 opciones disponibles)
2. **Ingresa el tema** de la pregunta
3. **Escribe la pregunta** en el área de texto
4. **Completa las 5 opciones** (A, B, C, D, E)
5. **Selecciona la respuesta correcta**
6. **Agrega una explicación** detallada
7. **Selecciona la dificultad** (1-5)
8. **Opcionalmente sube una imagen**
9. **Haz clic en "Crear Pregunta"**

## 📋 Materias Disponibles

- Razonamiento Lógico
- Razonamiento Matemático  
- Razonamiento Verbal
- Comprensión Lectora
- Algebra
- Aritmética
- Geometría
- Trigonometría
- Historia
- Geografía
- Química
- Biología
- Física
- Filosofía
- Psicología
- Educación Cívica
- Lenguaje
- Literatura
- Inglés Lectura
- Inglés Gramática

## 🎯 Formato JSON Generado

```json
{
  "materia": "algebra",
  "tema": "ecuaciones_lineales", 
  "preguntas": [
    {
      "id_temporal": "alg_ecu_001",
      "pregunta": "Resuelve la ecuación: 2x + 5 = 13",
      "dificultad": 2,
      "opciones": {
        "A": "x = 4", 
        "B": "x = 5", 
        "C": "x = 6", 
        "D": "x = 3",
        "E": "x = 8"
      },
      "respuesta_correcta": "A", 
      "explicacion": "2x + 5 = 13, por lo tanto 2x = 8, entonces x = 4",
      "imagen": "algebra_ecuaciones_lineales_001.jpg"
    }
  ]
}
```

## 🔧 Funcionalidades Técnicas

### Normalización Automática
- Convierte texto a minúsculas
- Elimina tildes y caracteres especiales
- Reemplaza espacios con guiones bajos

### Gestión de Archivos
- Crea directorios automáticamente si no existen
- Numeración secuencial automática para imágenes e IDs
- Si el archivo JSON existe, agrega la pregunta al array existente

### Validaciones
- Campos obligatorios
- Formato de respuesta correcta (A-E)
- Rango de dificultad (1-5)
- Tipos de imagen permitidos
- Tamaño máximo de imagen (5MB)

## 🛠️ API Endpoints

- `GET /` - Formulario principal
- `POST /crear-pregunta` - Crear nueva pregunta
- `GET /api/materias` - Obtener lista de materias

## 🎨 Características de la Interfaz

- **Diseño responsive** para móviles y desktop
- **Gradientes modernos** y animaciones suaves
- **Validación en tiempo real** con mensajes de error
- **Vista previa de imágenes** antes de subir
- **Auto-resize de textareas**
- **Botón de copiar JSON** al portapapeles
- **Confirmaciones de acciones**

## 📱 Responsive Design

La interfaz se adapta completamente a:
- 📱 Dispositivos móviles (< 480px)
- 📱 Tablets (< 768px)  
- 💻 Desktop (> 768px)

## ⚡ Rendimiento

- **Carga rápida** con CSS optimizado
- **Validación cliente-servidor**
- **Manejo eficiente de archivos**
- **Estados de carga** con spinners

## 🔐 Seguridad

- Validación de tipos de archivo
- Límites de tamaño de imagen
- Sanitización de nombres de archivo
- Validación server-side completa