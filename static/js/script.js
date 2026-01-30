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
    dificultad.addEventListener('change', function() {
        const value = parseInt(this.value);
        if (value < 1 || value > 5) {
            showFieldError(this, 'La dificultad debe estar entre 1 y 5');
        }
    });
    
    // Validar imagen
    const imagen = document.getElementById('imagen');
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

function setupFormSubmission() {
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
    resetBtn.addEventListener('click', function() {
        if (confirm('¿Estás seguro de que deseas limpiar todos los campos?')) {
            form.reset();
            clearAllMessages();
            hideJsonPreview();

            // Ocultar sección de proceso
            document.getElementById('proceso_section').style.display = 'none';
            document.getElementById('fase_container').style.display = 'none';
            document.getElementById('examen_container').style.display = 'none';

            // Resetear required de campos de proceso
            document.getElementById('area_academica').required = false;
            document.getElementById('anio').required = false;
            document.getElementById('tipo_proceso').required = false;
            document.getElementById('fase').required = false;
            document.getElementById('examen').required = false;

            // Auto-resize de textareas después del reset
            const textareas = document.querySelectorAll('textarea');
            textareas.forEach(textarea => {
                autoResize.call(textarea);
            });
        }
    });
}

function setupImagePreview() {
    const imagen = document.getElementById('imagen');
    imagen.addEventListener('change', function() {
        const preview = document.getElementById('imagePreview');
        if (preview) preview.remove();
        
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const previewDiv = document.createElement('div');
                previewDiv.id = 'imagePreview';
                previewDiv.innerHTML = `
                    <div style="margin-top: 10px;">
                        <img src="${e.target.result}" alt="Vista previa" 
                             style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #e9ecef;">
                    </div>
                `;
                imagen.parentNode.appendChild(previewDiv);
            };
            
            reader.readAsDataURL(file);
        }
    });
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
            
            // Opcional: limpiar formulario después del éxito
            setTimeout(() => {
                if (confirm('¿Deseas crear otra pregunta?')) {
                    form.reset();
                    hideJsonPreview();
                    clearAllMessages();
                }
            }, 2000);
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
    mensaje.className = `mensaje ${type}`;
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
        imagen: pregunta.imagen
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
    jsonPreview.style.display = 'block';

    // Scroll suave hacia la vista previa
    jsonPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideJsonPreview() {
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

let currentAIImage = null;

function setupAICapture() {
    const dragDropArea = document.getElementById('dragDropArea');
    const aiImageUpload = document.getElementById('aiImageUpload');
    const processBtn = document.getElementById('processWithAI');
    const aiPreview = document.getElementById('aiPreview');
    const aiPreviewImage = document.getElementById('aiPreviewImage');

    // Drag and Drop
    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.classList.add('dragover');
    });

    dragDropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('dragover');
    });

    dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDropArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleAIImageUpload(files[0]);
        }

        // Remover foco del área para prevenir scroll
        dragDropArea.blur();
    });

    // File input change
    aiImageUpload.addEventListener('change', (e) => {
        e.preventDefault();
        if (e.target.files.length > 0) {
            handleAIImageUpload(e.target.files[0]);
        }
        // Remover foco del input para prevenir scroll
        e.target.blur();
    });

    // Hacer el área contentEditable para capturar paste más fácilmente
    dragDropArea.setAttribute('contenteditable', 'true');
    dragDropArea.style.cursor = 'pointer';
    dragDropArea.style.caretColor = 'transparent'; // Ocultar cursor de texto
    dragDropArea.style.outline = 'none'; // Quitar borde de foco

    // Prevenir que se escriba texto en el área
    dragDropArea.addEventListener('keydown', (e) => {
        if (e.key !== 'v' || (!e.ctrlKey && !e.metaKey)) {
            e.preventDefault();
        }
    });

    // Prevenir selección de texto
    dragDropArea.addEventListener('mousedown', (e) => {
        if (e.detail > 1) { // Prevenir doble/triple click
            e.preventDefault();
        }
    });

    // Paste from clipboard
    dragDropArea.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Paste event detected');

        const items = e.clipboardData?.items;
        console.log('Clipboard items:', items);

        if (!items) {
            console.log('No clipboard items found');
            showMessage('No se detectó contenido en el portapapeles', 'error', false);
            return;
        }

        let imageFound = false;

        // Buscar imagen en el portapapeles
        for (let i = 0; i < items.length; i++) {
            console.log(`Item ${i}:`, items[i].type);

            if (items[i].type.startsWith('image/')) {
                imageFound = true;
                const file = items[i].getAsFile();
                console.log('Image file:', file);

                if (file) {
                    handleAIImageUpload(file);
                    showMessage('📋 Imagen pegada desde el portapapeles', 'success', false);
                } else {
                    showMessage('Error al obtener la imagen del portapapeles', 'error', false);
                }
                break;
            }
        }

        if (!imageFound) {
            console.log('No image found in clipboard');
            showMessage('No se encontró ninguna imagen en el portapapeles. Copia una imagen primero.', 'error', false);
        }
    });

    // Hacer el área enfocable
    dragDropArea.setAttribute('tabindex', '0');

    // Mensaje de ayuda al hacer clic
    dragDropArea.addEventListener('click', () => {
        dragDropArea.focus();
        console.log('Drag-drop area focused. Ready for paste.');
    });

    // Process button
    processBtn.addEventListener('click', processImageWithAI);
}

function handleAIImageUpload(file) {
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

    currentAIImage = file;

    // Prevenir scroll durante el proceso
    const preventScroll = () => {
        window.scrollTo(scrollLeft, scrollPosition);
    };
    window.addEventListener('scroll', preventScroll);

    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = function(e) {
        const aiPreview = document.getElementById('aiPreview');
        const aiPreviewImage = document.getElementById('aiPreviewImage');

        aiPreviewImage.src = e.target.result;
        aiPreview.style.display = 'block';

        // Habilitar botón de procesar
        document.getElementById('processWithAI').disabled = false;

        // Verificar si debe habilitar el botón de generar explicación
        checkGenerateButton();

        // Remover prevención de scroll y restaurar posición
        setTimeout(() => {
            window.removeEventListener('scroll', preventScroll);
            window.scrollTo(scrollLeft, scrollPosition);
        }, 100);
    };
    reader.readAsDataURL(file);
}

async function processImageWithAI(event) {
    // Prevenir comportamiento por defecto y scroll
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (!currentAIImage) {
        showMessage('Por favor selecciona una imagen primero', 'error');
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
        formData.append('image', currentAIImage);
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
                showMessage(`🤖 ¡${serviceName} procesó tu imagen exitosamente!`, 'success', false);
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
        statusDiv.style.background = 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)';
        statusDiv.style.border = '2px solid #ffc107';
    } else {
        // IA real
        const serviceName = getServiceDisplayName(aiData.ai_service);
        statusDiv.innerHTML = `
            <div class="status-badge real">
                🤖 IA REAL ACTIVA
            </div>
            <p><strong>✅ ${serviceName} analizó tu imagen</strong> - Resultado basado en procesamiento real</p>
        `;
        statusDiv.style.background = 'linear-gradient(135deg, #d4edda 0%, #b8e6c1 100%)';
        statusDiv.style.border = '2px solid #28a745';
    }
    
    statusDiv.style.padding = '15px';
    statusDiv.style.borderRadius = '8px';
    statusDiv.style.marginBottom = '15px';
    statusDiv.style.textAlign = 'center';

    aiResults.insertBefore(statusDiv, aiResults.firstChild);
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

    // NO llenar respuesta correcta ni explicación - el usuario las completará manualmente
    // if (aiData.respuesta_correcta) {
    //     document.getElementById('respuesta_correcta').value = aiData.respuesta_correcta;
    // }

    // if (aiData.explicacion) {
    //     const explicacionField = document.getElementById('explicacion');
    //     explicacionField.value = aiData.explicacion;
    //     updateMathPreview('explicacion');
    //     autoResize.call(explicacionField);
    // }

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

// Función para reiniciar captura de IA
function resetAICapture() {
    currentAIImage = null;
    document.getElementById('aiPreview').style.display = 'none';
    document.getElementById('aiResults').style.display = 'none';
    document.getElementById('processWithAI').disabled = true;
    document.getElementById('aiImageUpload').value = '';
}

// ======= GUÍA LATEX =======

function toggleLatexGuide() {
    const examples = document.getElementById('latexExamples');
    const header = document.querySelector('.latex-header small');
    
    if (examples.style.display === 'none') {
        examples.style.display = 'block';
        header.innerHTML = '💡 <strong>Guía LaTeX (clic para ocultar)</strong> ▲';
    } else {
        examples.style.display = 'none';
        header.innerHTML = '💡 <strong>Guía LaTeX (clic para ver ejemplos)</strong> ▼';
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

function toggleExplanationAI() {
    const checkbox = document.getElementById('useAIExplanation');
    const uploadSection = document.getElementById('aiExplanationUpload');
    const explanationSection = document.querySelector('.explanation-ai-section');

    if (checkbox.checked) {
        uploadSection.style.display = 'block';
        explanationSection.classList.add('active');
        // Verificar si debe habilitar el botón
        checkGenerateButton();
    } else {
        uploadSection.style.display = 'none';
        explanationSection.classList.remove('active');
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
    preview.style.display = 'none';
    checkGenerateButton();
}

function checkGenerateButton() {
    const generateBtn = document.getElementById('generateExplanation');
    const modeFromQuestion = document.getElementById('modeFromQuestion');
    const modeFromSolution = document.getElementById('modeFromSolution');

    // Si está en modo "desde pregunta", siempre habilitado si hay imagen de pregunta
    if (modeFromQuestion && modeFromQuestion.checked) {
        generateBtn.disabled = !currentAIImage;
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
            if (!currentAIImage) {
                showMessage('Primero debes procesar una imagen de pregunta con IA', 'error');
                setGenerateExplanationState(false);
                return;
            }
            formData.append('mode', 'from_question');
            formData.append('question_image', currentAIImage);
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
            procesoSection.style.display = 'block';
            areaAcademica.required = true;
            anioSelect.required = true;
            tipoProceso.required = true;
        } else if (clasificacion === 'normal') {
            // Ocultar sección de proceso
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