#!/usr/bin/env python3
"""
Generador de preguntas sintéticas por tema a partir de archivos .txt.
Encabezados esperados: TEMA <n>: <titulo>
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


def normalizar_texto(texto: str) -> str:
    """
    Normaliza texto: minúsculas, sin tildes, espacios -> guiones bajos
    """
    texto = texto.lower()

    # Reemplazar caracteres con tilde
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ñ': 'n', 'ü': 'u'
    }

    for char, replacement in replacements.items():
        texto = texto.replace(char, replacement)

    # Reemplazar espacios y caracteres especiales con guiones bajos
    texto = re.sub(r'[^\w]', '_', texto)

    # Eliminar guiones bajos múltiples
    texto = re.sub(r'_+', '_', texto)

    # Eliminar guiones bajos al inicio y final
    texto = texto.strip('_')

    return texto


THEME_HEADER_RE = re.compile(r"(?m)^\s*TEMA\s+(\d+)\s*:\s*(.+?)\s*$")

DEFAULT_CLEAN_PREFIXES = [
    "IMAGEN",
    "PROBLEMA",
    "EJERCICIO",
    "Texto de la pregunta:",
    "Pregunta:",
    "Alternativas:",
    "Opciones:",
    "Resolución:",
    "Solución:",
    "Desarrollo:",
    "Respuesta:",
    "Clave:",
]


@dataclass
class ThemeBlock:
    numero_tema: int
    titulo_tema: str
    contenido: str


def read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1")


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = val


def normalize_lines(text: str) -> List[str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text.split("\n")


def clean_content(lines: List[str], prefixes: List[str]) -> str:
    # Patrón para detectar líneas como "IMAGEN 1", "PROBLEMA 234", "EJERCICIO 5", etc.
    pattern_with_num = re.compile(r"^(IMAGEN|PROBLEMA|EJERCICIO)\s+\d+", re.IGNORECASE)

    cleaned: List[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned.append("")
            continue

        # Verificar prefijos de forma case-insensitive
        should_skip = False
        stripped_lower = stripped.lower()
        for prefix in prefixes:
            if stripped_lower.startswith(prefix.lower()):
                should_skip = True
                break

        # También verificar el patrón numérico
        if should_skip or pattern_with_num.match(stripped):
            continue

        cleaned.append(line)
    # colapsar multiples lineas en blanco
    out: List[str] = []
    blank = False
    for line in cleaned:
        if line.strip():
            out.append(line.rstrip())
            blank = False
        else:
            if not blank:
                out.append("")
            blank = True
    return "\n".join(out).strip()


def parse_themes(text: str, clean_prefixes: List[str], min_content_chars: int) -> List[ThemeBlock]:
    matches = list(THEME_HEADER_RE.finditer(text))
    if not matches:
        raise ValueError("No se encontraron encabezados con el patrón: TEMA <n>: <titulo>")

    blocks: List[ThemeBlock] = []
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        numero_tema = int(m.group(1))
        titulo_tema = m.group(2).strip()
        raw = text[start:end].strip()
        cleaned = clean_content(normalize_lines(raw), clean_prefixes)
        if len(cleaned) < min_content_chars:
            continue
        blocks.append(ThemeBlock(numero_tema, titulo_tema, cleaned))

    if not blocks:
        raise ValueError("Se encontraron encabezados, pero no se detectaron bloques con contenido real.")
    return blocks


def build_prompt(
    materia: str,
    numero_tema: int,
    total_temas: int,
    titulo_tema: str,
    contexto: str,
    preguntas_por_lote: int,
    id_inicio: int,
) -> str:
    return f"""
Eres un generador de preguntas tipo examen. Crea preguntas NUEVAS y ORIGINALES basadas en los ejemplos.

INSTRUCCIONES IMPORTANTES:
1. ANALIZA las resoluciones del contexto para entender el PROCESO de solución
2. CAMBIA todos los datos: números, nombres, contextos, valores
3. MANTÉN el tipo de razonamiento y nivel de complejidad
4. NO copies textualmente, REINVENTA el problema con datos diferentes

Cómo usar el contexto:
- Las RESOLUCIONES te muestran el proceso correcto de solución
- Usa ese mismo proceso pero con datos completamente diferentes
- Si el ejemplo usa "300 personas", tú usa "450 estudiantes" o similar
- Si el ejemplo resuelve ecuaciones con x=5, tú resuélvelas con x=7
- Cambia los contextos: si habla de "circo", tú habla de "teatro", "estadio", etc.

IMPORTANTE - Formato LaTeX:
- Para matemáticas usa LaTeX BÁSICO entre $$ ... $$
- Usa llaves simples en LaTeX, NO dobles
- Ejemplos de formato LaTeX correcto:
  * Ecuaciones: $$2x + 5 = 13$$
  * Fracciones: $$\\frac{{a}}{{b}}$$
  * Raíces: $$\\sqrt{{x}}$$
  * Potencias: $$x^{{2}}$$
  * Subíndices: $$a_{{1}}$$

Contexto (ejemplos base del tema con sus resoluciones):
\"\"\"\n{contexto}\n\"\"\"

FORMATO DE SALIDA - MUY IMPORTANTE:
- Devuelve ÚNICAMENTE un JSON válido, sin texto extra ni markdown (NO uses ```json ni ```)
- La estructura DEBE ser un objeto con clave "preguntas" que contiene un ARRAY
- NO devuelvas objetos individuales separados por comas
- NO incluyas saltos de línea dentro de los strings JSON (usa espacios en su lugar)
- Mantén todo el texto en una sola línea por campo
- Asegúrate de que el JSON sea parseable

El JSON debe seguir EXACTAMENTE esta estructura (con {preguntas_por_lote} preguntas en el array):
{{
  "preguntas": [
    {{
      "pregunta": "Pregunta NUEVA con datos diferentes, usando LaTeX: ej: ¿Cuánto es $$3 + 7$$?",
      "dificultad": 1,
      "opciones": {{
        "A": "$$10$$",
        "B": "$$11$$",
        "C": "$$9$$",
        "D": "$$12$$",
        "E": "$$8$$"
      }},
      "respuesta_correcta": "A",
      "explicacion": "Resolución paso a paso similar al contexto pero con los nuevos datos: Se suma $$3 + 7 = 10$$, por lo tanto la respuesta correcta es A."
    }}
  ]
}}

Reglas ESTRICTAS:
- Genera exactamente {preguntas_por_lote} preguntas en "preguntas".
- CAMBIA todos los valores numéricos del contexto (usa números diferentes)
- CAMBIA los contextos narrativos (nombres, lugares, situaciones)
- MANTÉN el proceso de solución mostrado en las resoluciones
- La "explicacion" debe mostrar el proceso de solución con los NUEVOS datos
- "respuesta_correcta" debe coincidir con una de las opciones (A, B, C, D o E).
- "dificultad" debe ser un entero entre 1 y 3 (similar al nivel del contexto).
- "imagen" debe ser null.
- Las preguntas deben pertenecer al tema "{titulo_tema}".
- Usa LaTeX solo cuando sea necesario para expresiones matemáticas.

IMPORTANTE - Formato de salida:
- NO incluyas razonamiento interno, comentarios, ni correcciones en el JSON
- NO dupliques campos (cada pregunta tiene UNA explicacion, UN respuesta_correcta, etc.)
- NO incluyas ```json ni ``` en tu respuesta, solo el JSON puro
- NO escribas "Let's...", "Correcting...", ni ningún texto fuera del formato
- Cada pregunta debe tener EXACTAMENTE estos campos y en este orden:
  * pregunta (string)
  * dificultad (número 1-3)
  * opciones (objeto con claves A, B, C, D, E)
  * respuesta_correcta (string: A, B, C, D o E)
  * explicacion (string)
  * imagen (null)
"""


def extract_json(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"```\s*$", "", cleaned)
    if not cleaned:
        raise ValueError("Respuesta vacia de la API.")

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Intentar recuperar el JSON con limpieza adicional
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            print(f"Error parseando JSON: {e}")
            print(f"Primeros 500 chars: {cleaned[:500]}")
            raise

        json_str = cleaned[start : end + 1]

        # Detectar y eliminar razonamiento interno/duplicación de campos
        # Patrón: texto seguido de \n      "campo": (indicando duplicación)
        json_str = re.sub(
            r'\.\s*\(.*?\)\.\s*([A-Z][^"]*?)\n\s+"(explicacion|opciones|respuesta_correcta)":\s*',
            r'.\n    },\n    {\n      "',
            json_str
        )

        # Eliminar comentarios internos tipo "Let's...", "Correcting...", etc.
        json_str = re.sub(
            r'\.\s*(Let\'s|Correcting|Ok,|I need to|I wrote|So)[^.]*?\.\s*',
            '. ',
            json_str
        )

        # Limpiar comillas problemáticas
        json_str = json_str.replace('"', '"').replace('"', '"')
        json_str = json_str.replace(''', "'").replace(''', "'")

        # Remover caracteres de control inválidos (excepto \n, \r, \t que son válidos)
        json_str = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', json_str)

        # Estrategia más robusta: procesar el JSON carácter por carácter dentro de strings
        # para escapar correctamente backslashes y saltos de línea
        result = []
        in_string = False
        escape_next = False
        i = 0

        while i < len(json_str):
            char = json_str[i]

            if escape_next:
                result.append(char)
                escape_next = False
                i += 1
                continue

            if char == '"':
                in_string = not in_string
                result.append(char)
                i += 1
                continue

            if in_string:
                if char == '\\':
                    # Verificar el siguiente carácter
                    if i + 1 < len(json_str):
                        next_char = json_str[i + 1]
                        # Si es una secuencia de escape JSON válida, mantenerla
                        if next_char in ('"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'):
                            result.append(char)
                            escape_next = True
                        else:
                            # Es un backslash de LaTeX, duplicarlo
                            result.append('\\\\')
                    else:
                        result.append('\\\\')
                    i += 1
                elif char == '\n':
                    result.append('\\n')
                    i += 1
                elif char == '\r':
                    result.append('\\r')
                    i += 1
                elif char == '\t':
                    result.append('\\t')
                    i += 1
                else:
                    result.append(char)
                    i += 1
            else:
                result.append(char)
                i += 1

        json_str = ''.join(result)

        try:
            result = json.loads(json_str)
            # Si el resultado es un objeto individual en lugar de tener "preguntas", intentar arreglarlo
            if isinstance(result, dict) and "preguntas" not in result and "pregunta" in result:
                # Es un objeto individual, necesitamos verificar si hay más
                print("⚠️ Detectado: respuesta es objeto individual, intentando corregir...")
                raise json.JSONDecodeError("Necesita envolver en array", json_str, 0)
            return result
        except json.JSONDecodeError as e2:
            # Último intento: si el JSON son múltiples objetos separados por comas,
            # intentar envolverlos en un array "preguntas"
            if '"pregunta"' in json_str and '"preguntas"' not in json_str:
                print("Intentando envolver objetos en estructura 'preguntas'...")
                # Verificar si es un solo objeto o múltiples
                if json_str.strip().startswith('{') and not json_str.strip().startswith('{"preguntas"'):
                    wrapped = '{"preguntas": [' + json_str + ']}'
                    try:
                        return json.loads(wrapped)
                    except json.JSONDecodeError:
                        pass

            print(f"Error parseando JSON después de limpieza: {e2}")
            print(f"Posición del error: línea {e2.lineno}, columna {e2.colno}")

            # Mostrar contexto del error
            if hasattr(e2, 'pos'):
                pos = e2.pos
                context_start = max(0, pos - 100)
                context_end = min(len(json_str), pos + 100)
                context = json_str[context_start:context_end]
                print(f"Contexto del error:")
                print(f"...{context}...")

            # Guardar JSON problemático para debug
            debug_file = Path("/tmp/json_error_debug.txt")
            debug_file.write_text(json_str, encoding="utf-8")
            print(f"JSON guardado en: {debug_file}")
            print(f"Longitud del JSON: {len(json_str)} caracteres")
            raise


def normalize_model_name(model: str) -> str:
    if model.startswith(("models/", "tunedModels/")):
        return model
    return f"models/{model}"


def call_gemini(prompt: str, model: str, api_key: str) -> str:
    try:
        from google import genai
        from google.genai import types
    except Exception as exc:
        raise RuntimeError("Falta instalar google-genai") from exc
    client = genai.Client(api_key=api_key)

    # Configuración para salida más determinista y estructurada
    config = types.GenerateContentConfig(
        temperature=0.7,  # Menos aleatorio
        top_p=0.95,
        top_k=40,
        max_output_tokens=8192,
    )

    response = client.models.generate_content(
        model=normalize_model_name(model),
        contents=prompt,
        config=config,
    )
    return response.text or ""


def simulate_response(prompt: str) -> str:
    materia = re.search(r'"materia":\\s*"([^"]+)"', prompt)
    numero_tema = re.search(r'"numero_tema":\\s*(\\d+)', prompt)
    total_temas = re.search(r'"total_temas":\\s*(\\d+)', prompt)
    titulo_tema = re.search(r'"titulo_tema":\\s*"([^"]+)"', prompt)
    preguntas_por_lote = re.search(r"Genera exactamente (\\d+) preguntas", prompt)

    materia = materia.group(1) if materia else "materia"
    numero_tema = int(numero_tema.group(1)) if numero_tema else 1
    total_temas = int(total_temas.group(1)) if total_temas else 1
    titulo_tema = titulo_tema.group(1) if titulo_tema else "Tema"
    n = int(preguntas_por_lote.group(1)) if preguntas_por_lote else 5

    preguntas = []
    for i in range(1, n + 1):
        qid = f"{materia}_{numero_tema:03d}_{i:03d}"
        preguntas.append(
            {
                "id_temporal": qid,
                "pregunta": f"Pregunta sintetica {i} sobre {titulo_tema} con $$x^2$$.",
                "dificultad": random.choice([1, 2, 3]),
                "opciones": {
                    "A": "$$x = 1$$",
                    "B": "$$x = 2$$",
                    "C": "$$x = 3$$",
                    "D": "$$x = 4$$",
                    "E": "$$x = 5$$",
                },
                "respuesta_correcta": random.choice(["A", "B", "C", "D", "E"]),
                "explicacion": "Se aplica la regla y se obtiene el valor correcto.",
                "imagen": None,
            }
        )

    payload = {
        "materia": materia,
        "numero_tema": numero_tema,
        "total_temas": total_temas,
        "titulo_tema": titulo_tema,
        "preguntas": preguntas,
    }
    return json.dumps(payload, ensure_ascii=False)


def call_api(prompt: str, provider: str, model: str, api_key: str) -> str:
    if provider == "gemini":
        return call_gemini(prompt, model=model, api_key=api_key)
    return simulate_response(prompt)


def generate_questions_for_theme(
    materia: str,
    theme: ThemeBlock,
    total_temas: int,
    preguntas_total: int,
    preguntas_por_lote: int,
    sleep_s: float,
    provider: str,
    model: str,
    api_key: str,
    retries: int,
) -> Dict[str, Any]:
    all_preguntas: List[Dict[str, Any]] = []
    num_lotes = (preguntas_total + preguntas_por_lote - 1) // preguntas_por_lote

    for lote in range(num_lotes):
        id_inicio = lote * preguntas_por_lote + 1
        prompt = build_prompt(
            materia=materia,
            numero_tema=theme.numero_tema,
            total_temas=total_temas,
            titulo_tema=theme.titulo_tema,
            contexto=theme.contenido,
            preguntas_por_lote=preguntas_por_lote,
            id_inicio=id_inicio,
        )
        last_err: Optional[Exception] = None
        for _ in range(retries + 1):
            try:
                raw = call_api(prompt, provider=provider, model=model, api_key=api_key)
                data = extract_json(raw)
                preguntas = data.get("preguntas", [])
                if not isinstance(preguntas, list):
                    raise ValueError("La API devolvio un JSON sin 'preguntas' como lista.")
                all_preguntas.extend(preguntas)
                last_err = None
                break
            except Exception as exc:
                last_err = exc
                time.sleep(1.0)
        if last_err:
            raise last_err
        if sleep_s:
            time.sleep(sleep_s)

    # Normalizar materia y tema para IDs
    materia_norm = normalizar_texto(materia)
    tema_norm = normalizar_texto(theme.titulo_tema)

    # Generar IDs con formato: [materia_3chars]_[tema_3chars]_[num] y agregar campo imagen
    for idx, q in enumerate(all_preguntas[:preguntas_total], start=1):
        q["id_temporal"] = f"{materia_norm[:3]}_{tema_norm[:3]}_{idx:03d}"
        # Agregar campo imagen si no existe
        if "imagen" not in q:
            q["imagen"] = None

    payload = {
        "materia": materia_norm,
        "numero_tema": theme.numero_tema,
        "total_temas": total_temas,
        "titulo_tema": theme.titulo_tema,
        "tema": tema_norm,
        "preguntas": all_preguntas[:preguntas_total],
    }
    return payload


def iter_input_files(input_path: Path) -> List[Path]:
    if input_path.is_dir():
        return sorted(p for p in input_path.glob("*.txt") if p.is_file())
    return [input_path]


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Generador de preguntas sinteticas por tema.")
    parser.add_argument("--input", required=True, help="Ruta a .txt o directorio con .txt")
    parser.add_argument("--materia", default="aritmetica", help="Materia base para IDs")
    parser.add_argument("--out-dir", default="salida", help="Directorio de salida")
    parser.add_argument("--preguntas", type=int, default=15, help="Preguntas por tema")
    parser.add_argument("--lote", type=int, default=5, help="Preguntas por llamada")
    parser.add_argument("--sleep", type=float, default=0.0, help="Pausa entre llamadas")
    parser.add_argument("--provider", default="stub", choices=["stub", "gemini"], help="Proveedor LLM")
    parser.add_argument("--model", default=None, help="Modelo a usar (override de GEMINI_MODEL)")
    parser.add_argument("--retries", type=int, default=2, help="Reintentos por lote")
    parser.add_argument("--min-content-chars", type=int, default=80, help="Minimo de contenido para aceptar tema")
    parser.add_argument("--clean-prefix", action="append", default=[], help="Prefijo adicional a limpiar")
    parser.add_argument("--start-from", type=int, default=1, help="Empezar desde el tema N (para continuar interrupciones)")
    parser.add_argument("--debug", action="store_true", help="Imprime resumen de parseo")
    parser.add_argument("--debug-all", action="store_true", help="Imprime todos los temas detectados")
    args = parser.parse_args(argv)

    script_dir = Path(__file__).resolve().parent
    load_env_file(script_dir / ".env")
    load_env_file(script_dir.parent / ".env")
    load_env_file(Path(".env"))

    input_path = Path(args.input)
    if not input_path.is_absolute() and not input_path.exists():
        local_input = script_dir / input_path
        if local_input.exists():
            input_path = local_input
    if not input_path.exists():
        print(f"No existe el archivo o directorio: {input_path}", file=sys.stderr)
        return 2

    clean_prefixes = DEFAULT_CLEAN_PREFIXES + args.clean_prefix
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    model = args.model or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    api_key = os.getenv("GEMINI_API_KEY", "")
    if args.provider == "gemini" and not api_key:
        print("Falta GEMINI_API_KEY en el entorno.", file=sys.stderr)
        return 2

    for file_path in iter_input_files(input_path):
        text = read_text_file(file_path)
        themes = parse_themes(text, clean_prefixes, args.min_content_chars)
        total_temas = len(themes)
        if args.debug:
            print(f"[debug] archivo={file_path} temas={total_temas}")
            to_show = themes if args.debug_all else themes[:5]
            for t in to_show:
                print(f"[debug] tema {t.numero_tema}: {t.titulo_tema} (chars={len(t.contenido)})")

        # Organizar por materia (estructura compatible con ProcesadorPreguntasconFigura)
        materia_norm = normalizar_texto(args.materia)
        materia_dir = out_dir / materia_norm
        materia_dir.mkdir(parents=True, exist_ok=True)

        # Crear carpeta de imágenes (para compatibilidad futura)
        imagenes_dir = materia_dir / "imagenes"
        imagenes_dir.mkdir(exist_ok=True)

        for theme in themes:
            # Saltar temas anteriores al start-from
            if theme.numero_tema < args.start_from:
                if args.debug:
                    print(f"[debug] saltando tema {theme.numero_tema}: {theme.titulo_tema}")
                continue

            # Verificar si el archivo ya existe
            tema_norm = normalizar_texto(theme.titulo_tema)
            out_file = materia_dir / f"tema_{theme.numero_tema:03d}_{tema_norm}.json"

            if out_file.exists():
                if args.debug:
                    print(f"[debug] ya existe tema {theme.numero_tema}: {out_file.name}")
                continue

            payload = generate_questions_for_theme(
                materia=args.materia,
                theme=theme,
                total_temas=total_temas,
                preguntas_total=args.preguntas,
                preguntas_por_lote=args.lote,
                sleep_s=args.sleep,
                provider=args.provider,
                model=model,
                api_key=api_key,
                retries=args.retries,
            )
            out_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    num_archivos = len(iter_input_files(input_path))
    materia_norm = normalizar_texto(args.materia)
    print(f"OK: procesados {num_archivos} archivo(s). Salida en: {out_dir}/{materia_norm}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
