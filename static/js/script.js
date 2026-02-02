// Elementos del DOM
const form = document.getElementById('preguntaForm');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const mensaje = document.getElementById('mensaje');
const jsonPreview = document.getElementById('jsonPreview');
const jsonContent = document.getElementById('jsonContent');

// Estado del formulario
let isSubmitting = false;

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupValidation();
    setupFormSubmission();
    setupResetButton();
    setupImagePreview();
    setupMathPreview();
    setupAICapture();
    setupExplanationAI();
    setupProcesoSelectors();
});

function initializeForm() {
    // Auto-resize de textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', autoResize);
        autoResize.call(textarea);
    });
    
    // Validación en tiempo real
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', (e) => clearFieldError(e.target));
    });
}

function autoResize() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
}

function setupValidation() {
    // Validar dificultad
    const dificultad = document.getElementById('dificultad');
    if (dificultad) {
        dificultad.addEventListener('change', function() {
            const value = parseInt(this.value);
            if (value < 1 || value > 5) {
                showFieldError(this, 'La dificultad debe estar entre 1 y 5');
            }
        });
    }

    // Validar imágenes (ambas)
    for (let i = 1; i <= 2; i++) {
        const imagen = document.getElementById(`imagen${i}`);
        if (imagen) {
            imagen.addEventListener('change', function() {
                if (this.files.length > 0) {
                    const file = this.files[0];
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];

                    if (!validTypes.includes(file.type)) {
                        showFieldError(this, 'Tipo de archivo no válido. Use JPG, PNG, GIF, BMP o WebP');
                        this.value = '';
                        return;
                    }

                    // Límite de tamaño: 5MB
                    if (file.size > 5 * 1024 * 1024) {
                        showFieldError(this, 'El archivo es demasiado grande. Máximo 5MB');
                        this.value = '';
                        return;
                    }
                }
            });
        }
    }
}

function setupFormSubmission() {
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (isSubmitting) return;

        // Validar formulario
        if (!validateForm()) {
            showMessage('Por favor corrige los errores en el formulario', 'error');
            return;
        }

        await submitForm();
    });
}

function setupResetButton() {
    if (!resetBtn) return;

    resetBtn.addEventListener('click', function() {
        if (confirm('¿Estás seguro de que deseas limpiar todos los campos?')) {
            form.reset();
            clearAllMessages();
            hideJsonPreview();
            clearMathPreviews();

            // Ocultar sección de proceso
            const procesoSection = document.getElementById('proceso_section');
            const faseContainer = document.getElementById('fase_container');
            const examenContainer = document.getElementById('examen_container');
            procesoSection.classList.add('hidden');
            faseContainer.classList.add('hidden');
            examenContainer.classList.add('hidden');
            procesoSection.style.display = 'none';
            faseContainer.style.display = 'none';
            examenContainer.style.display = 'none';

            // Resetear required de campos de proceso
            document.getElementById('area_academica').required = false;
            document.getElementById('anio').required = false;
            document.getElementById('tipo_proceso').required = false;
            document.getElementById('fase').required = false;
            document.getElementById('examen').required = false;

            // Limpiar vista previa de imágenes finales
            for (let i = 1; i <= 2; i++) {
                const finalImagePreview = document.getElementById(`finalImagePreview${i}`);
                if (finalImagePreview) {
                    finalImagePreview.classList.add('hidden');
                    finalImagePreview.style.display = 'none';
                }
            }

            // Limpiar vista previa de IA
            resetAICapture();

            // Resetear altura de textareas a su valor original
            const textareas = document.querySelectorAll('textarea');
            textareas.forEach(textarea => {
                textarea.style.height = 'auto'; // Resetear altura
                textarea.style.height = ''; // Quitar estilo inline para volver al CSS
            });
        }
    });
}

function setupImagePreview() {
    // Configurar ambas áreas de imagen
    for (let imageNum = 1; imageNum <= 2; imageNum++) {
        setupSingleImagePreview(imageNum);
    }
}

function setupSingleImagePreview(imageNum) {
    const imagen = document.getElementById(`imagen${imageNum}`);
    const finalImageDropArea = document.getElementById(`finalImageDropArea${imageNum}`);
    const finalImagePreview = document.getElementById(`finalImagePreview${imageNum}`);
    const finalImagePreviewImg = document.getElementById(`finalImagePreviewImg${imageNum}`);

    if (!imagen || !finalImageDropArea) return;

    // Función para mostrar vista previa
    const showFinalImagePreview = (file) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            finalImagePreviewImg.src = e.target.result;
            finalImagePreview.classList.remove('hidden');
            finalImagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    };

    // Input file change
    imagen.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            showFinalImagePreview(this.files[0]);
        }
    });

    // Configurar drag & drop para imagen final
    finalImageDropArea.setAttribute('tabindex', '0');
    finalImageDropArea.style.outline = 'none';
    finalImageDropArea.setAttribute('contenteditable', 'false');

    // Drag over
    finalImageDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        finalImageDropArea.style.borderColor = '#4a90e2';
        finalImageDropArea.style.background = '#f0f8ff';
    });

    // Drag leave
    finalImageDropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        finalImageDropArea.style.borderColor = '';
        finalImageDropArea.style.background = '';
    });

    // Drop
    finalImageDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        finalImageDropArea.style.borderColor = '';
        finalImageDropArea.style.background = '';

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            imagen.files = dataTransfer.files;

            showFinalImagePreview(files[0]);
            showMessage(`✅ Imagen ${imageNum} cargada exitosamente`, 'success', false);
        }
    });

    // Paste - directamente en el elemento
    finalImageDropArea.addEventListener('paste', (e) => {
        console.log(`Paste event en finalImageDropArea${imageNum}`, e);
        e.preventDefault();
        e.stopPropagation();

        const items = e.clipboardData?.items;
        if (!items) {
            console.log('No clipboard items');
            showMessage('No se detectó contenido en el portapapeles', 'error', false);
            return;
        }

        console.log(`Total items: ${items.length}`);
        for (let i = 0; i < items.length; i++) {
            console.log(`Item ${i}: ${items[i].type}`);
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                console.log('Image file:', file);
                if (file) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    imagen.files = dataTransfer.files;

                    showFinalImagePreview(file);
                    showMessage(`📋 Imagen ${imageNum} pegada desde el portapapeles`, 'success', false);
                } else {
                    showMessage('Error al obtener la imagen del portapapeles', 'error', false);
                }
                return;
            }
        }

        showMessage('No se encontró ninguna imagen. Copia una imagen primero.', 'error', false);
    });

    // Click enfoca y permite paste
    finalImageDropArea.addEventListener('click', (e) => {
        e.stopPropagation();
        finalImageDropArea.focus();
        console.log(`finalImageDropArea${imageNum} focused`);
    });

    // Indicador visual cuando tiene foco
    finalImageDropArea.addEventListener('focus', () => {
        finalImageDropArea.style.borderColor = '#10b981';
        finalImageDropArea.style.background = '#ecfdf5';
        console.log(`finalImageDropArea${imageNum} gained focus`);
    });

    finalImageDropArea.addEventListener('blur', () => {
        finalImageDropArea.style.borderColor = '';
        finalImageDropArea.style.background = '';
        console.log(`finalImageDropArea${imageNum} lost focus`);
    });
}

// Función global para limpiar imagen específica
function clearFinalImage(imageNum) {
    const imagen = document.getElementById(`imagen${imageNum}`);
    const finalImagePreview = document.getElementById(`finalImagePreview${imageNum}`);

    if (imagen) {
        imagen.value = '';
    }
    if (finalImagePreview) {
        finalImagePreview.classList.add('hidden');
        finalImagePreview.style.display = 'none';
    }
    showMessage(`🗑️ Imagen ${imageNum} eliminada`, 'success', false);
}

function validateForm() {
    let isValid = true;
    clearAllMessages();

    // Validar campos básicos siempre requeridos
    const basicRequiredFields = [
        'tipo_clasificacion', 'materia', 'tema', 'pregunta', 'opcion_a', 'opcion_b',
        'opcion_c', 'opcion_d', 'opcion_e', 'respuesta_correcta',
        'explicacion', 'dificultad'
    ];

    basicRequiredFields.forEach(fieldName => {
        const field = document.getElementById(fieldName);
        if (field && (!field.value || field.value.trim() === '')) {
            showFieldError(field, 'Este campo es obligatorio');
            isValid = false;
        } else if (field) {
            clearFieldError(field);
        }
    });

    // Validar campos de proceso solo si se seleccionó "Por proceso"
    const tipoClasificacion = document.getElementById('tipo_clasificacion').value;

    if (tipoClasificacion === 'proceso') {
        const procesoRequiredFields = ['area_academica', 'anio', 'tipo_proceso'];

        procesoRequiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field && (!field.value || field.value.trim() === '')) {
                showFieldError(field, 'Este campo es obligatorio');
                isValid = false;
            } else if (field) {
                clearFieldError(field);
            }
        });

        // Validar campos condicionales (fase y examen)
        const faseField = document.getElementById('fase');
        const examenField = document.getElementById('examen');

        if (faseField.required && (!faseField.value || faseField.value.trim() === '')) {
            showFieldError(faseField, 'Este campo es obligatorio');
            isValid = false;
        }

        if (examenField.required && (!examenField.value || examenField.value.trim() === '')) {
            showFieldError(examenField, 'Este campo es obligatorio');
            isValid = false;
        }
    }
    
    // Validaciones específicas solo si los campos tienen valor
    const respuestaCorrecta = document.getElementById('respuesta_correcta').value;
    if (!respuestaCorrecta || respuestaCorrecta === '') {
        showFieldError(document.getElementById('respuesta_correcta'), 'Selecciona una respuesta correcta');
        isValid = false;
    } else if (!['A', 'B', 'C', 'D', 'E'].includes(respuestaCorrecta)) {
        showFieldError(document.getElementById('respuesta_correcta'), 'Selecciona una opción válida (A-E)');
        isValid = false;
    }
    
    const dificultad = document.getElementById('dificultad').value;
    if (!dificultad || dificultad === '') {
        showFieldError(document.getElementById('dificultad'), 'Selecciona una dificultad');
        isValid = false;
    } else {
        const dificultadNum = parseInt(dificultad);
        if (isNaN(dificultadNum) || dificultadNum < 1 || dificultadNum > 5) {
            showFieldError(document.getElementById('dificultad'), 'Selecciona una dificultad entre 1 y 5');
            isValid = false;
        }
    }
    
    return isValid;
}

async function submitForm() {
    setSubmittingState(true);
    
    try {
        const formData = new FormData(form);
        
        const response = await fetch('/crear-pregunta', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('✅ Pregunta creada exitosamente', 'success');
            showJsonPreview(result.pregunta);
            
            // Preguntar si continuar con el mismo proceso
            setTimeout(async () => {
                const choice = await promptContinueProcess();
                if (!choice) return;

                if (choice.action === 'same') {
                    resetForNextQuestion(true, choice.keepMateria, choice.keepDificultad);
                } else {
                    resetForNextQuestion(false, false, false);
                }
            }, 300);
        } else {
            throw new Error(result.detail || 'Error al crear la pregunta');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    } finally {
        setSubmittingState(false);
    }
}

function scrollToTopNow() {
    const originalBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.style.scrollBehavior = originalBehavior;
    });
}

function promptContinueProcess() {
    return new Promise((resolve) => {
        const modal = document.getElementById('continueModal');
        const btnSame = document.getElementById('continueSameProcess');
        const btnFresh = document.getElementById('startFresh');
        const keepMateria = document.getElementById('keepMateria');
        const keepDificultad = document.getElementById('keepDificultad');

        if (!modal || !btnSame || !btnFresh) {
            console.warn('Modal de continuidad no encontrado en el DOM.');
            resolve(null);
            return;
        }

        const handleSame = () => {
            const keepM = !!keepMateria?.checked;
            const keepD = !!keepDificultad?.checked;
            cleanup();
            resolve({ action: 'same', keepMateria: keepM, keepDificultad: keepD });
        };
        const handleFresh = () => {
            cleanup();
            resolve({ action: 'fresh', keepMateria: false, keepDificultad: false });
        };

        const cleanup = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            modal.style.display = 'none';
            btnSame.removeEventListener('click', handleSame);
            btnFresh.removeEventListener('click', handleFresh);
            if (keepMateria) keepMateria.checked = false;
            if (keepDificultad) keepDificultad.checked = false;
        };

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
        btnSame.addEventListener('click', handleSame);
        btnFresh.addEventListener('click', handleFresh);
    });
}

function resetForNextQuestion(keepProcess, keepMateria, keepDificultad) {
    const processValues = {
        tipo_clasificacion: document.getElementById('tipo_clasificacion').value,
        area_academica: document.getElementById('area_academica').value,
        anio: document.getElementById('anio').value,
        tipo_proceso: document.getElementById('tipo_proceso').value,
        fase: document.getElementById('fase').value,
        examen: document.getElementById('examen').value,
        materia: document.getElementById('materia').value,
        dificultad: document.getElementById('dificultad').value
    };

    form.reset();
    hideJsonPreview();
    clearAllMessages();
    clearMathPreviews();

    // Limpiar vista previa de imágenes finales
    for (let i = 1; i <= 2; i++) {
        const finalImagePreview = document.getElementById(`finalImagePreview${i}`);
        if (finalImagePreview) {
            finalImagePreview.classList.add('hidden');
            finalImagePreview.style.display = 'none';
        }
    }

    // Limpiar vista previa de IA
    resetAICapture();

    // Resetear altura de textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = '';
    });

    const procesoSection = document.getElementById('proceso_section');
    const faseContainer = document.getElementById('fase_container');
    const examenContainer = document.getElementById('examen_container');

    if (keepProcess) {
        document.getElementById('tipo_clasificacion').value = processValues.tipo_clasificacion || 'proceso';
        document.getElementById('area_academica').value = processValues.area_academica;
        document.getElementById('anio').value = processValues.anio;
        document.getElementById('tipo_proceso').value = processValues.tipo_proceso;

        procesoSection.classList.remove('hidden');
        procesoSection.style.display = 'block';

        document.getElementById('area_academica').required = true;
        document.getElementById('anio').required = true;
        document.getElementById('tipo_proceso').required = true;

        // Refrescar selectores y reponer valores
        const event = new Event('change');
        document.getElementById('anio').dispatchEvent(event);
        document.getElementById('tipo_proceso').dispatchEvent(event);

        if (processValues.fase) {
            document.getElementById('fase').value = processValues.fase;
            faseContainer.classList.remove('hidden');
            faseContainer.style.display = 'block';
            document.getElementById('fase').required = true;
        }
        if (processValues.examen) {
            document.getElementById('examen').value = processValues.examen;
            examenContainer.classList.remove('hidden');
            examenContainer.style.display = 'block';
            document.getElementById('examen').required = true;
        }
    } else {
        procesoSection.classList.add('hidden');
        faseContainer.classList.add('hidden');
        examenContainer.classList.add('hidden');
        procesoSection.style.display = 'none';
        faseContainer.style.display = 'none';
        examenContainer.style.display = 'none';

        document.getElementById('area_academica').required = false;
        document.getElementById('anio').required = false;
        document.getElementById('tipo_proceso').required = false;
        document.getElementById('fase').required = false;
        document.getElementById('examen').required = false;
    }

    if (keepMateria) {
        document.getElementById('materia').value = processValues.materia;
    }

    if (keepDificultad) {
        document.getElementById('dificultad').value = processValues.dificultad;
    } else {
        document.getElementById('dificultad').value = '';
    }

    scrollToTopNow();
}

function setSubmittingState(submitting) {
    isSubmitting = submitting;
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    if (submitting) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
        submitBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function showMessage(text, type, doScroll = true) {
    mensaje.textContent = text;
    if (type === 'success') {
        mensaje.className = 'mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700';
    } else {
        mensaje.className = 'mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-700';
    }
    mensaje.classList.remove('hidden');
    mensaje.style.display = 'block';

    // Scroll suave hacia el mensaje solo si se solicita
    if (doScroll) {
        mensaje.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Auto-hide después de 5 segundos si es éxito
    if (type === 'success') {
        setTimeout(() => {
            mensaje.style.display = 'none';
        }, 5000);
    }
}

function showJsonPreview(pregunta) {
    const jsonData = {
        id_temporal: pregunta.id_temporal,
        tipo_clasificacion: pregunta.tipo_clasificacion,
        pregunta: pregunta.pregunta,
        dificultad: pregunta.dificultad,
        opciones: pregunta.opciones,
        respuesta_correcta: pregunta.respuesta_correcta,
        explicacion: pregunta.explicacion,
        imagenes: pregunta.imagenes
    };

    // Solo añadir campos de proceso si están presentes
    if (pregunta.tipo_clasificacion === 'proceso') {
        jsonData.area_academica = pregunta.area_academica;
        jsonData.anio = pregunta.anio;
        jsonData.tipo_proceso = pregunta.tipo_proceso;
        if (pregunta.fase) jsonData.fase = pregunta.fase;
        if (pregunta.examen) jsonData.examen = pregunta.examen;
    }

    jsonContent.textContent = JSON.stringify(jsonData, null, 2);
    jsonPreview.classList.remove('hidden');
    jsonPreview.style.display = 'block';

    // Scroll suave hacia la vista previa
    jsonPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideJsonPreview() {
    jsonPreview.classList.add('hidden');
    jsonPreview.style.display = 'none';
}

function showFieldError(field, message) {
    // Remover error anterior
    clearFieldError(field);
    
    // Agregar clase de error
    field.style.borderColor = '#dc3545';
    
    // Crear y mostrar mensaje de error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 5px;
        display: block;
    `;
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    // Buscar y remover mensaje de error
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
    
    // Restablecer estilo del campo
    field.style.borderColor = '';
    field.classList.remove('error');
}

function validateField(event) {
    const field = event.target;
    
    // Limpiar error previo primero
    clearFieldError(field);
    
    // Solo validar si el campo está marcado como required y está vacío
    if (field.hasAttribute('required') && !field.value.trim()) {
        showFieldError(field, 'Este campo es obligatorio');
    }
}

function clearAllMessages() {
    mensaje.style.display = 'none';
    mensaje.classList.add('hidden');
    
    // Limpiar errores de campos
    const errorDivs = document.querySelectorAll('.field-error');
    errorDivs.forEach(div => div.remove());
    
    // Restablecer estilos de campos
    const fields = document.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.style.borderColor = '';
    });
}

// Utilidades adicionales
function formatJSON(obj) {
    return JSON.stringify(obj, null, 2);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showMessage('✅ JSON copiado al portapapeles', 'success');
    }).catch(() => {
        showMessage('❌ No se pudo copiar al portapapeles', 'error');
    });
}

// Agregar botón de copiar al JSON preview
document.addEventListener('DOMContentLoaded', function() {
    const jsonPreviewHeader = document.querySelector('.json-preview h3');
    if (jsonPreviewHeader) {
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.innerHTML = '📋 Copiar JSON';
        copyBtn.style.cssText = `
            float: right;
            background: #4a90e2;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
        `;
        copyBtn.addEventListener('click', () => {
            const jsonText = document.getElementById('jsonContent').textContent;
            copyToClipboard(jsonText);
        });
        
        jsonPreviewHeader.appendChild(copyBtn);
    }
});

// ======= FUNCIONES MATEMÁTICAS =======

function setupMathPreview() {
    // Campos que tendrán vista previa matemática
    const mathFields = ['pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d', 'opcion_e', 'explicacion'];
    
    mathFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => updateMathPreview(fieldId));
        }
    });
}

function insertMath(fieldId, mathText) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const value = field.value;
    
    let newText = mathText;
    let cursorPos = start + mathText.length;
    
    // Para casos especiales con cursor positioning
    if (mathText === '$$$$') {
        newText = '$$$$';
        cursorPos = start + 2; // Posicionar cursor entre los $$
    } else if (mathText === '\\frac{}{}') {
        newText = '$$\\frac{}{}$$';
        cursorPos = start + 8; // Posicionar cursor en el primer {}
    } else if (mathText === '\\sqrt{}') {
        newText = '$$\\sqrt{}$$';
        cursorPos = start + 8; // Posicionar cursor dentro de {}
    } else {
        // Para otros casos, envolver en $$
        newText = `$$${mathText}$$`;
        cursorPos = start + newText.length;
    }
    
    const newValue = value.substring(0, start) + newText + value.substring(end);
    field.value = newValue;
    
    // Restaurar focus y posición del cursor
    field.focus();
    field.setSelectionRange(cursorPos, cursorPos);
    
    // Actualizar vista previa
    updateMathPreview(fieldId);
    
    // Trigger auto-resize
    autoResize.call(field);
}

function updateMathPreview(fieldId) {
    const field = document.getElementById(fieldId);
    const previewId = `${fieldId}-preview`;
    const preview = document.getElementById(previewId);
    
    if (!field || !preview) return;
    
    const text = field.value.trim();
    
    if (!text) {
        preview.innerHTML = '';
        return;
    }
    
    try {
        // Renderizar el texto completo (tanto texto normal como matemáticas)
        preview.innerHTML = text;
        
        // Usar KaTeX auto-render para procesar las matemáticas
        if (window.renderMathInElement) {
            window.renderMathInElement(preview, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false,
                errorColor: '#cc0000'
            });
        }
    } catch (error) {
        console.log('Error rendering math:', error);
        preview.innerHTML = text; // Fallback a texto plano
    }
}

// Funciones auxiliares de matemáticas
function wrapWithMath(text) {
    return `$$${text}$$`;
}

function insertFraction(fieldId) {
    insertMath(fieldId, '\\frac{}{}');
}

function insertSqrt(fieldId) {
    insertMath(fieldId, '\\sqrt{}');
}

function insertPower(fieldId) {
    insertMath(fieldId, 'x^{}');
}

function insertGreaterEqual(fieldId) {
    insertMath(fieldId, '\\geq');
}

function insertLessEqual(fieldId) {
    insertMath(fieldId, '\\leq');
}

// ======= FUNCIONES AVANZADAS DE CALCULADORA CIENTÍFICA =======

function insertMathFraction(fieldId) {
    const numerator = prompt('Ingresa el numerador:');
    const denominator = prompt('Ingresa el denominador:');
    
    if (numerator && denominator) {
        insertMath(fieldId, `\\frac{${numerator}}{${denominator}}`);
    }
}

function insertMatrix2x2(fieldId) {
    const matrix = `\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}`;
    insertMath(fieldId, matrix);
}

function insertMatrix3x3(fieldId) {
    const matrix = `\\begin{pmatrix}
a & b & c \\\\
d & e & f \\\\
g & h & i
\\end{pmatrix}`;
    insertMath(fieldId, matrix);
}

function insertVector(fieldId) {
    const components = prompt('¿Cuántos componentes tiene el vector? (2, 3, 4...)');
    const num = parseInt(components);
    
    if (num && num > 0 && num <= 10) {
        let vector = '\\begin{pmatrix}';
        for (let i = 0; i < num; i++) {
            vector += i === 0 ? 'v_1' : ` \\\\ v_${i + 1}`;
        }
        vector += '\\end{pmatrix}';
        insertMath(fieldId, vector);
    }
}

// Función para insertar ecuaciones complejas
function insertComplexEquation(fieldId) {
    const equations = {
        'cuadratica': 'ax^2 + bx + c = 0',
        'formula_cuadratica': 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        'distancia': 'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}',
        'area_circulo': 'A = \\pi r^2',
        'volumen_esfera': 'V = \\frac{4}{3}\\pi r^3',
        'ley_cosenos': 'c^2 = a^2 + b^2 - 2ab\\cos C',
        'derivada_potencia': '\\frac{d}{dx}(x^n) = nx^{n-1}',
        'integral_potencia': '\\int x^n dx = \\frac{x^{n+1}}{n+1} + C'
    };
    
    const selected = prompt(`Selecciona una ecuación:
1. cuadratica - Ecuación cuadrática
2. formula_cuadratica - Fórmula cuadrática
3. distancia - Fórmula de distancia
4. area_circulo - Área del círculo
5. volumen_esfera - Volumen de esfera
6. ley_cosenos - Ley de cosenos
7. derivada_potencia - Derivada de potencia
8. integral_potencia - Integral de potencia

Escribe el nombre:`);
    
    if (equations[selected]) {
        insertMath(fieldId, equations[selected]);
    }
}

// Función para insertar símbolos especiales por categoría
function insertSpecialSymbol(fieldId, category) {
    const symbols = {
        'conjuntos': {
            '\\in': '∈ (pertenece)',
            '\\notin': '∉ (no pertenece)',
            '\\subset': '⊂ (subconjunto)',
            '\\supset': '⊃ (superconjunto)',
            '\\cup': '∪ (unión)',
            '\\cap': '∩ (intersección)',
            '\\emptyset': '∅ (conjunto vacío)'
        },
        'logica': {
            '\\land': '∧ (y lógico)',
            '\\lor': '∨ (o lógico)',
            '\\neg': '¬ (negación)',
            '\\implies': '⇒ (implica)',
            '\\iff': '⇔ (si y solo si)',
            '\\forall': '∀ (para todo)',
            '\\exists': '∃ (existe)'
        }
    };
    
    if (symbols[category]) {
        let options = Object.entries(symbols[category])
            .map(([latex, desc], i) => `${i + 1}. ${latex} - ${desc}`)
            .join('\n');
        
        const selected = prompt(`Símbolos de ${category}:\n${options}\n\nEscribe el LaTeX:`);
        if (symbols[category][selected]) {
            insertMath(fieldId, selected);
        }
    }
}

// Inicializar KaTeX cuando se cargue
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que KaTeX se cargue completamente
    const checkKaTeX = () => {
        if (window.katex && window.renderMathInElement) {
            console.log('KaTeX loaded successfully');
            // Configurar auto-render
            window.renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });
        } else {
            setTimeout(checkKaTeX, 100);
        }
    };
    checkKaTeX();
});

// ======= FUNCIONALIDAD DE IA Y CAPTURA =======

let currentAIImages = {1: null, 2: null};

function setupAICapture() {
    // Configurar ambas áreas de IA
    for (let imageNum = 1; imageNum <= 2; imageNum++) {
        setupSingleAICapture(imageNum);
    }

    // Process button
    const processBtn = document.getElementById('processWithAI');
    processBtn.addEventListener('click', processImageWithAI);
}

function setupSingleAICapture(imageNum) {
    const dragDropArea = document.getElementById(`dragDropArea${imageNum}`);
    const aiImageUpload = document.getElementById(`aiImageUpload${imageNum}`);
    const aiPreview = document.getElementById(`aiPreview${imageNum}`);
    const aiPreviewImage = document.getElementById(`aiPreviewImage${imageNum}`);

    if (!dragDropArea || !aiImageUpload) return;

    // Hacer el área enfocable
    dragDropArea.setAttribute('tabindex', '0');
    dragDropArea.style.outline = 'none';
    dragDropArea.style.cursor = 'pointer';
    dragDropArea.setAttribute('contenteditable', 'false');

    // Drag and Drop
    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.classList.add('border-slate-500', 'bg-white');
    });

    dragDropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('border-slate-500', 'bg-white');
    });

    dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDropArea.classList.remove('border-slate-500', 'bg-white');

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleAIImageUpload(imageNum, files[0]);
        }

        dragDropArea.blur();
    });

    // File input change
    aiImageUpload.addEventListener('change', (e) => {
        e.preventDefault();
        if (e.target.files.length > 0) {
            handleAIImageUpload(imageNum, e.target.files[0]);
        }
        e.target.blur();
    });

    // Paste - directamente en el elemento
    dragDropArea.addEventListener('paste', (e) => {
        console.log(`Paste event en dragDropArea${imageNum}`, e);
        e.preventDefault();
        e.stopPropagation();

        const items = e.clipboardData?.items;

        if (!items) {
            console.log('No clipboard items');
            showMessage('No se detectó contenido en el portapapeles', 'error', false);
            return;
        }

        console.log(`Total items: ${items.length}`);
        for (let i = 0; i < items.length; i++) {
            console.log(`Item ${i}: ${items[i].type}`);
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                console.log('Image file:', file);

                if (file) {
                    handleAIImageUpload(imageNum, file);
                    showMessage(`📋 Imagen IA ${imageNum} pegada desde el portapapeles`, 'success', false);
                } else {
                    showMessage('Error al obtener la imagen del portapapeles', 'error', false);
                }
                return;
            }
        }

        showMessage('No se encontró ninguna imagen. Copia una imagen primero.', 'error', false);
    });

    // Hacer clic enfoca el área
    dragDropArea.addEventListener('click', (e) => {
        e.stopPropagation();
        dragDropArea.focus();
        console.log(`dragDropArea${imageNum} focused`);
    });

    // Indicador visual cuando tiene foco
    dragDropArea.addEventListener('focus', () => {
        dragDropArea.style.borderColor = '#10b981';
        dragDropArea.style.background = '#ecfdf5';
        console.log(`dragDropArea${imageNum} gained focus`);
    });

    dragDropArea.addEventListener('blur', () => {
        dragDropArea.style.borderColor = '';
        dragDropArea.style.background = '';
        console.log(`dragDropArea${imageNum} lost focus`);
    });
}

// Función global para limpiar imagen IA específica
function clearAIImage(imageNum) {
    currentAIImages[imageNum] = null;

    const aiImageUpload = document.getElementById(`aiImageUpload${imageNum}`);
    const aiPreview = document.getElementById(`aiPreview${imageNum}`);

    if (aiImageUpload) {
        aiImageUpload.value = '';
    }
    if (aiPreview) {
        aiPreview.classList.add('hidden');
        aiPreview.style.display = 'none';
    }

    checkProcessButtonState();
    showMessage(`🗑️ Imagen IA ${imageNum} eliminada`, 'success', false);
}

function handleAIImageUpload(imageNum, file) {
    // Guardar posición del scroll ANTES de hacer cualquier cosa
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        showMessage('Por favor selecciona un archivo de imagen válido', 'error', false);
        return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showMessage('La imagen es demasiado grande. Máximo 10MB', 'error', false);
        return;
    }

    currentAIImages[imageNum] = file;

    // Prevenir scroll durante el proceso
    const preventScroll = () => {
        window.scrollTo(scrollLeft, scrollPosition);
    };
    window.addEventListener('scroll', preventScroll);

    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = function(e) {
        const aiPreview = document.getElementById(`aiPreview${imageNum}`);
        const aiPreviewImage = document.getElementById(`aiPreviewImage${imageNum}`);

        if (aiPreviewImage && aiPreview) {
            aiPreviewImage.src = e.target.result;
            aiPreview.classList.remove('hidden');
            aiPreview.style.display = 'block';
        }

        // Verificar si debe habilitar botones
        checkProcessButtonState();
        checkGenerateButton();

        // Remover prevención de scroll y restaurar posición
        setTimeout(() => {
            window.removeEventListener('scroll', preventScroll);
            window.scrollTo(scrollLeft, scrollPosition);
        }, 100);
    };
    reader.readAsDataURL(file);
}

function checkProcessButtonState() {
    const processBtn = document.getElementById('processWithAI');
    const hasAnyImage = currentAIImages[1] !== null || currentAIImages[2] !== null;
    processBtn.disabled = !hasAnyImage;
}

async function processImageWithAI(event) {
    // Prevenir comportamiento por defecto y scroll
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const hasImage1 = currentAIImages[1] !== null;
    const hasImage2 = currentAIImages[2] !== null;

    if (!hasImage1 && !hasImage2) {
        showMessage('Por favor selecciona al menos una imagen primero', 'error');
        return;
    }

    // Guardar posición del scroll ANTES de cualquier cosa
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const processBtn = document.getElementById('processWithAI');
    const aiService = document.getElementById('aiService').value;

    // Remover foco del botón para prevenir scroll automático
    if (processBtn) {
        processBtn.blur();
    }

    // Cambiar estado del botón
    setAIProcessingState(true);

    // Restaurar scroll inmediatamente
    window.scrollTo(scrollLeft, scrollPosition);

    try {
        const formData = new FormData();
        if (currentAIImages[1]) formData.append('image1', currentAIImages[1]);
        if (currentAIImages[2]) formData.append('image2', currentAIImages[2]);
        formData.append('ai_service', aiService);

        const response = await fetch('/api/process-image-ai', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const aiData = result.data;

            // Guardar posición actual del scroll
            const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            // Prevenir cualquier scroll durante el proceso
            const preventScroll = (e) => {
                window.scrollTo(scrollLeft, scrollPosition);
            };

            // Agregar listener temporal para prevenir scroll
            window.addEventListener('scroll', preventScroll);

            // Mostrar resultados
            showAIResults(aiData);

            // Llenar formulario automáticamente
            fillFormFromAI(aiData);

            // Verificar si debe habilitar el botón de generar explicación
            checkGenerateButton();

            // Mensaje diferenciado según el tipo de respuesta (sin scroll)
            if (aiData.ai_service === 'mock' || aiData.note) {
                showMessage('🧪 Procesado en MODO SIMULADO - Configura API key para IA real', 'error', false);
            } else {
                const serviceName = getServiceDisplayName(aiData.ai_service);
                const imageCount = (hasImage1 ? 1 : 0) + (hasImage2 ? 1 : 0);
                showMessage(`🤖 ¡${serviceName} procesó ${imageCount} imagen(es) exitosamente!`, 'success', false);
            }

            // Remover listener y asegurar posición del scroll después de un momento
            setTimeout(() => {
                window.removeEventListener('scroll', preventScroll);
                window.scrollTo(scrollLeft, scrollPosition);
            }, 100);
        } else {
            throw new Error(result.detail || 'Error procesando imagen');
        }

    } catch (error) {
        console.error('Error procesando imagen:', error);
        showMessage(`❌ Error: ${error.message}`, 'error', false);
    } finally {
        setAIProcessingState(false);
        // Asegurar que se mantenga la posición del scroll
        window.scrollTo(scrollLeft, scrollPosition);
    }
}

function setAIProcessingState(processing) {
    const processBtn = document.getElementById('processWithAI');
    const btnText = processBtn.querySelector('.ai-btn-text');
    const btnLoader = processBtn.querySelector('.ai-btn-loader');
    
    if (processing) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
        processBtn.disabled = true;
    } else {
        btnText.style.display = 'flex';
        btnLoader.style.display = 'none';
        processBtn.disabled = false;
    }
}

function showAIResults(aiData) {
    const aiResults = document.getElementById('aiResults');
    const aiConfidence = document.getElementById('aiConfidence');
    
    // Actualizar confianza
    aiConfidence.textContent = aiData.confianza || 85;
    
    // Crear indicador de estado de IA
    const existingStatus = aiResults.querySelector('.ai-status-indicator');
    if (existingStatus) existingStatus.remove();
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'ai-status-indicator';
    
    if (aiData.ai_service === 'mock' || aiData.note) {
        // Respuesta simulada
        statusDiv.innerHTML = `
            <div class="status-badge simulated">
                🧪 MODO SIMULADO
            </div>
            <p><strong>⚠️ Usando respuesta de prueba</strong> - Para usar IA real, verifica tu API key de ${document.getElementById('aiService').value}</p>
        `;
        statusDiv.classList.add('rounded-2xl', 'border', 'border-amber-200', 'bg-amber-50');
    } else {
        // IA real
        const serviceName = getServiceDisplayName(aiData.ai_service);
        statusDiv.innerHTML = `
            <div class="status-badge real">
                🤖 IA REAL ACTIVA
            </div>
            <p><strong>✅ ${serviceName} analizó tu imagen</strong> - Resultado basado en procesamiento real</p>
        `;
        statusDiv.classList.add('rounded-2xl', 'border', 'border-emerald-200', 'bg-emerald-50');
    }
    statusDiv.classList.add('px-4', 'py-3', 'text-center', 'mb-4');
    const badge = statusDiv.querySelector('.status-badge');
    if (badge) {
        badge.classList.add('inline-flex', 'items-center', 'justify-center', 'rounded-full', 'px-3', 'py-1', 'text-xs', 'font-semibold', 'tracking-wide');
        if (badge.classList.contains('simulated')) {
            badge.classList.add('bg-amber-500', 'text-white');
        } else {
            badge.classList.add('bg-emerald-500', 'text-white');
        }
    }
    const statusText = statusDiv.querySelector('p');
    if (statusText) {
        statusText.classList.add('mt-2', 'text-xs', 'text-slate-700');
    }

    aiResults.insertBefore(statusDiv, aiResults.firstChild);
    aiResults.classList.remove('hidden');
    aiResults.style.display = 'block';

    // No hacer scroll automático - mantener al usuario en la sección actual
}

function getServiceDisplayName(service) {
    const names = {
        'openai': 'OpenAI GPT-4 Vision',
        'gemini': 'Google Gemini Pro Vision',
        'claude': 'Anthropic Claude Vision',
        'azure': 'Azure OpenAI Vision',
        'mock': 'Simulador'
    };
    return names[service] || 'IA Desconocida';
}

function fillFormFromAI(aiData) {
    // Prevenir scroll automático al llenar campos
    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    // Llenar campos del formulario sin disparar validaciones
    if (aiData.materia) {
        const materiaSelect = document.getElementById('materia');
        materiaSelect.value = aiData.materia;
        clearFieldError(materiaSelect);
    }

    if (aiData.tema) {
        const temaField = document.getElementById('tema');
        temaField.value = aiData.tema;
        clearFieldError(temaField);
    }

    if (aiData.pregunta) {
        const preguntaField = document.getElementById('pregunta');
        preguntaField.value = aiData.pregunta;
        updateMathPreview('pregunta');
        autoResize.call(preguntaField);
        clearFieldError(preguntaField);
    }

    // Llenar opciones
    const opciones = aiData.opciones || {};
    ['A', 'B', 'C', 'D', 'E'].forEach(letra => {
        const campo = `opcion_${letra.toLowerCase()}`;
        const field = document.getElementById(campo);
        if (field && opciones[letra]) {
            field.value = opciones[letra];
            updateMathPreview(campo);
            autoResize.call(field);
            clearFieldError(field);
        }
    });

    // Limpiar respuesta correcta y explicación para evitar residuos de preguntas anteriores
    const respuestaField = document.getElementById('respuesta_correcta');
    if (respuestaField) {
        respuestaField.value = '';
        clearFieldError(respuestaField);
    }

    const explicacionField = document.getElementById('explicacion');
    if (explicacionField) {
        explicacionField.value = '';
        updateMathPreview('explicacion');
        autoResize.call(explicacionField);
        clearFieldError(explicacionField);
    }

    if (aiData.dificultad) {
        const dificultadField = document.getElementById('dificultad');
        dificultadField.value = aiData.dificultad;
        clearFieldError(dificultadField);
    }

    // Restaurar scroll behavior
    document.documentElement.style.scrollBehavior = originalScrollBehavior;

    // Limpiar errores de validación
    clearAllMessages();

    // Mostrar nota si es respuesta simulada
    if (aiData.note) {
        showMessage(`ℹ️ ${aiData.note}`, 'error', false);
    }
}

function clearMathPreviews() {
    const fields = ['pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d', 'opcion_e', 'explicacion'];
    fields.forEach(fieldId => {
        const preview = document.getElementById(`${fieldId}-preview`);
        if (preview) {
            preview.innerHTML = '';
        }
    });
}

// Función para reiniciar captura de IA
function resetAICapture() {
    currentAIImages = {1: null, 2: null};

    for (let i = 1; i <= 2; i++) {
        const aiPreview = document.getElementById(`aiPreview${i}`);
        const aiImageUpload = document.getElementById(`aiImageUpload${i}`);

        if (aiPreview) {
            aiPreview.classList.add('hidden');
            aiPreview.style.display = 'none';
        }
        if (aiImageUpload) {
            aiImageUpload.value = '';
        }
    }

    const aiResults = document.getElementById('aiResults');
    if (aiResults) {
        aiResults.classList.add('hidden');
        aiResults.style.display = 'none';
    }

    const processBtn = document.getElementById('processWithAI');
    if (processBtn) {
        processBtn.disabled = true;
    }
}

// ======= GUÍA LATEX =======

function toggleLatexGuide() {
    const examples = document.getElementById('latexExamples');
    const header = document.getElementById('latexHeaderText');

    if (examples.classList.contains('hidden')) {
        examples.classList.remove('hidden');
        if (header) {
            header.textContent = '💡 Guía LaTeX (clic para ocultar)';
        }
    } else {
        examples.classList.add('hidden');
        if (header) {
            header.textContent = '💡 Guía LaTeX (clic para ver ejemplos)';
        }
    }
}

// ======= EXPLICACIÓN CON IA =======

let solutionImages = {1: null, 2: null, 3: null};

function setupExplanationAI() {
    // Setup file inputs
    for (let i = 1; i <= 3; i++) {
        const input = document.getElementById(`solutionImage${i}`);
        if (input) {
            input.addEventListener('change', (e) => handleSolutionImageUpload(i, e.target.files[0]));
        }
    }

    // Setup mode selectors
    const modeFromQuestion = document.getElementById('modeFromQuestion');
    const modeFromSolution = document.getElementById('modeFromSolution');
    const solutionImagesSection = document.getElementById('solutionImagesSection');

    if (modeFromQuestion && modeFromSolution) {
        modeFromQuestion.addEventListener('change', function() {
            if (this.checked) {
                solutionImagesSection.style.display = 'none';
                checkGenerateButton();
            }
        });

        modeFromSolution.addEventListener('change', function() {
            if (this.checked) {
                solutionImagesSection.style.display = 'block';
                checkGenerateButton();
            }
        });
    }

    // Setup generate button
    const generateBtn = document.getElementById('generateExplanation');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateExplanationWithAI);
    }
}

function toggleExplanationAI(event) {
    const checkbox = document.getElementById('useAIExplanation');
    const uploadSection = document.getElementById('aiExplanationUpload');
    const explanationSection = document.querySelector('.explanation-ai-section');

    if (event && event.target !== checkbox && event.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
    }

    if (checkbox.checked) {
        uploadSection.classList.remove('hidden');
        uploadSection.style.display = 'block';
        explanationSection.classList.add('active', 'border-slate-400', 'bg-white');
        // Verificar si debe habilitar el botón
        checkGenerateButton();
    } else {
        uploadSection.classList.add('hidden');
        uploadSection.style.display = 'none';
        explanationSection.classList.remove('active', 'border-slate-400', 'bg-white');
        // Limpiar imágenes
        for (let i = 1; i <= 3; i++) {
            clearSolutionImage(i);
        }
    }
}

function handleSolutionImageUpload(index, file) {
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        showMessage('Solo se permiten archivos de imagen', 'error');
        return;
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('La imagen es demasiado grande. Máximo 5MB', 'error');
        return;
    }
    
    solutionImages[index] = file;
    
    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById(`solutionPreview${index}`);
        preview.innerHTML = `<img src="${e.target.result}" alt="Solución ${index}">`;
        preview.classList.remove('hidden');
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // Verificar si se puede habilitar el botón de generar
    checkGenerateButton();
}

function clearSolutionImage(index) {
    solutionImages[index] = null;
    document.getElementById(`solutionImage${index}`).value = '';
    const preview = document.getElementById(`solutionPreview${index}`);
    preview.innerHTML = '';
    preview.classList.add('hidden');
    preview.style.display = 'none';
    checkGenerateButton();
}

function checkGenerateButton() {
    const generateBtn = document.getElementById('generateExplanation');
    const modeFromQuestion = document.getElementById('modeFromQuestion');
    const modeFromSolution = document.getElementById('modeFromSolution');

    if (!generateBtn) return;

    // Si está en modo "desde pregunta", habilitado si hay al menos una imagen de pregunta
    if (modeFromQuestion && modeFromQuestion.checked) {
        const hasAnyAIImage = currentAIImages[1] !== null || currentAIImages[2] !== null;
        generateBtn.disabled = !hasAnyAIImage;
        return;
    }

    // Si está en modo "desde solución", requiere al menos una imagen de solución
    if (modeFromSolution && modeFromSolution.checked) {
        const hasImages = Object.values(solutionImages).some(img => img !== null);
        generateBtn.disabled = !hasImages;
    }
}

async function generateExplanationWithAI(event) {
    // Prevenir comportamiento por defecto y scroll
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Guardar posición del scroll
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const generateBtn = document.getElementById('generateExplanation');
    const pregunta = document.getElementById('pregunta').value;
    const respuestaCorrecta = document.getElementById('respuesta_correcta').value;
    const modeFromQuestion = document.getElementById('modeFromQuestion');

    if (!pregunta) {
        showMessage('Completa la pregunta antes de generar la explicación', 'error', false);
        return;
    }

    if (!respuestaCorrecta) {
        showMessage('Selecciona la respuesta correcta antes de generar la explicación', 'error', false);
        return;
    }

    // Remover foco del botón para prevenir scroll automático
    if (generateBtn) {
        generateBtn.blur();
    }

    // Cambiar estado del botón
    setGenerateExplanationState(true);

    // Restaurar scroll
    window.scrollTo(scrollLeft, scrollPosition);

    try {
        const formData = new FormData();
        formData.append('ai_service', 'gemini');
        formData.append('pregunta', pregunta);
        formData.append('respuesta_correcta', respuestaCorrecta);

        // Determinar modo y añadir datos correspondientes
        if (modeFromQuestion && modeFromQuestion.checked) {
            // Modo: desde imagen de pregunta
            const hasAnyAIImage = currentAIImages[1] !== null || currentAIImages[2] !== null;
            if (!hasAnyAIImage) {
                showMessage('Primero debes procesar al menos una imagen de pregunta con IA', 'error');
                setGenerateExplanationState(false);
                return;
            }
            formData.append('mode', 'from_question');
            if (currentAIImages[1]) formData.append('question_image1', currentAIImages[1]);
            if (currentAIImages[2]) formData.append('question_image2', currentAIImages[2]);
        } else {
            // Modo: desde imágenes de solución
            formData.append('mode', 'from_solution');
            if (solutionImages[1]) formData.append('solution_image1', solutionImages[1]);
            if (solutionImages[2]) formData.append('solution_image2', solutionImages[2]);
            if (solutionImages[3]) formData.append('solution_image3', solutionImages[3]);
        }

        const response = await fetch('/api/generate-explanation', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Llenar el campo de explicación
            const explicacionField = document.getElementById('explicacion');
            explicacionField.value = result.explanation;
            updateMathPreview('explicacion');
            autoResize.call(explicacionField);

            showMessage('✨ ¡Explicación generada exitosamente!', 'success', false);

            // Scroll al campo de explicación SOLO cuando se genera exitosamente
            // (en este caso SÍ queremos que vea el resultado)
            setTimeout(() => {
                explicacionField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            throw new Error(result.detail || 'Error generando explicación');
        }

    } catch (error) {
        console.error('Error generando explicación:', error);
        showMessage(`❌ Error: ${error.message}`, 'error', false);
    } finally {
        setGenerateExplanationState(false);
    }
}

function setGenerateExplanationState(generating) {
    const generateBtn = document.getElementById('generateExplanation');
    const btnText = generateBtn.querySelector('.gen-btn-text');
    const btnLoader = generateBtn.querySelector('.gen-btn-loader');

    if (generating) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
        generateBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        checkGenerateButton(); // Restaurar estado basado en imágenes
    }
}

// ======= SELECTORES DE PROCESO =======

function setupProcesoSelectors() {
    const tipoClasificacion = document.getElementById('tipo_clasificacion');
    const procesoSection = document.getElementById('proceso_section');
    const anioSelect = document.getElementById('anio');
    const tipoProceso = document.getElementById('tipo_proceso');
    const faseContainer = document.getElementById('fase_container');
    const examenContainer = document.getElementById('examen_container');
    const faseSelect = document.getElementById('fase');
    const examenSelect = document.getElementById('examen');

    // Si no existen los elementos necesarios, salir
    if (!tipoClasificacion || !procesoSection || !anioSelect || !tipoProceso) return;

    // Función para obtener configuración de exámenes según el año
    const getExamenesConfig = (anio) => {
        const anioNum = parseInt(anio);
        // A partir de 2025 solo hay "examen" sin número
        return anioNum >= 2025 ? ['examen'] : ['1er examen', '2do examen'];
    };

    // Configuración base por tipo de proceso
    const getProcesoConfig = (tipoProceso, anio) => {
        const configs = {
            'extraordinario': {
                hasFase: false,
                hasExamen: false
            },
            'ceprunsa': {
                hasFase: true,
                fases: ['I FASE', 'II FASE'],
                hasExamen: true,
                examenes: getExamenesConfig(anio)
            },
            'ceprequintos': {
                hasFase: false,  // CEPREQUINTOS siempre sin fase
                hasExamen: true,
                examenes: getExamenesConfig(anio)
            },
            'ordinario': {
                hasFase: true,
                fases: ['I FASE', 'II FASE'],
                hasExamen: false
            }
        };

        return configs[tipoProceso];
    };

    // Manejar selección de tipo de clasificación
    const areaAcademica = document.getElementById('area_academica');

    tipoClasificacion.addEventListener('change', function() {
        const clasificacion = this.value;

        if (clasificacion === 'proceso') {
            // Mostrar sección de proceso
            procesoSection.classList.remove('hidden');
            procesoSection.style.display = 'block';
            areaAcademica.required = true;
            anioSelect.required = true;
            tipoProceso.required = true;
        } else if (clasificacion === 'normal') {
            // Ocultar sección de proceso
            procesoSection.classList.add('hidden');
            procesoSection.style.display = 'none';
            areaAcademica.required = false;
            anioSelect.required = false;
            tipoProceso.required = false;
            faseSelect.required = false;
            examenSelect.required = false;

            // Resetear campos de proceso
            areaAcademica.value = '';
            anioSelect.value = '';
            tipoProceso.value = '';
            faseSelect.value = '';
            examenSelect.value = '';
            faseContainer.classList.add('hidden');
            examenContainer.classList.add('hidden');
            faseContainer.style.display = 'none';
            examenContainer.style.display = 'none';
        }
    });

    // Función para actualizar selectores de fase/examen
    const updateProcesoSelectors = () => {
        const selectedProceso = tipoProceso.value;
        const selectedAnio = anioSelect.value;

        // Resetear campos
        faseSelect.innerHTML = '<option value="">Selecciona fase</option>';
        examenSelect.innerHTML = '<option value="">Selecciona examen</option>';
        faseContainer.style.display = 'none';
        examenContainer.style.display = 'none';
        faseContainer.classList.add('hidden');
        examenContainer.classList.add('hidden');
        faseSelect.required = false;
        examenSelect.required = false;
        faseSelect.value = '';
        examenSelect.value = '';

        if (!selectedProceso || !selectedAnio) {
            return;
        }

        const config = getProcesoConfig(selectedProceso, selectedAnio);

        if (!config) {
            return;
        }

        // Mostrar selector de fase si aplica
        if (config.hasFase && config.fases) {
            faseContainer.classList.remove('hidden');
            faseContainer.style.display = 'block';
            faseSelect.required = true;
            config.fases.forEach(fase => {
                const option = document.createElement('option');
                option.value = fase;
                option.textContent = fase;
                faseSelect.appendChild(option);
            });
        }

        // Mostrar selector de examen si aplica
        if (config.hasExamen && config.examenes) {
            examenContainer.classList.remove('hidden');
            examenContainer.style.display = 'block';
            examenSelect.required = true;
            config.examenes.forEach(examen => {
                const option = document.createElement('option');
                option.value = examen;
                option.textContent = examen;
                examenSelect.appendChild(option);
            });
        }
    };

    // Manejar cambios en tipo de proceso o año
    tipoProceso.addEventListener('change', updateProcesoSelectors);
    anioSelect.addEventListener('change', updateProcesoSelectors);
}

// ======= CARGAR DESDE JSON (PREGUNTAS NORMALES) =======

// Configurar el botón de cargar JSON para preguntas normales
document.addEventListener('DOMContentLoaded', function() {
    const cargarBtn = document.getElementById('cargarDesdeJSONNormal');
    if (cargarBtn) {
        cargarBtn.addEventListener('click', cargarDesdeJSONNormal);
    }
});

function toggleNormalJsonExample() {
    const example = document.getElementById('normalJsonExample');
    if (example && example.classList.contains('hidden')) {
        example.classList.remove('hidden');
    } else if (example) {
        example.classList.add('hidden');
    }
}

function cargarDesdeJSONNormal() {
    const jsonInput = document.getElementById('normalJsonInput');
    if (!jsonInput) return;

    const jsonText = jsonInput.value.trim();
    if (!jsonText) {
        showMessage('Por favor pega el JSON primero', 'error');
        return;
    }

    const sanitizeJsonInput = (text) => {
        let result = '';
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (escapeNext) {
                result += char;
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                result += char;
                escapeNext = true;
                continue;
            }

            if (char === '"') {
                if (!inString) {
                    inString = true;
                    result += char;
                    continue;
                }

                let j = i + 1;
                while (j < text.length && /\s/.test(text[j])) j++;
                const next = text[j];
                const isClosing = next === ',' || next === '}' || next === ']' || next === '\n' || next === '\r';

                if (isClosing) {
                    inString = false;
                    result += char;
                } else {
                    result += '\\"';
                }
                continue;
            }

            result += char;
        }

        return result;
    };

    try {
        let data;
        try {
            data = JSON.parse(jsonText);
        } catch (parseError) {
            const sanitized = sanitizeJsonInput(jsonText);
            data = JSON.parse(sanitized);
            showMessage('⚠️ Se auto-escaparon comillas internas en el JSON', 'success');
        }

        // Validar estructura básica
        if (!data.pregunta || !data.opciones) {
            throw new Error('El JSON debe contener al menos "pregunta" y "opciones"');
        }

        // Validar que opciones sea un objeto con A, B, C, D, E
        const opcionesRequeridas = ['A', 'B', 'C', 'D', 'E'];
        const opcionesPresentes = Object.keys(data.opciones);
        const faltanOpciones = opcionesRequeridas.filter(op => !opcionesPresentes.includes(op));

        if (faltanOpciones.length > 0) {
            throw new Error(`Faltan opciones: ${faltanOpciones.join(', ')}`);
        }

        // Limpiar mensajes de error previos
        clearAllMessages();

        // Llenar formulario
        // 1. Materia
        if (data.materia) {
            const materiaSelect = document.getElementById('materia');
            materiaSelect.value = data.materia;
            clearFieldError(materiaSelect);
        }

        // 2. Tema
        if (data.tema) {
            const temaField = document.getElementById('tema');
            temaField.value = data.tema;
            clearFieldError(temaField);
        }

        // 3. Pregunta
        const preguntaField = document.getElementById('pregunta');
        preguntaField.value = data.pregunta;
        updateMathPreview('pregunta');
        autoResize.call(preguntaField);
        clearFieldError(preguntaField);

        // 4. Opciones
        ['A', 'B', 'C', 'D', 'E'].forEach(letra => {
            const campo = `opcion_${letra.toLowerCase()}`;
            const field = document.getElementById(campo);
            if (field && data.opciones[letra]) {
                field.value = data.opciones[letra];
                updateMathPreview(campo);
                autoResize.call(field);
                clearFieldError(field);
            }
        });

        // 5. Respuesta correcta
        if (data.respuesta_correcta) {
            const respuestaField = document.getElementById('respuesta_correcta');
            respuestaField.value = data.respuesta_correcta;
            clearFieldError(respuestaField);
        }

        // 6. Explicación
        if (data.explicacion) {
            const explicacionField = document.getElementById('explicacion');
            explicacionField.value = data.explicacion;
            updateMathPreview('explicacion');
            autoResize.call(explicacionField);
            clearFieldError(explicacionField);
        }

        // 7. Dificultad
        if (data.dificultad) {
            const dificultadField = document.getElementById('dificultad');
            dificultadField.value = data.dificultad;
            clearFieldError(dificultadField);
        }

        showMessage('✅ JSON cargado exitosamente - Revisa y completa los campos restantes', 'success');

        // Scroll al inicio del formulario
        setTimeout(() => {
            const preguntaSection = document.querySelector('#preguntaForm .space-y-6');
            if (preguntaSection) {
                preguntaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);

    } catch (error) {
        console.error('Error parsing JSON:', error);
        showMessage(`❌ Error al cargar JSON: ${error.message}`, 'error');
    }
}
