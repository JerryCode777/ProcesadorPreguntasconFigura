#!/usr/bin/env python3
"""
Script de ejecución para el Banco de Preguntas Preuniversitarias
"""

import uvicorn
import os
import sys
from pathlib import Path

def main():
    """Función principal para ejecutar la aplicación"""
    
    # Configuración del servidor
    config = {
        "app": "main:app",
        "host": "0.0.0.0",
        "port": 8000,
        "reload": True,
        "reload_dirs": [".", "templates", "static"],
        "log_level": "info"
    }
    
    print("🚀 Iniciando Banco de Preguntas Preuniversitarias...")
    print(f"📡 Servidor disponible en: http://localhost:{config['port']}")
    print(f"📁 Directorio de trabajo: {os.getcwd()}")
    print("=" * 50)
    
    try:
        uvicorn.run(**config)
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido por el usuario")
    except Exception as e:
        print(f"❌ Error al iniciar el servidor: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()