"""
Módulo para generación de variaciones de preguntas manteniendo datos numéricos originales.

Este módulo permite generar variaciones de preguntas existentes de tres formas:
- Cambiar contexto: Modifica la redacción pero mantiene los números
- Añadir paso adicional: Agrega un inciso extra al problema
- Hacer más compleja: Añade complejidad sin cambiar datos de la imagen
"""

import base64
import json
import os
import re
from typing import Dict, Any
from pathlib import Path
import httpx
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración de APIs
AI_API_KEYS = {
    "openai": os.getenv("OPENAI_API_KEY", ""),
    "gemini": os.getenv("GEMINI_API_KEY", ""),
    "claude": os.getenv("ANTHROPIC_API_KEY", ""),
    "azure": os.getenv("AZURE_OPENAI_API_KEY", "")
}

AI_MODELS = {
    "openai": os.getenv("OPENAI_MODEL", "gpt-4o"),
    "gemini": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
    "claude": os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022"),
    "azure": os.getenv("AZURE_OPENAI_MODEL", "gpt-4o")
}


def get_variation_prompt(tipo_variacion: str) -> str:
    """Genera el prompt según el tipo de variación solicitada"""

    prompts = {
        "contexto": """
Analiza esta imagen de una pregunta de examen y genera una VARIACIÓN de la pregunta.

REGLAS CRÍTICAS - DEBES SEGUIR ESTRICTAMENTE:
1. Mantén EXACTAMENTE los mismos números, valores, ángulos y medidas que aparecen en la imagen
2. Solo cambia:
   - El contexto (por ejemplo: "bloque" → "paquete", "rampa" → "plano inclinado")
   - La redacción y el vocabulario
   - El objeto o situación (mantén los números idénticos)
3. La pregunta variada debe ser compatible con la MISMA imagen
4. Usa LaTeX para ecuaciones matemáticas: $$formula$$

FORMATO DE SALIDA - JSON puro sin markdown:
{
  "pregunta_original": "pregunta extraída de la imagen",
  "pregunta_variada": "nueva versión con mismo números pero diferente contexto",
  "descripcion_cambios": "breve descripción de qué cambiaste",
  "numeros_mantenidos": ["lista de números/valores que se mantuvieron iguales"]
}

IMPORTANTE:
- Devuelve SOLO el JSON, sin ```json ni markdown
- Los números DEBEN ser idénticos a los de la imagen
- Solo cambia el contexto/redacción, NO los datos numéricos
""",

        "paso_adicional": """
Analiza esta imagen de una pregunta de examen y genera una VARIACIÓN más compleja.

REGLAS CRÍTICAS - DEBES SEGUIR ESTRICTAMENTE:
1. Mantén EXACTAMENTE los mismos números, valores, ángulos y medidas que aparecen en la imagen
2. Añade un paso adicional al problema (por ejemplo: calcular velocidad, tiempo, distancia, etc.)
3. La pregunta base debe ser la misma, pero con un inciso adicional
4. La imagen sigue siendo válida para la pregunta variada
5. Usa LaTeX para ecuaciones matemáticas: $$formula$$

FORMATO DE SALIDA - JSON puro sin markdown:
{
  "pregunta_original": "pregunta extraída de la imagen",
  "pregunta_variada": "misma pregunta base + paso adicional",
  "descripcion_cambios": "qué paso adicional se añadió",
  "numeros_mantenidos": ["lista de números/valores que se mantuvieron iguales"]
}

IMPORTANTE:
- Devuelve SOLO el JSON, sin ```json ni markdown
- Los números DEBEN ser idénticos a los de la imagen
- El paso adicional debe requerir usar el resultado del problema original
""",

        "mas_compleja": """
Analiza esta imagen de una pregunta de examen y genera una VARIACIÓN más desafiante.

REGLAS CRÍTICAS - DEBES SEGUIR ESTRICTAMENTE:
1. Mantén EXACTAMENTE los mismos números, valores, ángulos y medidas visibles en la imagen
2. Añade contexto adicional que haga la pregunta más compleja:
   - Condiciones iniciales (liberado desde el reposo, fricción, etc.)
   - Múltiples pasos de solución
   - Relaciones adicionales entre variables
3. La imagen debe seguir siendo válida para el diagrama/figura mostrada
4. Usa LaTeX para ecuaciones matemáticas: $$formula$$

FORMATO DE SALIDA - JSON puro sin markdown:
{
  "pregunta_original": "pregunta extraída de la imagen",
  "pregunta_variada": "versión más compleja manteniendo números originales",
  "descripcion_cambios": "qué elementos de complejidad se añadieron",
  "numeros_mantenidos": ["lista de números/valores que se mantuvieron iguales"]
}

IMPORTANTE:
- Devuelve SOLO el JSON, sin ```json ni markdown
- Los números de la imagen DEBEN mantenerse iguales
- La complejidad adicional debe ser razonable y resolver el mismo diagrama
"""
    }

    return prompts.get(tipo_variacion, prompts["contexto"])


def extract_json(text: str) -> Dict[str, Any]:
    """Extrae y parsea JSON de la respuesta de la IA"""
    cleaned = text.strip()

    # Eliminar bloques de código markdown
    cleaned = re.sub(r"^```+(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```+\s*$", "", cleaned)
    cleaned = cleaned.strip()

    if not cleaned:
        raise ValueError("Respuesta vacía de la API.")

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Intentar extraer JSON del texto
        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise ValueError("No se pudo encontrar JSON válido en la respuesta")

        json_str = cleaned[start : end + 1]
        return json.loads(json_str)


async def generate_question_variation(service: str, image_content: bytes, tipo_variacion: str) -> Dict[str, Any]:
    """
    Genera una variación de una pregunta manteniendo los números originales

    Args:
        service: Servicio de IA a usar (openai, gemini, claude, azure)
        image_content: Contenido binario de la imagen
        tipo_variacion: Tipo de variación (contexto, paso_adicional, mas_compleja)

    Returns:
        Dict con pregunta_original, pregunta_variada, descripcion_cambios, numeros_mantenidos
    """
    api_key = AI_API_KEYS.get(service)
    if not api_key:
        return {
            "pregunta_original": "Pregunta simulada (configurar API key)",
            "pregunta_variada": "Variación simulada (configurar API key)",
            "descripcion_cambios": "Mock - no hay API key configurada",
            "numeros_mantenidos": [],
            "ai_service": "mock"
        }

    try:
        prompt = get_variation_prompt(tipo_variacion)
        base64_image = base64.b64encode(image_content).decode('utf-8')

        if service == "gemini":
            result_text = await generate_variation_gemini(base64_image, prompt)
        elif service == "openai":
            result_text = await generate_variation_openai(base64_image, prompt)
        elif service == "claude":
            result_text = await generate_variation_claude(base64_image, prompt)
        elif service == "azure":
            result_text = await generate_variation_azure(base64_image, prompt)
        else:
            raise ValueError(f"Servicio no soportado: {service}")

        # Limpiar y parsear respuesta
        result_text = result_text.strip()
        result_text = re.sub(r'^```json\s*', '', result_text)
        result_text = re.sub(r'^```\s*', '', result_text)
        result_text = re.sub(r'\s*```$', '', result_text)

        parsed = extract_json(result_text)
        parsed["ai_service"] = service
        parsed["tipo_variacion"] = tipo_variacion

        return parsed

    except Exception as e:
        print(f"Error generando variación con {service}: {str(e)}")
        raise


async def generate_variation_gemini(base64_image: str, prompt: str) -> str:
    """Genera variación de pregunta con Gemini"""
    api_key = AI_API_KEYS["gemini"]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{AI_MODELS['gemini']}:generateContent?key={api_key}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": base64_image
                    }
                }
            ]
        }],
        "generationConfig": {
            "maxOutputTokens": 2000,
            "temperature": 0.3
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)

        if response.status_code == 200:
            result = response.json()

            # Manejar errores de Gemini
            if "error" in result:
                raise Exception(f"Error Gemini: {result['error']}")

            if "candidates" not in result or not result["candidates"]:
                raise Exception("No se recibió respuesta válida de Gemini")

            candidate = result["candidates"][0]

            if "content" not in candidate:
                finish_reason = candidate.get("finishReason", "UNKNOWN")
                if finish_reason == "RECITATION":
                    raise Exception("Gemini detectó contenido protegido. Usa otro servicio de IA.")
                raise Exception(f"Gemini no devolvió contenido. Razón: {finish_reason}")

            return candidate["content"]["parts"][0]["text"]
        else:
            raise Exception(f"Error HTTP Gemini: {response.status_code} - {response.text}")


async def generate_variation_openai(base64_image: str, prompt: str) -> str:
    """Genera variación de pregunta con OpenAI"""
    api_key = AI_API_KEYS["openai"]

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    payload = {
        "model": AI_MODELS["openai"],
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
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
            return result["choices"][0]["message"]["content"]
        else:
            raise Exception(f"Error OpenAI: {response.status_code} - {response.text}")


async def generate_variation_claude(base64_image: str, prompt: str) -> str:
    """Genera variación de pregunta con Claude"""
    api_key = AI_API_KEYS["claude"]

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }

    payload = {
        "model": AI_MODELS["claude"],
        "max_tokens": 2000,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": base64_image
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
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
            return result["content"][0]["text"]
        else:
            raise Exception(f"Error Claude: {response.status_code} - {response.text}")


async def generate_variation_azure(base64_image: str, prompt: str) -> str:
    """Genera variación de pregunta con Azure OpenAI"""
    api_key = AI_API_KEYS["azure"]
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")

    if not endpoint:
        raise Exception("AZURE_OPENAI_ENDPOINT no configurado")

    headers = {
        "Content-Type": "application/json",
        "api-key": api_key
    }

    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 2000
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{endpoint}/openai/deployments/{AI_MODELS['azure']}/chat/completions?api-version=2024-02-15-preview",
            headers=headers,
            json=payload
        )

        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"]
        else:
            raise Exception(f"Error Azure: {response.status_code} - {response.text}")