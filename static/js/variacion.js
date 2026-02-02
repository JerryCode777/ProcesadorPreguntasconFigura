/**
 * Módulo para generación de variaciones de preguntas
 *
 * Permite generar variaciones de preguntas existentes manteniendo
 * los datos numéricos originales pero cambiando contexto o complejidad.
 */

// Estado de variación
let variacionImagenFile = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    setupVariacionImageUpload();
    setupVariacionTipoChange();
});


/**
 * Configura el sistema de subida de imágenes para variaciones
 * Soporta: click, drag & drop, y paste (Ctrl+V)
 */
function setupVariacionImageUpload() {
    const dropArea = document.getElementById('variacionDropArea');
    const fileInput = document.getElementById('variacionImagenPregunta');
    const previewDiv = document.getElementById('variacionPreview');
    const previewImg = document.getElementById('variacionPreviewImage');
    const generateBtn = document.getElementById('btnGenerarVariacion');

    if (!dropArea || !fileInput) return;

    // Click en área de drop
    dropArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            fileInput.click();
        }
    });

    // Cambio de archivo
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleVariacionImage(file);
        }
    });

    // Drag and drop
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('border-blue-500', 'bg-blue-50');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('border-blue-500', 'bg-blue-50');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleVariacionImage(file);
        }
    });

    // Paste (Ctrl+V)
    dropArea.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                handleVariacionImage(file);
                break;
            }
        }
    });

    // Permitir focus en el área para paste
    dropArea.setAttribute('tabindex', '0');
}


/**
 * Maneja la imagen seleccionada y muestra preview
 */
function handleVariacionImage(file) {
    const previewDiv = document.getElementById('variacionPreview');
    const previewImg = document.getElementById('variacionPreviewImage');
    const generateBtn = document.getElementById('btnGenerarVariacion');

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB');
        return;
    }

    variacionImagenFile = file;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewDiv.classList.remove('hidden');

        // Habilitar botón de generar
        if (generateBtn) {
            generateBtn.disabled = false;
        }
    };
    reader.readAsDataURL(file);
}


/**
 * Limpia la imagen seleccionada y oculta preview
 */
function clearVariacionImage() {
    const fileInput = document.getElementById('variacionImagenPregunta');
    const previewDiv = document.getElementById('variacionPreview');
    const generateBtn = document.getElementById('btnGenerarVariacion');

    variacionImagenFile = null;
    fileInput.value = '';
    previewDiv.classList.add('hidden');

    if (generateBtn) {
        generateBtn.disabled = true;
    }

    // Limpiar resultados
    hideVariacionResults();
}


/**
 * Configura el cambio de descripción según tipo de variación
 */
function setupVariacionTipoChange() {
    const tipoSelect = document.getElementById('variacionTipo');
    const tipoDesc = document.getElementById('variacionTipoDesc');

    if (!tipoSelect || !tipoDesc) return;

    const descriptions = {
        'contexto': 'Cambia el contexto pero mantiene los mismos números',
        'paso_adicional': 'Añade un paso adicional al problema manteniendo los números originales',
        'mas_compleja': 'Hace la pregunta más desafiante agregando complejidad'
    };

    tipoSelect.addEventListener('change', () => {
        const tipo = tipoSelect.value;
        tipoDesc.textContent = descriptions[tipo] || '';
    });
}


/**
 * Genera la variación de la pregunta usando IA
 */
async function generarVariacion() {
    const servicioSelect = document.getElementById('variacionServicioIA');
    const tipoSelect = document.getElementById('variacionTipo');
    const loadingDiv = document.getElementById('variacionLoading');
    const errorDiv = document.getElementById('variacionError');
    const resultadoDiv = document.getElementById('variacionResultado');
    const generateBtn = document.getElementById('btnGenerarVariacion');

    if (!variacionImagenFile) {
        showVariacionError('Por favor sube una imagen de la pregunta');
        return;
    }

    const servicio = servicioSelect.value;
    const tipo = tipoSelect.value;

    // Mostrar loading
    hideVariacionResults();
    loadingDiv.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="inline-block animate-spin">⏳</span> Generando...';

    try {
        // Preparar FormData
        const formData = new FormData();
        formData.append('ai_service', servicio);
        formData.append('tipo_variacion', tipo);
        formData.append('imagen', variacionImagenFile);

        // Llamar al endpoint
        const response = await fetch('/api/generar-variacion', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Error al generar variación');
        }

        if (!data.success) {
            throw new Error('No se pudo generar la variación');
        }

        // Mostrar resultados
        mostrarResultadoVariacion(data.data);

    } catch (error) {
        console.error('Error generando variación:', error);
        showVariacionError(error.message);
    } finally {
        loadingDiv.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.innerHTML = '🚀 Generar Variación';
    }
}


/**
 * Muestra el resultado de la variación generada
 */
function mostrarResultadoVariacion(data) {
    const resultadoDiv = document.getElementById('variacionResultado');
    const preguntaOriginal = document.getElementById('variacionPreguntaOriginal');
    const preguntaVariada = document.getElementById('variacionPreguntaVariada');
    const cambios = document.getElementById('variacionCambios');
    const numeros = document.getElementById('variacionNumeros');

    // Llenar datos
    preguntaOriginal.textContent = data.pregunta_original || '';
    preguntaVariada.textContent = data.pregunta_variada || '';
    cambios.textContent = data.descripcion_cambios || '';

    const numerosLista = data.numeros_mantenidos || [];
    numeros.textContent = numerosLista.length > 0
        ? numerosLista.join(', ')
        : 'No se identificaron números específicos';

    // Mostrar resultado
    resultadoDiv.classList.remove('hidden');

    // Scroll a resultados
    setTimeout(() => {
        resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Renderizar LaTeX si existe
    setTimeout(() => {
        if (window.renderMathInElement) {
            renderMathInElement(preguntaOriginal, {
                delimiters: [
                    {left: "$$", right: "$$", display: false}
                ]
            });
            renderMathInElement(preguntaVariada, {
                delimiters: [
                    {left: "$$", right: "$$", display: false}
                ]
            });
        }
    }, 150);
}


/**
 * Muestra un mensaje de error
 */
function showVariacionError(message) {
    const errorDiv = document.getElementById('variacionError');
    const errorMsg = document.getElementById('variacionErrorMsg');

    errorMsg.textContent = message;
    errorDiv.classList.remove('hidden');

    // Scroll al error
    setTimeout(() => {
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    // Ocultar después de 8 segundos
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 8000);
}


/**
 * Oculta todos los resultados de variación
 */
function hideVariacionResults() {
    const errorDiv = document.getElementById('variacionError');
    const resultadoDiv = document.getElementById('variacionResultado');

    if (errorDiv) errorDiv.classList.add('hidden');
    if (resultadoDiv) resultadoDiv.classList.add('hidden');
}


/**
 * Función auxiliar para copiar texto al portapapeles
 * (usa la función global si está disponible)
 */
if (typeof copyToClipboard === 'undefined') {
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Texto copiado al portapapeles');
        }).catch(err => {
            console.error('Error al copiar:', err);
        });
    };
}