import base64
import json
import os
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
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
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
                "maxOutputTokens": 2000,
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

def parse_ai_response(content: str, service: str) -> Dict[str, Any]:
    """Parsea la respuesta de la IA y extrae el JSON"""
    
    try:
        # Buscar JSON en la respuesta
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        
        if start_idx != -1 and end_idx != -1:
            json_str = content[start_idx:end_idx]
            
            # Limpiar y arreglar el JSON
            # Reemplazar comillas problemáticas
            json_str = json_str.replace('"', '"').replace('"', '"')
            json_str = json_str.replace(''', "'").replace(''', "'")
            
            # Escapar backslashes problemáticos de LaTeX (pero de forma más suave)
            import re
            # Solo escapar cuando hay LaTeX real
            json_str = re.sub(r'\\(?![\\"/bfnrt])', r'\\\\', json_str)
            
            print(f"🔧 JSON limpio (primeros 300 chars): {json_str[:300]}")
            
            parsed = json.loads(json_str)
            
            # Validar campos requeridos (flexibles)
            required_fields = ["materia", "tema", "pregunta", "opciones"]
            for field in required_fields:
                if field not in parsed:
                    raise ValueError(f"Campo faltante: {field}")
            
            # Agregar metadatos
            parsed["ai_service"] = service
            parsed["confianza"] = parsed.get("confianza", 80)
            
            return parsed
        else:
            raise ValueError("No se encontró JSON válido en la respuesta")
            
    except json.JSONDecodeError as e:
        print(f"❌ Error JSON en {service}: {str(e)}")
        print(f"📄 Contenido problemático: {content[:500]}...")
        return get_mock_response()
    except Exception as e:
        print(f"❌ Error parseando respuesta de {service}: {str(e)}")
        return get_mock_response()

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

async def process_solution_with_gemini(solution_images: list, pregunta: str, respuesta_correcta: str) -> Dict[str, Any]:
    """Procesa imágenes de solución con Gemini"""
    
    api_key = AI_API_KEYS["gemini"]
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        # Crear partes del contenido
        parts = [
            {"text": f"""
Analiza las imágenes de la resolución y ÚNICAMENTE explica paso a paso lo que está mostrado en las imágenes.

PREGUNTA: {pregunta}
RESPUESTA CORRECTA: {respuesta_correcta}

INSTRUCCIONES IMPORTANTES:
1. NO resuelvas el problema por tu cuenta
2. NO corrijas ni evalúes la solución mostrada
3. ÚNICAMENTE describe y explica cada paso que aparece en las imágenes
4. Si hay ecuaciones, cópialas usando LaTeX: $$ecuación$$
5. Explica el razonamiento que se muestra en cada paso de la resolución
6. Si hay cálculos, describe qué operación se está realizando sin hacerla tú
7. Mantén el enfoque en explicar la metodología mostrada

Ejemplo de respuesta esperada:
"En el primer paso se plantea la ecuación $$2x + 5 = 13$$. Luego se resta 5 de ambos lados obteniendo $$2x = 8$$. Finalmente se divide ambos lados entre 2 para obtener $$x = 4$$."

RESPONDE SOLO con la explicación de lo mostrado en las imágenes, sin formato JSON ni texto adicional.
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
                "maxOutputTokens": 1500,
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