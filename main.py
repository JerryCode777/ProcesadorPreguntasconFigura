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
    imagen: Optional[UploadFile] = File(None)
):
    try:
        # Validaciones
        if tipo_clasificacion not in ["normal", "proceso"]:
            raise HTTPException(status_code=400, detail="Tipo de clasificación no válido")

        # Validaciones condicionales si se seleccionó "Por proceso"
        if tipo_clasificacion == "proceso":
            if not anio or anio not in ["2023", "2024", "2025", "2026"]:
                raise HTTPException(status_code=400, detail="Año requerido y debe ser válido")

            tipos_proceso_validos = ["extraordinario", "ceprunsa", "ceprequintos", "ordinario"]
            if not tipo_proceso or tipo_proceso not in tipos_proceso_validos:
                raise HTTPException(status_code=400, detail="Tipo de proceso requerido y debe ser válido")

            # Validaciones condicionales según tipo de proceso
            if tipo_proceso == "ceprunsa":
                if not fase or fase not in ["I FASE", "II FASE"]:
                    raise HTTPException(status_code=400, detail="Fase requerida para CEPRUNSA")
                if not examen or examen not in ["1er examen", "2do examen"]:
                    raise HTTPException(status_code=400, detail="Examen requerido para CEPRUNSA")
            elif tipo_proceso == "ceprequintos":
                if not examen or examen not in ["1er examen", "2do examen"]:
                    raise HTTPException(status_code=400, detail="Examen requerido para CEPREQUINTOS")
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
            # Estructura: banco_procesos/[año]/[tipo_proceso]/[fase]/[examen]/[materia]/
            base_path = Path("banco_procesos")
            path_parts = [base_path, anio, tipo_proceso]

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
        
        # Procesar imagen si existe
        nombre_imagen = None
        if imagen and imagen.filename:
            # Obtener siguiente número para la imagen
            siguiente_num = obtener_siguiente_numero(imagenes_dir, f"{materia_norm}_{tema_norm}")
            extension = imagen.filename.split(".")[-1].lower()
            nombre_imagen = f"{materia_norm}_{tema_norm}_{siguiente_num:03d}.{extension}"
            
            # Guardar imagen
            ruta_imagen = imagenes_dir / nombre_imagen
            with open(ruta_imagen, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
        
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
            "imagen": nombre_imagen
        }

        # Solo añadir campos de proceso si se seleccionó "Por proceso"
        if tipo_clasificacion == "proceso":
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
    image: UploadFile = File(...)
):
    try:
        # Validar servicio de IA
        valid_services = ["openai", "gemini", "claude", "azure"]
        if ai_service not in valid_services:
            raise HTTPException(status_code=400, detail="Servicio de IA no válido")
        
        # Validar imagen
        if not image.filename:
            raise HTTPException(status_code=400, detail="No se subió imagen")
        
        # Leer imagen
        image_content = await image.read()
        
        # Procesar con IA
        result = await process_image_with_ai(ai_service, image_content, image.filename)
        
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
    question_image: Optional[UploadFile] = File(None),
    solution_image1: Optional[UploadFile] = File(None),
    solution_image2: Optional[UploadFile] = File(None),
    solution_image3: Optional[UploadFile] = File(None)
):
    try:
        from ai_services import process_solution_images_with_ai, generate_explanation_from_question

        if mode == "from_question":
            # Modo: generar desde imagen de pregunta
            if not question_image or not question_image.filename:
                raise HTTPException(status_code=400, detail="Se requiere la imagen de la pregunta")

            question_content = await question_image.read()
            result = await generate_explanation_from_question(
                ai_service,
                question_content,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)