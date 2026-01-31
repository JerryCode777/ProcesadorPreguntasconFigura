from pydantic import BaseModel
from typing import Dict, Optional, List

class PreguntaRequest(BaseModel):
    tipo_clasificacion: str
    area_academica: Optional[str] = None
    anio: Optional[str] = None
    tipo_proceso: Optional[str] = None
    fase: Optional[str] = None
    examen: Optional[str] = None
    materia: str
    tema: str
    pregunta: str
    opcion_a: str
    opcion_b: str
    opcion_c: str
    opcion_d: str
    opcion_e: str
    respuesta_correcta: str
    explicacion: str
    dificultad: int

class Pregunta(BaseModel):
    id_temporal: str
    tipo_clasificacion: str
    area_academica: Optional[str] = None
    anio: Optional[str] = None
    tipo_proceso: Optional[str] = None
    fase: Optional[str] = None
    examen: Optional[str] = None
    pregunta: str
    dificultad: int
    opciones: Dict[str, str]
    respuesta_correcta: str
    explicacion: str
    imagenes: Optional[List[str]] = None

class PreguntaResponse(BaseModel):
    materia: str
    tema: str
    preguntas: list[Pregunta]

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None