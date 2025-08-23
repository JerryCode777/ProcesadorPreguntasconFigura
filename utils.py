import re
import json
import os
from pathlib import Path
from typing import Dict, Any

def normalizar_texto(texto: str) -> str:
    """
    Normaliza texto: minúsculas, sin tildes, espacios -> guiones bajos
    """
    # Convertir a minúsculas
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

def obtener_siguiente_numero(directorio: Path, prefijo: str) -> int:
    """
    Obtiene el siguiente número disponible para archivos con un prefijo dado
    """
    if not directorio.exists():
        return 1
    
    archivos = list(directorio.glob(f"{prefijo}_*.jpg")) + \
               list(directorio.glob(f"{prefijo}_*.png")) + \
               list(directorio.glob(f"{prefijo}_*.jpeg"))
    
    if not archivos:
        return 1
    
    numeros = []
    for archivo in archivos:
        # Extraer número del nombre del archivo
        match = re.search(r'_(\d{3})\.(jpg|png|jpeg)$', archivo.name)
        if match:
            numeros.append(int(match.group(1)))
    
    if not numeros:
        return 1
    
    return max(numeros) + 1

def guardar_pregunta_json(archivo_path: Path, materia: str, tema: str, nueva_pregunta: Dict[str, Any]) -> Dict[str, Any]:
    """
    Guarda una pregunta en el archivo JSON correspondiente.
    Si el archivo no existe, lo crea. Si existe, agrega la pregunta al array.
    """
    
    # Estructura base del JSON
    estructura_base = {
        "materia": materia,
        "tema": tema,
        "preguntas": []
    }
    
    # Si el archivo existe, cargar datos existentes
    if archivo_path.exists():
        try:
            with open(archivo_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError:
            data = estructura_base
    else:
        data = estructura_base
    
    # Asegurar que la estructura es correcta
    if "preguntas" not in data:
        data["preguntas"] = []
    
    # Agregar nueva pregunta
    data["preguntas"].append(nueva_pregunta)
    
    # Guardar archivo
    with open(archivo_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return data

def validar_extension_imagen(filename: str) -> bool:
    """
    Valida que la extensión del archivo sea una imagen permitida
    """
    extensiones_permitidas = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    if not filename:
        return False
    
    extension = Path(filename).suffix.lower()
    return extension in extensiones_permitidas

def limpiar_texto(texto: str) -> str:
    """
    Limpia texto eliminando espacios extra y caracteres problemáticos
    """
    # Eliminar espacios múltiples
    texto = re.sub(r'\s+', ' ', texto)
    
    # Eliminar espacios al inicio y final
    texto = texto.strip()
    
    return texto