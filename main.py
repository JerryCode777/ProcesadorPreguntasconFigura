from fastapi import FastAPI, Form, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from typing import Optional, List
import json
import os
import shutil
import re
from pathlib import Path
from pydantic import BaseModel
from utils import normalizar_texto, obtener_siguiente_numero, guardar_pregunta_json
from models import PreguntaRequest, PreguntaResponse
from ai_services import process_image_with_ai

app = FastAPI(title="Banco de Preguntas Preuniversitarias", version="1.0.0")

# Configurar archivos estáticos y templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Crear directorios base si no existen
Path("banco_preguntas").mkdir(exist_ok=True)
Path("banco_procesos").mkdir(exist_ok=True)

# Lista de materias
MATERIAS = [
    "Razonamiento Lógico", "Razonamiento Matemático", "Razonamiento Verbal",
    "Comprensión Lectora", "Algebra", "Aritmética", "Geometría", "Trigonometría",
    "Historia", "Geografía", "Química", "Biología", "Física", "Filosofía",
    "Psicología", "Educación Cívica", "Lenguaje", "Literatura", 
    "Inglés Lectura", "Inglés Gramática"
]

@app.get("/", response_class=HTMLResponse)
async def formulario(request: Request):
    return templates.TemplateResponse("formulario.html", {"request": request, "materias": MATERIAS})

@app.post("/crear-pregunta")
async def crear_pregunta(
    tipo_clasificacion: str = Form(...),
    area_academica: Optional[str] = Form(None),
    anio: Optional[str] = Form(None),
    tipo_proceso: Optional[str] = Form(None),
    fase: Optional[str] = Form(None),
    examen: Optional[str] = Form(None),
    materia: str = Form(...),
    tema: str = Form(...),
    pregunta: str = Form(...),
    opcion_a: str = Form(...),
    opcion_b: str = Form(...),
    opcion_c: str = Form(...),
    opcion_d: str = Form(...),
    opcion_e: str = Form(...),
    respuesta_correcta: str = Form(...),
    explicacion: str = Form(...),
    dificultad: int = Form(...),
    imagen1: Optional[UploadFile] = File(None),
    imagen2: Optional[UploadFile] = File(None)
):
    try:
        # Validaciones
        if tipo_clasificacion not in ["normal", "proceso"]:
            raise HTTPException(status_code=400, detail="Tipo de clasificación no válido")

        # Validaciones condicionales si se seleccionó "Por proceso"
        if tipo_clasificacion == "proceso":
            areas_validas = ["ingenierias", "biomedicas", "sociales"]
            if not area_academica or area_academica not in areas_validas:
                raise HTTPException(status_code=400, detail="Área académica requerida y debe ser válida")

            if not anio or anio not in ["2022", "2023", "2024", "2025", "2026"]:
                raise HTTPException(status_code=400, detail="Año requerido y debe ser válido")

            tipos_proceso_validos = ["extraordinario", "ceprunsa", "ceprequintos", "ordinario"]
            if not tipo_proceso or tipo_proceso not in tipos_proceso_validos:
                raise HTTPException(status_code=400, detail="Tipo de proceso requerido y debe ser válido")

            # Validaciones condicionales según tipo de proceso
            anio_num = int(anio)
            examenes_validos = ["examen"] if anio_num >= 2025 else ["1er examen", "2do examen"]

            if tipo_proceso == "ceprunsa":
                if not fase or fase not in ["I FASE", "II FASE"]:
                    raise HTTPException(status_code=400, detail="Fase requerida para CEPRUNSA")
                if not examen or examen not in examenes_validos:
                    raise HTTPException(status_code=400, detail=f"Examen requerido para CEPRUNSA (válidos: {', '.join(examenes_validos)})")
            elif tipo_proceso == "ceprequintos":
                if not examen or examen not in examenes_validos:
                    raise HTTPException(status_code=400, detail=f"Examen requerido para CEPREQUINTOS (válidos: {', '.join(examenes_validos)})")
            elif tipo_proceso == "ordinario":
                if not fase or fase not in ["I FASE", "II FASE"]:
                    raise HTTPException(status_code=400, detail="Fase requerida para Ordinario")

        if materia not in MATERIAS:
            raise HTTPException(status_code=400, detail="Materia no válida")

        if respuesta_correcta not in ["A", "B", "C", "D", "E"]:
            raise HTTPException(status_code=400, detail="Respuesta correcta debe ser A, B, C, D o E")

        if not 1 <= dificultad <= 5:
            raise HTTPException(status_code=400, detail="Dificultad debe estar entre 1 y 5")

        # Normalizar nombres
        materia_norm = normalizar_texto(materia)
        tema_norm = normalizar_texto(tema)

        # Crear estructura de directorios según tipo de clasificación
        if tipo_clasificacion == "normal":
            # Estructura: banco_preguntas/[materia]/
            base_path = Path("banco_preguntas")
            materia_dir = base_path / materia_norm
        else:  # tipo_clasificacion == "proceso"
            # Estructura: banco_procesos/[area]/[año]/[tipo_proceso]/[fase]/[examen]/[materia]/
            base_path = Path("banco_procesos")
            path_parts = [base_path, area_academica, anio, tipo_proceso]

            # Normalizar nombres de fase y examen para usar en rutas
            if fase:
                fase_norm = normalizar_texto(fase)
                path_parts.append(fase_norm)

            if examen:
                examen_norm = normalizar_texto(examen)
                path_parts.append(examen_norm)

            path_parts.append(materia_norm)
            materia_dir = Path(*path_parts)

        # Crear directorios
        imagenes_dir = materia_dir / "imagenes"
        materia_dir.mkdir(parents=True, exist_ok=True)
        imagenes_dir.mkdir(exist_ok=True)
        
        # Procesar imágenes si existen
        imagenes = []
        for idx, imagen in enumerate([imagen1, imagen2], start=1):
            if imagen and imagen.filename:
                # Obtener siguiente número para la imagen
                siguiente_num = obtener_siguiente_numero(imagenes_dir, f"{materia_norm}_{tema_norm}")
                extension = imagen.filename.split(".")[-1].lower()
                nombre_imagen = f"{materia_norm}_{tema_norm}_{siguiente_num:03d}.{extension}"

                # Guardar imagen
                ruta_imagen = imagenes_dir / nombre_imagen
                with open(ruta_imagen, "wb") as buffer:
                    shutil.copyfileobj(imagen.file, buffer)

                imagenes.append(nombre_imagen)
        
        # Crear objeto pregunta
        opciones = {
            "A": opcion_a,
            "B": opcion_b,
            "C": opcion_c,
            "D": opcion_d,
            "E": opcion_e
        }
        
        # Obtener siguiente número para id_temporal
        archivo_json = materia_dir / f"{tema_norm}.json"
        siguiente_num_id = 1
        if archivo_json.exists():
            with open(archivo_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data.get("preguntas"):
                    # Encontrar el número más alto
                    max_num = 0
                    prefix = f"{materia_norm[:3]}_{tema_norm[:3]}_"
                    for p in data["preguntas"]:
                        if p["id_temporal"].startswith(prefix):
                            try:
                                num = int(p["id_temporal"].split("_")[-1])
                                max_num = max(max_num, num)
                            except ValueError:
                                continue
                    siguiente_num_id = max_num + 1
        
        id_temporal = f"{materia_norm[:3]}_{tema_norm[:3]}_{siguiente_num_id:03d}"

        nueva_pregunta = {
            "id_temporal": id_temporal,
            "tipo_clasificacion": tipo_clasificacion,
            "pregunta": pregunta,
            "dificultad": dificultad,
            "opciones": opciones,
            "respuesta_correcta": respuesta_correcta,
            "explicacion": explicacion,
            "imagenes": imagenes if imagenes else None
        }

        # Solo añadir campos de proceso si se seleccionó "Por proceso"
        if tipo_clasificacion == "proceso":
            nueva_pregunta["area_academica"] = area_academica
            nueva_pregunta["anio"] = anio
            nueva_pregunta["tipo_proceso"] = tipo_proceso
            nueva_pregunta["fase"] = fase if fase else None
            nueva_pregunta["examen"] = examen if examen else None
        
        # Guardar en JSON
        resultado = guardar_pregunta_json(archivo_json, materia_norm, tema_norm, nueva_pregunta)
        
        return JSONResponse(content={
            "success": True,
            "message": "Pregunta creada exitosamente",
            "pregunta": nueva_pregunta,
            "archivo": str(archivo_json)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.get("/api/materias")
async def obtener_materias():
    return {"materias": MATERIAS}

@app.post("/api/process-image-ai")
async def process_image_ai(
    ai_service: str = Form(...),
    image1: Optional[UploadFile] = File(None),
    image2: Optional[UploadFile] = File(None)
):
    try:
        # Validar servicio de IA
        valid_services = ["openai", "gemini", "claude", "azure"]
        if ai_service not in valid_services:
            raise HTTPException(status_code=400, detail="Servicio de IA no válido")

        # Validar que al menos una imagen esté presente
        if not image1 and not image2:
            raise HTTPException(status_code=400, detail="Debe subir al menos una imagen")

        # Leer imágenes
        images_content = []
        if image1 and image1.filename:
            content1 = await image1.read()
            images_content.append((content1, image1.filename))
        if image2 and image2.filename:
            content2 = await image2.read()
            images_content.append((content2, image2.filename))

        # Procesar con IA (usar la primera imagen para compatibilidad con el código existente)
        # En el futuro, se puede mejorar para procesar ambas imágenes
        result = await process_image_with_ai(ai_service, images_content[0][0], images_content[0][1])

        # Verificar si hubo un error de RECITATION
        if "error" in result and result["error"] == "RECITATION":
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "Contenido bloqueado por políticas de IA")
            )

        return JSONResponse(content={
            "success": True,
            "data": result
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando imagen: {str(e)}")

@app.post("/api/generate-explanation")
async def generate_explanation(
    ai_service: str = Form("gemini"),
    mode: str = Form(...),
    pregunta: str = Form(...),
    respuesta_correcta: str = Form(...),
    question_image1: Optional[UploadFile] = File(None),
    question_image2: Optional[UploadFile] = File(None),
    solution_image1: Optional[UploadFile] = File(None),
    solution_image2: Optional[UploadFile] = File(None),
    solution_image3: Optional[UploadFile] = File(None)
):
    try:
        from ai_services import process_solution_images_with_ai, generate_explanation_from_question

        if mode == "from_question":
            # Modo: generar desde imágenes de pregunta
            question_images = []
            if question_image1 and question_image1.filename:
                content1 = await question_image1.read()
                question_images.append(content1)
            if question_image2 and question_image2.filename:
                content2 = await question_image2.read()
                question_images.append(content2)

            if not question_images:
                raise HTTPException(status_code=400, detail="Se requiere al menos una imagen de la pregunta")

            # Usar la primera imagen para compatibilidad
            result = await generate_explanation_from_question(
                ai_service,
                question_images[0],
                pregunta,
                respuesta_correcta
            )

        elif mode == "from_solution":
            # Modo: generar desde imágenes de solución
            solution_images = []
            for img in [solution_image1, solution_image2, solution_image3]:
                if img and img.filename:
                    content = await img.read()
                    solution_images.append(content)

            if not solution_images:
                raise HTTPException(status_code=400, detail="Se requiere al menos una imagen de solución")

            result = await process_solution_images_with_ai(
                ai_service,
                solution_images,
                pregunta,
                respuesta_correcta
            )
        else:
            raise HTTPException(status_code=400, detail="Modo no válido")

        return JSONResponse(content={
            "success": True,
            "explanation": result["explanation"]
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando explicación: {str(e)}")

@app.post("/api/procesar-comprension")
async def procesar_comprension(
    tipo_comprension: str = Form(...),
    ai_service: str = Form(...),
    texto: str = Form(...),
    pregunta_1: Optional[UploadFile] = File(None),
    pregunta_2: Optional[UploadFile] = File(None),
    pregunta_3: Optional[UploadFile] = File(None)
):
    """Procesa imágenes de preguntas de comprensión y extrae sus datos"""
    try:
        from ai_services import process_comprehension_question

        # Validar tipo de comprensión
        valid_types = ["comprension_lectora_i", "comprension_lectora_ii", "comprension_ingles"]
        if tipo_comprension not in valid_types:
            raise HTTPException(status_code=400, detail="Tipo de comprensión no válido")

        # Determinar número de preguntas esperadas
        num_preguntas = 2 if tipo_comprension in ["comprension_lectora_i", "comprension_ingles"] else 3

        # Recopilar imágenes de preguntas
        imagenes_preguntas = []
        for i, img in enumerate([pregunta_1, pregunta_2, pregunta_3], start=1):
            if i <= num_preguntas:
                if not img or not img.filename:
                    raise HTTPException(status_code=400, detail=f"Se requiere la imagen de la pregunta {i}")
                imagenes_preguntas.append(await img.read())

        # Procesar cada pregunta con IA
        preguntas_procesadas = []
        for i, img_content in enumerate(imagenes_preguntas, start=1):
            result = await process_comprehension_question(ai_service, img_content, texto)
            preguntas_procesadas.append(result)

        return JSONResponse(content={
            "success": True,
            "preguntas": preguntas_procesadas
        })

    except Exception as e:
        print(f"Error procesando comprensión: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando comprensión: {str(e)}")

@app.post("/crear-pregunta-comprension")
async def crear_pregunta_comprension(request: Request):
    """Guarda una pregunta de comprensión en formato JSON"""
    try:
        data = await request.json()

        # Validar campos requeridos
        required_fields = ["tipo_comprension", "numero_tema", "texto", "preguntas", "tipo_clasificacion"]
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Campo requerido: {field}")

        tipo_comprension = data["tipo_comprension"]
        numero_tema = data["numero_tema"]
        texto = data["texto"]
        preguntas = data["preguntas"]
        tipo_clasificacion = data["tipo_clasificacion"]

        # Validar número de preguntas
        num_esperadas = 2 if tipo_comprension in ["comprension_lectora_i", "comprension_ingles"] else 3
        if len(preguntas) != num_esperadas:
            raise HTTPException(status_code=400, detail=f"Se esperan {num_esperadas} preguntas para {tipo_comprension}")

        # Determinar materia normalizada
        materia_map = {
            "comprension_lectora_i": "comprension_lectoraI",
            "comprension_lectora_ii": "comprension_lectoraII",
            "comprension_ingles": "comprension_ingles"
        }
        materia_norm = materia_map[tipo_comprension]

        # Crear estructura de directorios según tipo de clasificación
        if tipo_clasificacion == "normal":
            base_path = Path("banco_preguntas")
            materia_dir = base_path / materia_norm
        else:  # tipo_clasificacion == "proceso"
            # Validar campos de proceso
            if not all(k in data for k in ["area_academica", "anio", "tipo_proceso"]):
                raise HTTPException(status_code=400, detail="Faltan campos de proceso")

            base_path = Path("banco_procesos")
            path_parts = [base_path, data["area_academica"], data["anio"], data["tipo_proceso"]]

            if data.get("fase"):
                fase_norm = normalizar_texto(data["fase"])
                path_parts.append(fase_norm)

            if data.get("examen"):
                examen_norm = normalizar_texto(data["examen"])
                path_parts.append(examen_norm)

            path_parts.append(materia_norm)
            materia_dir = Path(*path_parts)

        # Crear directorios
        materia_dir.mkdir(parents=True, exist_ok=True)

        # Generar IDs temporales para las preguntas
        tema_norm = f"texto_{numero_tema:03d}"
        for idx, pregunta in enumerate(preguntas, start=1):
            pregunta["id_temporal"] = f"{materia_norm[:8]}_00{numero_tema}_{idx:03d}"
            if "imagen" not in pregunta:
                pregunta["imagen"] = None

        # Construir el payload final
        payload = {
            "materia": materia_norm,
            "numero_tema": numero_tema,
            "total_temas": 20,  # Valor por defecto
            "titulo_tema": f"Texto {numero_tema}",
            "texto": texto,
            "preguntas": preguntas
        }

        # Guardar JSON
        archivo_json = materia_dir / f"{tema_norm}.json"
        archivo_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        return JSONResponse(content={
            "success": True,
            "message": "Pregunta de comprensión guardada exitosamente",
            "data": payload,
            "archivo": str(archivo_json)
        })

    except Exception as e:
        print(f"Error guardando comprensión: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error guardando comprensión: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)