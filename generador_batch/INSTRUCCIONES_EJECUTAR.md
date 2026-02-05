# Cómo ejecutar el generador de preguntas

## ✓ Instalación completada

Las dependencias ya están instaladas en el entorno virtual `venv/`.

## Ejecutar el generador

Primero entra al directorio del generador:

```bash
cd ProcesadorPreguntasconFigura/generador_batch
```

### Opción 1: Script automatizado (recomendado)

```bash
./generar_algebra.sh
```

Este script:
- Usa automáticamente el entorno virtual
- Genera 15 preguntas por tema
- Total: 435 preguntas para los 29 temas de álgebra
- Tiempo estimado: 2-3 minutos

### Opción 2: Comando manual con venv

```bash
../venv/bin/python generar_sinteticas.py \
  --input RUTA_ALGEBRA.txt \
  --materia algebra \
  --provider gemini \
  --preguntas 15 \
  --lote 5 \
  --sleep 1.0 \
  --out-dir salida \
  --debug
```

### Opción 3: Para aritmética

```bash
../venv/bin/python generar_sinteticas.py \
  --input RUTA_ARITMETICA.txt \
  --materia aritmetica \
  --provider gemini \
  --preguntas 15 \
  --lote 5 \
  --sleep 1.0 \
  --out-dir salida \
  --debug
```

## Opciones configurables

- `--preguntas N`: Número de preguntas por tema (default: 15)
- `--lote N`: Preguntas por llamada API (default: 5)
- `--sleep N`: Segundos de pausa entre llamadas (default: 1.0)
- `--debug`: Mostrar información detallada del proceso

## Salida esperada

```
salida/
└── algebra/
    ├── division_de_polinomios.json (15 preguntas)
    ├── productos_notables.json (15 preguntas)
    ├── cocientes_notables.json (15 preguntas)
    └── ... (26 archivos más)
```

## Ejemplo de pregunta generada

Cada JSON contiene preguntas con este formato:

```json
{
  "id_temporal": "alg_div_001",
  "pregunta": "Problema nuevo con datos diferentes...",
  "dificultad": 2,
  "opciones": {
    "A": "Opción A",
    "B": "Opción B",
    "C": "Opción C",
    "D": "Opción D",
    "E": "Opción E"
  },
  "respuesta_correcta": "C",
  "explicacion": "Resolución paso a paso con los nuevos datos...",
  "imagen": null
}
```

## Solución de problemas

Si el script falla:

1. Verifica que `.env` tenga tu API key:
   ```bash
   cat .env
   ```

2. Reinstala las dependencias:
   ```bash
   rm -rf ../venv
   python -m venv ../venv
   ../venv/bin/pip install google-genai
   ```

3. Prueba con modo stub (sin API):
   ```bash
   ../venv/bin/python generar_sinteticas.py \
     --input RUTA_ALGEBRA.txt \
     --provider stub \
     --preguntas 3
   ```
