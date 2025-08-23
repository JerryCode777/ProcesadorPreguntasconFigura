from pydantic import BaseModel
from typing import Dict, Optional

class PreguntaRequest(BaseModel):
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
    pregunta: str
    dificultad: int
    opciones: Dict[str, str]
    respuesta_correcta: str
    explicacion: str
    imagen: Optional[str] = None

class PreguntaResponse(BaseModel):
    materia: str
    tema: str
    preguntas: list[Pregunta]

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None