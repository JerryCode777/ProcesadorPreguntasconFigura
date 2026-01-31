import base64
import json
import os
import re
from pathlib import Path
from typing import Dict, Any
import httpx
import asyncio
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración de APIs (variables de entorno)
AI_API_KEYS = {
    "openai": os.getenv("OPENAI_API_KEY", ""),
    "gemini": os.getenv("GEMINI_API_KEY", ""),
    "claude": os.getenv("ANTHROPIC_API_KEY", ""),
    "azure": os.getenv("AZURE_OPENAI_API_KEY", "")
}

print(f"🔧 API Keys cargadas:")
for service, key in AI_API_KEYS.items():
    print(f"  {service}: {'✅ Configurada' if key else '❌ No configurada'}")

MATERIAS_DISPONIBLES = [
    "Razonamiento Lógico", "Razonamiento Matemático", "Razonamiento Verbal",
    "Comprensión Lectora", "Algebra", "Aritmética", "Geometría", "Trigonometría",
    "Historia", "Geografía", "Química", "Biología", "Física", "Filosofía",
    "Psicología", "Educación Cívica", "Lenguaje", "Literatura", 
    "Inglés Lectura", "Inglés Gramática"
]

async def process_image_with_ai(service: str, image_content: bytes, filename: str) -> Dict[str, Any]:
    """Procesa una imagen usando el servicio de IA especificado"""
    
    if service == "openai":
        return await process_with_openai(image_content)
    elif service == "gemini":
        return await process_with_gemini(image_content)
    elif service == "claude":
        return await process_with_claude(image_content)
    elif service == "azure":
        return await process_with_azure(image_content)
    else:
        raise ValueError(f"Servicio no soportado: {service}")

async def process_with_openai(image_content: bytes) -> Dict[str, Any]:
    """Procesa imagen con OpenAI GPT-4 Vision"""
    
    api_key = AI_API_KEYS["openai"]
    if not api_key:
        return get_mock_response()  # Usar respuesta simulada si no hay API key
    
    try:
        # Convertir imagen a base64
        base64_image = base64.b64encode(image_content).decode('utf-8')
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": get_ai_prompt()
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 2000
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                return parse_ai_response(content, "openai")
            else:
                print(f"Error OpenAI: {response.status_code} - {response.text}")
                return get_mock_response()
                
    except Exception as e:
        print(f"Error procesando con OpenAI: {str(e)}")
        return get_mock_response()

async def process_with_gemini(image_content: bytes) -> Dict[str, Any]:
    """Procesa imagen con Google Gemini Pro Vision"""

    api_key = AI_API_KEYS["gemini"]
    print(f"🔍 Gemini API Key configurada: {'✅ SÍ' if api_key else '❌ NO'}")

    if not api_key:
        print("⚠️ No hay API key de Gemini, usando respuesta simulada")
        return get_mock_response()

    try:
        base64_image = base64.b64encode(image_content).decode('utf-8')

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": get_ai_prompt()},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 4000,
                "temperature": 0.1
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                print(f"✅ Gemini respondió exitosamente, procesando respuesta...")
                parsed_result = parse_ai_response(content, "gemini")
                print(f"🎯 Resultado parseado - Servicio: {parsed_result.get('ai_service', 'unknown')}")
                return parsed_result
            else:
                print(f"❌ Error Gemini: {response.status_code} - {response.text}")
                return get_mock_response()
                
    except Exception as e:
        print(f"Error procesando con Gemini: {str(e)}")
        return get_mock_response()

async def process_with_claude(image_content: bytes) -> Dict[str, Any]:
    """Procesa imagen con Anthropic Claude Vision"""
    
    api_key = AI_API_KEYS["claude"]
    if not api_key:
        return get_mock_response()
    
    try:
        base64_image = base64.b64encode(image_content).decode('utf-8')
        
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
        
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 2000,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": get_ai_prompt()
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": base64_image
                            }
                        }
                    ]
                }
            ]
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["content"][0]["text"]
                return parse_ai_response(content, "claude")
            else:
                print(f"Error Claude: {response.status_code} - {response.text}")
                return get_mock_response()
                
    except Exception as e:
        print(f"Error procesando con Claude: {str(e)}")
        return get_mock_response()

async def process_with_azure(image_content: bytes) -> Dict[str, Any]:
    """Procesa imagen con Azure OpenAI"""
    
    api_key = AI_API_KEYS["azure"]
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    
    if not api_key or not endpoint:
        return get_mock_response()
    
    # Implementación similar a OpenAI pero con endpoint de Azure
    return get_mock_response()

def get_ai_prompt() -> str:
    """Obtiene el prompt para la IA"""
    materias_text = ", ".join(MATERIAS_DISPONIBLES)
    
    return f"""
Analiza esta imagen de una pregunta de examen preuniversitario y extrae TODA la información en formato JSON.

INSTRUCCIONES IMPORTANTES:
1. Identifica la materia de la lista: {materias_text}
2. Extrae el texto completo de la pregunta
3. Identifica las 5 opciones (A, B, C, D, E) con su texto completo
4. Asigna un nivel de dificultad del 1-5
5. Sugiere un tema descriptivo
6. Para matemáticas usa texto simple o LaTeX MUY BÁSICO entre $$

RESPONDE ÚNICAMENTE con un JSON válido en este formato exacto:
{{
    "materia": "nombre de la materia",
    "tema": "tema descriptivo",
    "pregunta": "texto completo de la pregunta",
    "opciones": {{
        "A": "texto de opción A",
        "B": "texto de opción B", 
        "C": "texto de opción C",
        "D": "texto de opción D",
        "E": "texto de opción E"
    }},
    "dificultad": 3,
    "confianza": 85
}}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional antes o después.
"""

def extract_json(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    # Eliminar bloques de código markdown de forma más robusta
    cleaned = re.sub(r"^```+(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```+\s*$", "", cleaned)
    cleaned = cleaned.strip()

    if not cleaned:
        raise ValueError("Respuesta vacia de la API.")

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Intentar recuperar el JSON con limpieza adicional
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            print(f"❌ Error parseando JSON: {e}")
            print(f"📄 Respuesta completa ({len(cleaned)} chars):")
            print(cleaned[:1000])
            if len(cleaned) > 1000:
                print(f"... (truncado, total: {len(cleaned)} caracteres)")
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


def parse_ai_response(content: str, service: str) -> Dict[str, Any]:
    """Parsea la respuesta de la IA y extrae el JSON"""
    try:
        parsed = extract_json(content)

        required_fields = ["materia", "tema", "pregunta", "opciones"]
        for field in required_fields:
            if field not in parsed:
                raise ValueError(f"Campo faltante: {field}")

        parsed["ai_service"] = service
        parsed["confianza"] = parsed.get("confianza", 80)

        return parsed

    except json.JSONDecodeError as e:
        print(f"❌ Error JSON en {service}: {str(e)}")
        print(f"📄 Contenido problemático: {content[:500]}...")
        return get_mock_response()
    except Exception as e:
        print(f"❌ Error parseando respuesta de {service}: {str(e)}")
        return get_mock_response()

async def generate_explanation_from_question(service: str, question_image: bytes, pregunta: str, respuesta_correcta: str) -> Dict[str, Any]:
    """Genera explicación directamente desde la imagen de la pregunta"""

    api_key = AI_API_KEYS[service]
    if not api_key:
        return {"explanation": "Explicación generada automáticamente - API no configurada"}

    try:
        if service == "gemini":
            return await generate_explanation_from_question_gemini(question_image, pregunta, respuesta_correcta)
        else:
            return {"explanation": f"Servicio {service} no implementado para explicaciones"}
    except Exception as e:
        print(f"Error generando explicación desde pregunta: {str(e)}")
        return {"explanation": "Error generando explicación automática"}

async def process_solution_images_with_ai(service: str, solution_images: list, pregunta: str, respuesta_correcta: str) -> Dict[str, Any]:
    """Procesa imágenes de solución para generar explicación"""

    api_key = AI_API_KEYS[service]
    if not api_key:
        return {"explanation": "Explicación generada automáticamente - API no configurada"}

    try:
        if service == "gemini":
            return await process_solution_with_gemini(solution_images, pregunta, respuesta_correcta)
        else:
            return {"explanation": f"Servicio {service} no implementado para explicaciones"}
    except Exception as e:
        print(f"Error procesando solución: {str(e)}")
        return {"explanation": "Error generando explicación automática"}

async def generate_explanation_from_question_gemini(question_image: bytes, pregunta: str, respuesta_correcta: str) -> Dict[str, Any]:
    """Genera explicación desde la imagen de la pregunta con Gemini"""

    api_key = AI_API_KEYS["gemini"]

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"

        base64_image = base64.b64encode(question_image).decode('utf-8')

        parts = [
            {"text": f"""
Genera una explicación clara y directa de por qué la respuesta es {respuesta_correcta}.

PREGUNTA: {pregunta}
RESPUESTA CORRECTA: {respuesta_correcta}

REGLAS IMPORTANTES:
1. Máximo 4-5 pasos, 1 línea por paso.
2. NO expliques por qué las otras opciones son incorrectas.
3. NO incluyas introducciones largas.
4. Usa LaTeX solo cuando sea necesario.
5. Concluye indicando por qué la respuesta es {respuesta_correcta}.

RESPONDE SOLO con la explicación (sin JSON ni texto extra).
            """},
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64_image
                }
            }
        ]

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "maxOutputTokens": 900,
                "temperature": 0.2
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)

            if response.status_code == 200:
                result = response.json()
                explanation = result["candidates"][0]["content"]["parts"][0]["text"]
                print(f"✅ Explicación desde pregunta generada exitosamente")
                return {"explanation": explanation.strip()}
            else:
                print(f"❌ Error Gemini explicación: {response.status_code}")
                return {"explanation": "Error generando explicación con IA"}

    except Exception as e:
        print(f"Error generando explicación desde pregunta con Gemini: {str(e)}")
        return {"explanation": "Error procesando imagen de pregunta"}

async def process_solution_with_gemini(solution_images: list, pregunta: str, respuesta_correcta: str) -> Dict[str, Any]:
    """Procesa imágenes de solución con Gemini"""

    api_key = AI_API_KEYS["gemini"]

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"

        # Crear partes del contenido
        parts = [
            {"text": f"""
Resume la resolución MOSTRADA en las imágenes de forma clara y paso a paso, sin extenderte demasiado.

PREGUNTA: {pregunta}
RESPUESTA CORRECTA: {respuesta_correcta}

REGLAS IMPORTANTES:
1. Máximo 4-5 pasos, 1 línea por paso.
2. Solo resume los pasos clave mostrados en las imágenes.
3. NO expliques por qué otras opciones son incorrectas.
4. Si hay ecuaciones, cópialas en LaTeX inline: $$ecuación$$.
5. Concluye indicando por qué la respuesta es {respuesta_correcta}.

RESPONDE SOLO con la explicación (sin JSON ni texto extra).
            """}
        ]

        # Agregar imágenes
        for i, image_content in enumerate(solution_images):
            base64_image = base64.b64encode(image_content).decode('utf-8')
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64_image
                }
            })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "maxOutputTokens": 900,
                "temperature": 0.1
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)

            if response.status_code == 200:
                result = response.json()
                explanation = result["candidates"][0]["content"]["parts"][0]["text"]
                print(f"✅ Explicación generada exitosamente")
                return {"explanation": explanation.strip()}
            else:
                print(f"❌ Error Gemini explicación: {response.status_code}")
                return {"explanation": "Error generando explicación con IA"}

    except Exception as e:
        print(f"Error procesando solución con Gemini: {str(e)}")
        return {"explanation": "Error procesando imágenes de solución"}

def get_mock_response() -> Dict[str, Any]:
    """Respuesta simulada para cuando no hay API key o hay errores"""
    return {
        "materia": "Algebra",
        "tema": "ecuaciones_lineales",
        "pregunta": "Resuelve la ecuación: $$2x + 5 = 13$$",
        "opciones": {
            "A": "$$x = 4$$",
            "B": "$$x = 5$$",
            "C": "$$x = 6$$",
            "D": "$$x = 3$$",
            "E": "$$x = 8$$"
        },
        "respuesta_correcta": "A",
        "explicacion": "Para resolver $$2x + 5 = 13$$, restamos 5 de ambos lados: $$2x = 8$$, luego dividimos por 2: $$x = 4$$",
        "dificultad": 2,
        "confianza": 95,
        "ai_service": "mock",
        "note": "Respuesta simulada - Configura las API keys para usar IA real"
    }
