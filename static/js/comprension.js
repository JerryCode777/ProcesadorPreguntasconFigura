// ========================================
// SISTEMA DE PESTAÑAS
// ========================================

function switchTab(tabName) {
    // Cambiar estilo de los botones
    const tabNormal = document.getElementById('tabNormal');
    const tabComprension = document.getElementById('tabComprension');

    if (tabName === 'normal') {
        tabNormal.className = 'flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800';
        tabComprension.className = 'flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200';

        // Mostrar/ocultar formularios
        document.getElementById('preguntaForm').classList.remove('hidden');
        document.getElementById('comprensionForm').classList.add('hidden');
    } else {
        tabNormal.className = 'flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200';
        tabComprension.className = 'flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800';

        // Mostrar/ocultar formularios
        document.getElementById('preguntaForm').classList.add('hidden');
        document.getElementById('comprensionForm').classList.remove('hidden');
    }
}

// ========================================
// FORMULARIO DE COMPRENSIÓN - VARIABLES GLOBALES
// ========================================

let tipoComprensionActual = null;
let numPreguntasRequeridas = 0;
let textoModoActual = 'imagen'; // 'imagen' o 'directo'
let preguntasExtraidas = [];

// ========================================
// TOGGLE ENTRE IMAGEN Y TEXTO DIRECTO
// ========================================

function toggleTextoMode(mode) {
    textoModoActual = mode;

    const btnImagen = document.getElementById('toggleTextoImagen');
    const btnDirecto = document.getElementById('toggleTextoDirecto');
    const areaImagen = document.getElementById('textoImagenArea');
    const areaDirecto = document.getElementById('textoDirectoArea');
    const aiService = document.getElementById('aiServiceTexto');

    if (mode === 'imagen') {
        // Estilo de botones
        btnImagen.className = 'flex-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm';
        btnDirecto.className = 'flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600';

        // Mostrar/ocultar áreas
        areaImagen.classList.remove('hidden');
        areaDirecto.classList.add('hidden');
        aiService.classList.remove('hidden');
    } else {
        // Estilo de botones
        btnImagen.className = 'flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600';
        btnDirecto.className = 'flex-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm';

        // Mostrar/ocultar áreas
        areaImagen.classList.add('hidden');
        areaDirecto.classList.remove('hidden');
        aiService.classList.add('hidden');
    }
}

// ========================================
// MANEJO DE IMAGEN DEL TEXTO
// ========================================

function clearTextoImagen() {
    document.getElementById('imagenTexto').value = '';
    document.getElementById('textoImagenPreview').classList.add('hidden');
    document.getElementById('procesarTextoIA').disabled = true;
}

// Setup drag & drop y preview para imagen del texto
document.addEventListener('DOMContentLoaded', () => {
    // Auto-resize para textarea de texto de comprensión
    const textoComprension = document.getElementById('textoComprension');
    if (textoComprension) {
        textoComprension.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 600) + 'px';
        });
    }

    const inputTexto = document.getElementById('imagenTexto');
    const dropArea = document.getElementById('textoDropArea');
    const preview = document.getElementById('textoImagenPreview');
    const previewImg = document.getElementById('textoImagenPreviewImg');

    if (!inputTexto || !dropArea) return;

    // Hacer el área enfocable para paste
    dropArea.setAttribute('tabindex', '0');
    dropArea.style.outline = 'none';
    dropArea.style.cursor = 'pointer';

    // Cambio de archivo
    inputTexto.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
                document.getElementById('procesarTextoIA').disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });

    // Drag & drop
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('border-slate-500', 'bg-white');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('border-slate-500', 'bg-white');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('border-slate-500', 'bg-white');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            inputTexto.files = dataTransfer.files;
            inputTexto.dispatchEvent(new Event('change'));
        }
    });

    // Paste
    dropArea.addEventListener('paste', (e) => {
        console.log('Paste event en textoDropArea', e);
        e.preventDefault();
        e.stopPropagation();

        const items = e.clipboardData?.items;
        if (!items) {
            mostrarMensaje('No se detectó contenido en el portapapeles', 'error');
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
                    inputTexto.files = dataTransfer.files;
                    inputTexto.dispatchEvent(new Event('change'));
                    mostrarMensaje('📋 Imagen del texto pegada desde el portapapeles', 'success');
                } else {
                    mostrarMensaje('Error al obtener la imagen del portapapeles', 'error');
                }
                return;
            }
        }

        mostrarMensaje('No se encontró ninguna imagen. Copia una imagen primero.', 'error');
    });

    // Click enfoca el área
    dropArea.addEventListener('click', (e) => {
        e.stopPropagation();
        dropArea.focus();
        console.log('textoDropArea focused');
    });

    // Indicador visual cuando tiene foco
    dropArea.addEventListener('focus', () => {
        dropArea.style.borderColor = '#10b981';
        dropArea.style.background = '#ecfdf5';
        console.log('textoDropArea gained focus');
    });

    dropArea.addEventListener('blur', () => {
        dropArea.style.borderColor = '';
        dropArea.style.background = '';
        console.log('textoDropArea lost focus');
    });
});

// ========================================
// TIPO DE COMPRENSIÓN - GENERAR CAMPOS DINÁMICOS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const tipoSelect = document.getElementById('tipo_comprension');

    tipoSelect.addEventListener('change', (e) => {
        const tipo = e.target.value;
        tipoComprensionActual = tipo;

        // Determinar número de preguntas
        if (tipo === 'comprension_lectora_i' || tipo === 'comprension_ingles') {
            numPreguntasRequeridas = 2;
        } else if (tipo === 'comprension_lectora_ii') {
            numPreguntasRequeridas = 3;
        } else {
            numPreguntasRequeridas = 0;
        }

        // Actualizar info
        const infoElement = document.getElementById('num_preguntas_info');
        if (numPreguntasRequeridas > 0) {
            infoElement.textContent = `Este tipo requiere ${numPreguntasRequeridas} preguntas`;
            infoElement.classList.remove('text-slate-500');
            infoElement.classList.add('text-emerald-600', 'font-semibold');

            // Generar campos de upload
            generarCamposPreguntas(numPreguntasRequeridas);
        } else {
            infoElement.textContent = 'Selecciona el tipo para ver el número de preguntas';
            infoElement.classList.remove('text-emerald-600', 'font-semibold');
            infoElement.classList.add('text-slate-500');
        }
    });
});

function generarCamposPreguntas(numPreguntas) {
    const container = document.getElementById('preguntasImagenesContainer');
    container.innerHTML = '';

    for (let i = 1; i <= numPreguntas; i++) {
        const div = document.createElement('div');
        div.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-4';
        div.innerHTML = `
            <div class="flex items-center justify-between">
                <label class="text-sm font-semibold text-slate-700">Pregunta ${i}:</label>
                <span class="text-xs text-slate-500">Imagen requerida</span>
            </div>
            <div class="mt-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-3 py-6 text-center cursor-pointer hover:border-slate-500"
                 id="preguntaDropArea${i}"
                 title="Haz clic aquí y luego presiona Ctrl+V para pegar una imagen"
                 onclick="document.getElementById('imagenPregunta${i}').click()">
                <div class="text-2xl">${i}️⃣</div>
                <p class="mt-1 text-xs text-slate-600">👆 Clic + Ctrl+V</p>
                <input type="file" id="imagenPregunta${i}" accept="image/*" hidden data-pregunta="${i}">
            </div>
            <div id="preguntaPreview${i}" class="mt-3 hidden">
                <img id="preguntaPreviewImg${i}" class="max-h-48 w-full rounded-xl border border-slate-200 object-contain" alt="Vista previa pregunta ${i}">
                <button type="button" onclick="clearPreguntaImagen(${i})" class="mt-2 text-xs text-red-600 hover:text-red-800">❌ Eliminar</button>
            </div>
        `;
        container.appendChild(div);

        // Setup event listeners para esta pregunta
        setupPreguntaImagenListeners(i);
    }

    // Habilitar botón de procesar si hay al menos una imagen
    validarPreguntasCompletas();
}

function setupPreguntaImagenListeners(num) {
    const input = document.getElementById(`imagenPregunta${num}`);
    const dropArea = document.getElementById(`preguntaDropArea${num}`);
    const preview = document.getElementById(`preguntaPreview${num}`);
    const previewImg = document.getElementById(`preguntaPreviewImg${num}`);

    if (!input || !dropArea) return;

    // Hacer el área enfocable para paste
    dropArea.setAttribute('tabindex', '0');
    dropArea.style.outline = 'none';

    // Cambio de archivo
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
                validarPreguntasCompletas();
            };
            reader.readAsDataURL(file);
        }
    });

    // Drag & drop
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('border-slate-500', 'bg-white');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('border-slate-500', 'bg-white');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('border-slate-500', 'bg-white');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event('change'));
        }
    });

    // Paste
    dropArea.addEventListener('paste', (e) => {
        console.log(`Paste event en preguntaDropArea${num}`, e);
        e.preventDefault();
        e.stopPropagation();

        const items = e.clipboardData?.items;
        if (!items) {
            mostrarMensaje('No se detectó contenido en el portapapeles', 'error');
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
                    input.files = dataTransfer.files;
                    input.dispatchEvent(new Event('change'));
                    mostrarMensaje(`📋 Imagen de pregunta ${num} pegada desde el portapapeles`, 'success');
                } else {
                    mostrarMensaje('Error al obtener la imagen del portapapeles', 'error');
                }
                return;
            }
        }

        mostrarMensaje('No se encontró ninguna imagen. Copia una imagen primero.', 'error');
    });

    // Click enfoca el área (prevenir propagación del onclick del HTML)
    dropArea.addEventListener('click', (e) => {
        const target = e.target;
        // Si el click fue en el área pero no en el input oculto
        if (target === dropArea || dropArea.contains(target)) {
            e.stopPropagation();
            dropArea.focus();
            console.log(`preguntaDropArea${num} focused`);
        }
    });

    // Indicador visual cuando tiene foco
    dropArea.addEventListener('focus', () => {
        dropArea.style.borderColor = '#10b981';
        dropArea.style.background = '#ecfdf5';
        console.log(`preguntaDropArea${num} gained focus`);
    });

    dropArea.addEventListener('blur', () => {
        dropArea.style.borderColor = '';
        dropArea.style.background = '';
        console.log(`preguntaDropArea${num} lost focus`);
    });
}

function clearPreguntaImagen(num) {
    document.getElementById(`imagenPregunta${num}`).value = '';
    document.getElementById(`preguntaPreview${num}`).classList.add('hidden');
    validarPreguntasCompletas();
}

function validarPreguntasCompletas() {
    if (numPreguntasRequeridas === 0) {
        document.getElementById('procesarPreguntasIA').disabled = true;
        return;
    }

    let todasCompletas = true;
    for (let i = 1; i <= numPreguntasRequeridas; i++) {
        const input = document.getElementById(`imagenPregunta${i}`);
        if (!input || !input.files || input.files.length === 0) {
            todasCompletas = false;
            break;
        }
    }

    document.getElementById('procesarPreguntasIA').disabled = !todasCompletas;
}

// ========================================
// PROCESAMIENTO CON IA - TEXTO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const btnProcesarTexto = document.getElementById('procesarTextoIA');

    btnProcesarTexto.addEventListener('click', async () => {
        const inputTexto = document.getElementById('imagenTexto');
        const aiService = document.getElementById('aiServiceTextoSelect').value;

        if (!inputTexto.files || inputTexto.files.length === 0) {
            mostrarMensaje('Por favor, sube una imagen del texto', 'error');
            return;
        }

        // Mostrar loading
        btnProcesarTexto.disabled = true;
        btnProcesarTexto.innerHTML = '<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block"></span> Extrayendo texto...';

        try {
            const formData = new FormData();
            formData.append('image', inputTexto.files[0]);
            formData.append('ai_service', aiService);
            formData.append('mode', 'extract_text');

            const response = await fetch('/api/process-image-ai', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success && result.data.texto) {
                // Colocar el texto extraído en el textarea
                const textareaDirecto = document.getElementById('textoComprension');
                textareaDirecto.value = result.data.texto;

                // Cambiar a modo texto directo
                toggleTextoMode('directo');

                mostrarMensaje('✅ Texto extraído correctamente. Revisa y edita si es necesario.', 'success');
            } else {
                throw new Error('No se pudo extraer el texto');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('Error al extraer el texto: ' + error.message, 'error');
        } finally {
            btnProcesarTexto.disabled = false;
            btnProcesarTexto.innerHTML = '🤖 Extraer Texto con IA';
        }
    });
});

// ========================================
// PROCESAMIENTO CON IA - PREGUNTAS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const btnProcesarPreguntas = document.getElementById('procesarPreguntasIA');

    btnProcesarPreguntas.addEventListener('click', async () => {
        if (numPreguntasRequeridas === 0) {
            mostrarMensaje('Selecciona el tipo de comprensión primero', 'error');
            return;
        }

        // Validar que tengamos el texto (imagen o directo)
        const textoDirecto = document.getElementById('textoComprension').value.trim();
        const imagenTexto = document.getElementById('imagenTexto').files[0];

        if (!textoDirecto && !imagenTexto) {
            mostrarMensaje('Por favor, proporciona el texto de comprensión primero', 'error');
            return;
        }

        // Mostrar loading
        btnProcesarPreguntas.disabled = true;
        btnProcesarPreguntas.innerHTML = '<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block"></span> Procesando preguntas...';

        try {
            const formData = new FormData();
            formData.append('tipo_comprension', tipoComprensionActual);
            formData.append('ai_service', document.getElementById('aiServiceTextoSelect').value);

            // Añadir texto (directo o desde imagen procesada)
            formData.append('texto', textoDirecto);

            // Añadir imágenes de preguntas
            for (let i = 1; i <= numPreguntasRequeridas; i++) {
                const input = document.getElementById(`imagenPregunta${i}`);
                if (input.files[0]) {
                    formData.append(`pregunta_${i}`, input.files[0]);
                }
            }

            const response = await fetch('/api/procesar-comprension', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success && result.preguntas) {
                preguntasExtraidas = result.preguntas;
                mostrarPreguntasExtraidas(result.preguntas);
                mostrarMensaje('✅ Preguntas procesadas correctamente. Revisa y edita antes de guardar.', 'success');

                // Habilitar botón de guardar
                document.getElementById('submitCompBtn').disabled = false;
            } else {
                throw new Error(result.message || 'No se pudieron procesar las preguntas');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('Error al procesar las preguntas: ' + error.message, 'error');
        } finally {
            btnProcesarPreguntas.disabled = false;
            btnProcesarPreguntas.innerHTML = '🤖 Procesar Preguntas con IA';
        }
    });
});

// ========================================
// MOSTRAR PREGUNTAS EXTRAÍDAS
// ========================================

function mostrarPreguntasExtraidas(preguntas) {
    const section = document.getElementById('preguntasExtraidasSection');
    const container = document.getElementById('preguntasExtraidasContainer');

    section.classList.remove('hidden');
    container.innerHTML = '';

    preguntas.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-4';
        div.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-slate-700">Pregunta ${index + 1}</h3>
                <select class="rounded-lg border border-slate-300 px-2 py-1 text-xs" id="dificultad_${index}">
                    <option value="1" ${p.dificultad === 1 ? 'selected' : ''}>Dificultad 1</option>
                    <option value="2" ${p.dificultad === 2 ? 'selected' : ''}>Dificultad 2</option>
                    <option value="3" ${p.dificultad === 3 ? 'selected' : ''}>Dificultad 3</option>
                </select>
            </div>

            <div class="space-y-3">
                <div>
                    <label class="text-xs font-semibold text-slate-600">Pregunta:</label>
                    <textarea id="pregunta_${index}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows="2">${p.pregunta || ''}</textarea>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    ${['A', 'B', 'C', 'D', 'E'].map(letra => `
                        <div>
                            <label class="text-xs font-semibold text-slate-600">${letra})</label>
                            <textarea id="opcion_${letra}_${index}" class="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" rows="1">${p.opciones[letra] || ''}</textarea>
                        </div>
                    `).join('')}
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-semibold text-slate-600">Respuesta Correcta:</label>
                        <select id="respuesta_${index}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                            ${['A', 'B', 'C', 'D', 'E'].map(letra =>
                                `<option value="${letra}" ${p.respuesta_correcta === letra ? 'selected' : ''}>${letra}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div>
                    <label class="text-xs font-semibold text-slate-600">Explicación:</label>
                    <textarea id="explicacion_${index}" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows="3">${p.explicacion || ''}</textarea>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// ========================================
// MANEJO DE SECCIÓN DE PROCESO (COMPRENSIÓN)
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const tipoClasificacion = document.getElementById('comp_tipo_clasificacion');
    const procesoSection = document.getElementById('comp_proceso_section');
    const tipoProceso = document.getElementById('comp_tipo_proceso');
    const anio = document.getElementById('comp_anio');

    tipoClasificacion.addEventListener('change', (e) => {
        if (e.target.value === 'proceso') {
            procesoSection.classList.remove('hidden');
        } else {
            procesoSection.classList.add('hidden');
        }
    });

    // Configuración dinámica de fase/examen (similar al formulario normal)
    const updateProcesoSelectorsComp = () => {
        const tipo = tipoProceso.value;
        const anioVal = anio.value;
        const faseContainer = document.getElementById('comp_fase_container');
        const examenContainer = document.getElementById('comp_examen_container');
        const faseSelect = document.getElementById('comp_fase');
        const examenSelect = document.getElementById('comp_examen');

        // Limpiar selectores
        faseSelect.innerHTML = '<option value="">Selecciona</option>';
        examenSelect.innerHTML = '<option value="">Selecciona</option>';
        faseContainer.classList.add('hidden');
        examenContainer.classList.add('hidden');
        faseSelect.required = false;
        examenSelect.required = false;

        if (!tipo || !anioVal) return;

        const anioNum = parseInt(anioVal);
        const examenes = anioNum >= 2025 ? ['examen'] : ['1er examen', '2do examen'];

        const config = {
            'ceprunsa': { fases: ['I FASE', 'II FASE'], examenes },
            'ceprequintos': { fases: null, examenes },
            'ordinario': { fases: ['I FASE', 'II FASE'], examenes: null },
            'extraordinario': { fases: null, examenes: null }
        };

        const selected = config[tipo];
        if (!selected) return;

        if (selected.fases) {
            faseContainer.classList.remove('hidden');
            faseSelect.required = true;
            selected.fases.forEach(fase => {
                const option = document.createElement('option');
                option.value = fase;
                option.textContent = fase;
                faseSelect.appendChild(option);
            });
        }

        if (selected.examenes) {
            examenContainer.classList.remove('hidden');
            examenSelect.required = true;
            selected.examenes.forEach(examen => {
                const option = document.createElement('option');
                option.value = examen;
                option.textContent = examen;
                examenSelect.appendChild(option);
            });
        }
    };

    tipoProceso.addEventListener('change', updateProcesoSelectorsComp);
    anio.addEventListener('change', updateProcesoSelectorsComp);
});

// ========================================
// ENVÍO DEL FORMULARIO DE COMPRENSIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('comprensionForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Recopilar datos del formulario
        const tipoComprension = document.getElementById('tipo_comprension').value;
        const textoComprension = document.getElementById('textoComprension').value;
        const numeroTema = document.getElementById('comp_numero_tema').value;
        const tipoClasificacion = document.getElementById('comp_tipo_clasificacion').value;

        if (!tipoComprension || !textoComprension || !numeroTema) {
            mostrarMensaje('Por favor, completa todos los campos requeridos', 'error');
            return;
        }

        if (preguntasExtraidas.length === 0) {
            mostrarMensaje('Debes procesar las preguntas con IA primero', 'error');
            return;
        }

        // Recopilar preguntas editadas
        const preguntasFinales = preguntasExtraidas.map((p, index) => ({
            pregunta: document.getElementById(`pregunta_${index}`).value,
            dificultad: parseInt(document.getElementById(`dificultad_${index}`).value),
            opciones: {
                A: document.getElementById(`opcion_A_${index}`).value,
                B: document.getElementById(`opcion_B_${index}`).value,
                C: document.getElementById(`opcion_C_${index}`).value,
                D: document.getElementById(`opcion_D_${index}`).value,
                E: document.getElementById(`opcion_E_${index}`).value
            },
            respuesta_correcta: document.getElementById(`respuesta_${index}`).value,
            explicacion: document.getElementById(`explicacion_${index}`).value,
            imagen: null
        }));

        // Construir payload
        const payload = {
            tipo_comprension: tipoComprension,
            numero_tema: parseInt(numeroTema),
            texto: textoComprension,
            tipo_clasificacion: tipoClasificacion,
            preguntas: preguntasFinales
        };

        // Si es proceso, añadir campos adicionales
        if (tipoClasificacion === 'proceso') {
            payload.area_academica = document.getElementById('comp_area_academica').value;
            payload.anio = document.getElementById('comp_anio').value;
            payload.tipo_proceso = document.getElementById('comp_tipo_proceso').value;
            payload.fase = document.getElementById('comp_fase').value || null;
            payload.examen = document.getElementById('comp_examen').value || null;
        }

        // Enviar
        const btnSubmit = document.getElementById('submitCompBtn');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white inline-block"></span> Guardando...';

        try {
            const response = await fetch('/crear-pregunta-comprension', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                mostrarMensaje('✅ Pregunta de comprensión guardada exitosamente', 'success');

                // Mostrar JSON
                document.getElementById('jsonContent').textContent = JSON.stringify(result.data, null, 2);
                document.getElementById('jsonPreview').classList.remove('hidden');

                // Limpiar formulario si se desea
                // form.reset();
            } else {
                throw new Error(result.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('Error al guardar: ' + error.message, 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '✅ Guardar Comprensión';
        }
    });
});

// ========================================
// FUNCIÓN AUXILIAR PARA MOSTRAR MENSAJES
// ========================================

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('mensaje');
    mensaje.textContent = texto;
    mensaje.className = `mt-8 rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${
        tipo === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
    }`;
    mensaje.classList.remove('hidden');

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        mensaje.classList.add('hidden');
    }, 5000);
}
