#!/bin/bash
# Launcher genérico para generar preguntas sintéticas por curso.
# Uso: ./generar_algebra.sh [tema_inicio]
# Ejemplo: ./generar_algebra.sh 20  (continuar desde tema 20)
# Para otro curso, solo edita el bloque CONFIG.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SCRIPT_DIR"

# =========================
# CONFIG (editar aquí)
# =========================
NOMBRE_CURSO="ÁLGEBRA"
INPUT_FILE="RUTA_ALGEBRA.txt"
MATERIA="algebra"
PROVIDER="gemini"
PREGUNTAS=15
LOTE=5
SLEEP=1.0
OUT_DIR="salida"
DEBUG_FLAG="--debug"   # "" para desactivar debug

START_FROM="${1:-1}"
INPUT_PATH="$SCRIPT_DIR/$INPUT_FILE"
OUT_PATH="$SCRIPT_DIR/$OUT_DIR"

if [ ! -f "$INPUT_PATH" ]; then
    echo "No existe el archivo de entrada: $INPUT_PATH"
    exit 1
fi

TOTAL_TEMAS="$(grep -Ec '^[[:space:]]*TEMA[[:space:]]+[0-9]+[[:space:]]*:' "$INPUT_PATH" || true)"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Generando preguntas sintéticas de $NOMBRE_CURSO            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Archivo:  $INPUT_FILE"
echo "Temas:    $TOTAL_TEMAS (desde tema $START_FROM)"
echo "Preguntas por tema: $PREGUNTAS"
echo "Total:    $(( TOTAL_TEMAS * PREGUNTAS )) preguntas"
echo ""

# Usar el entorno virtual si existe
if [ -x "$PROJECT_DIR/venv/bin/python" ]; then
    echo "Usando entorno virtual: $PROJECT_DIR/venv/"
    PYTHON="$PROJECT_DIR/venv/bin/python"
elif [ -x "$SCRIPT_DIR/venv/bin/python" ]; then
    echo "Usando entorno virtual: $SCRIPT_DIR/venv/"
    PYTHON="$SCRIPT_DIR/venv/bin/python"
else
    echo "No se encontró venv, usando Python del sistema"
    PYTHON="python"
fi

"$PYTHON" "$SCRIPT_DIR/generar_sinteticas.py" \
  --input "$INPUT_PATH" \
  --materia "$MATERIA" \
  --provider "$PROVIDER" \
  --preguntas "$PREGUNTAS" \
  --lote "$LOTE" \
  --sleep "$SLEEP" \
  --start-from "$START_FROM" \
  --out-dir "$OUT_PATH" \
  ${DEBUG_FLAG}

echo ""
echo "✓ Generación completada"
echo "  Salida en: $OUT_PATH/$MATERIA/"
