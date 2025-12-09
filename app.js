// ===== SEGURIDAD: Utilidades =====
const SecurityUtils = {
    // Sanitizar texto para prevenir XSS
    sanitizeHTML: function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    // Validar que solo contenga caracteres permitidos
    validateInput: function(str, type = 'text') {
        if (!str) return false;
        const patterns = {
            text: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.\']+$/,
            alphanumeric: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-\.\']+$/
        };
        return patterns[type] ? patterns[type].test(str) : true;
    },
    
    // Generar ID único para sesión
    generateSessionId: function() {
        return 'xxxx-xxxx-xxxx'.replace(/x/g, () => 
            Math.floor(Math.random() * 16).toString(16)
        );
    },
    
    // Decodificar endpoint (ofuscación básica)
    getEndpoint: function() {
        const parts = [
            'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mv',
            'cy9BS2Z5Y2J6VTdzNmlIMXZwa2RxSVRiTnBJTE1zVlpU',
            'cDBFSW5BN2ZmM19DdU5UdGQwbm5zYTFhZmhTM2dlLXRU',
            'eTNDODZTaDc2Zy9leGVj'
        ];
        try {
            return atob(parts.join(''));
        } catch(e) {
            return null;
        }
    }
};

// ===== SEGURIDAD: Rate Limiting =====
const RateLimiter = {
    submissions: [],
    maxSubmissions: 3,
    timeWindow: 300000, // 5 minutos
    
    canSubmit: function() {
        const now = Date.now();
        this.submissions = this.submissions.filter(t => now - t < this.timeWindow);
        return this.submissions.length < this.maxSubmissions;
    },
    
    recordSubmission: function() {
        this.submissions.push(Date.now());
        localStorage.setItem('dnc_submissions', JSON.stringify(this.submissions));
    },
    
    init: function() {
        try {
            const stored = localStorage.getItem('dnc_submissions');
            if (stored) {
                this.submissions = JSON.parse(stored).filter(t => Date.now() - t < this.timeWindow);
            }
        } catch(e) {
            this.submissions = [];
        }
    }
};
RateLimiter.init();

// ===== SEGURIDAD: Prevención de envíos duplicados =====
const SubmissionGuard = {
    isSubmitting: false,
    lastSubmission: null,
    
    canProceed: function() {
        if (this.isSubmitting) return false;
        if (this.lastSubmission && Date.now() - this.lastSubmission < 5000) return false;
        return true;
    },
    
    startSubmission: function() {
        this.isSubmitting = true;
    },
    
    endSubmission: function(success) {
        this.isSubmitting = false;
        if (success) this.lastSubmission = Date.now();
    }
};

// ===== CATÁLOGO DE CURSOS =====
const catalogoCursos = Object.freeze({
    "Calidad": Object.freeze([
        "Metrología Dimensional",
        "Calypso Básico",
        "Calypso Avanzado",
        "GD&T (Tolerancias Geométricas)",
        "MSA (Análisis de Sistemas de Medición)",
        "BIQ (Built-In Quality)",
        "APQP/PPAP",
        "Control Estadístico de Proceso (SPC)",
        "Auditor Interno ISO 9001",
        "Core Tools"
    ]),
    "Software & Tecnología": Object.freeze([
        "Excel Avanzado",
        "Power BI",
        "Python para Análisis de Datos",
        "AutoCAD 2D/3D",
        "SQL Server",
        "SAP Básico",
        "SAP Avanzado",
        "Power Automate",
        "SharePoint",
        "Microsoft Project"
    ]),
    "Robots & Automatización": Object.freeze([
        "Programación ABB",
        "Fanuc Operación",
        "Fanuc Programación",
        "Seguridad en Celdas Robotizadas",
        "PLC Allen Bradley",
        "PLC Siemens",
        "Visión Artificial",
        "Servomotores y Variadores"
    ]),
    "Manufactura & Procesos": Object.freeze([
        "Lean Manufacturing",
        "Six Sigma Green Belt",
        "Six Sigma Black Belt",
        "Kaizen",
        "5S's",
        "SMED",
        "TPM",
        "Value Stream Mapping",
        "8D's Problem Solving"
    ]),
    "Liderazgo & Desarrollo": Object.freeze([
        "Liderazgo Efectivo",
        "Comunicación Asertiva",
        "Trabajo en Equipo",
        "Gestión del Tiempo",
        "Toma de Decisiones",
        "Coaching para Líderes",
        "Manejo de Conflictos",
        "Inteligencia Emocional"
    ]),
    "Seguridad & EHS": Object.freeze([
        "Seguridad Industrial",
        "Manejo de Materiales Peligrosos",
        "Ergonomía en el Trabajo",
        "Primeros Auxilios",
        "Prevención de Incendios",
        "Bloqueo/Etiquetado (LOTO)",
        "Trabajo en Alturas",
        "ISO 14001 / ISO 45001"
    ]),
    "Mantenimiento": Object.freeze([
        "Mantenimiento Preventivo",
        "Mantenimiento Predictivo",
        "Análisis de Vibraciones",
        "Termografía Industrial",
        "Lubricación Industrial",
        "Electricidad Industrial",
        "Neumática e Hidráulica",
        "Soldadura Industrial"
    ])
});

// ===== ELEMENTOS DEL DOM =====
const catalogoDiv = document.getElementById('catalogo-render');
const justifContainer = document.getElementById('justificacion-container');
const cardsWrapper = document.getElementById('cards-wrapper');
const counterEl = document.getElementById('counter');
const loadingOverlay = document.getElementById('loading-overlay');
const modalOverlay = document.getElementById('modal-overlay');
const toastContainer = document.getElementById('toast-container');
const MAX_SELECTION = 3;
const SESSION_ID = SecurityUtils.generateSessionId();

// ===== ICONOS DE CATEGORÍAS =====
const categoryIcons = Object.freeze({
    "Calidad": '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    "Software & Tecnología": '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>',
    "Robots & Automatización": '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>',
    "Manufactura & Procesos": '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>',
    "Liderazgo & Desarrollo": '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
    "Seguridad & EHS": '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>',
    "Mantenimiento": '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>'
});

// ===== RENDERIZAR CATÁLOGO (Seguro) =====
function createCourseItem(curso) {
    const item = document.createElement('div');
    item.className = 'course-item';
    item.setAttribute('data-curso', SecurityUtils.sanitizeHTML(curso));
    
    const checkbox = document.createElement('div');
    checkbox.className = 'course-checkbox';
    checkbox.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'course-name';
    nameSpan.textContent = curso; // textContent es seguro contra XSS
    
    item.appendChild(checkbox);
    item.appendChild(nameSpan);
    item.addEventListener('click', () => manejarSeleccion(item));
    
    return item;
}

function createCategoryHeader(categoria, count) {
    const header = document.createElement('div');
    header.className = 'category-header';
    
    // Agregar icono de forma segura
    const iconContainer = document.createElement('span');
    if (categoryIcons[categoria]) {
        iconContainer.innerHTML = categoryIcons[categoria];
    }
    header.appendChild(iconContainer);
    
    // Agregar texto de forma segura
    const textNode = document.createTextNode(' ' + categoria + ' ');
    header.appendChild(textNode);
    
    const countSpan = document.createElement('span');
    countSpan.className = 'category-count';
    countSpan.textContent = count + ' cursos';
    header.appendChild(countSpan);
    
    return header;
}

// Renderizar catálogo
for (const [categoria, cursos] of Object.entries(catalogoCursos)) {
    const wrapper = document.createElement('div');
    wrapper.className = 'category-wrapper';
    
    wrapper.appendChild(createCategoryHeader(categoria, cursos.length));

    const grid = document.createElement('div');
    grid.className = 'courses-grid';

    cursos.forEach(curso => {
        grid.appendChild(createCourseItem(curso));
    });

    wrapper.appendChild(grid);
    catalogoDiv.appendChild(wrapper);
}

// ===== LÓGICA DE SELECCIÓN =====
function manejarSeleccion(item) {
    const isSelected = item.classList.contains('selected');
    const totalSeleccionados = document.querySelectorAll('.course-item.selected').length;

    if (!isSelected && totalSeleccionados >= MAX_SELECTION) {
        showToast('warning', 'Límite alcanzado', `Solo puedes seleccionar ${MAX_SELECTION} cursos prioritarios.`);
        return;
    }

    item.classList.toggle('selected');
    actualizarEstado();
}

function actualizarEstado() {
    const seleccionados = document.querySelectorAll('.course-item.selected');
    const count = seleccionados.length;

    // Actualizar contador
    counterEl.textContent = count;
    counterEl.classList.remove('warning', 'full');
    if (count === 2) counterEl.classList.add('warning');
    if (count === 3) counterEl.classList.add('full');

    // Actualizar progress steps
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');

    const nombre = document.getElementById('nombre').value.trim();
    const area = document.getElementById('area').value;

    step1.classList.toggle('completed', nombre && area);
    step1.classList.toggle('active', !nombre || !area);

    step2.classList.toggle('completed', count > 0);
    step2.classList.toggle('active', nombre && area && count === 0);

    step3.classList.toggle('active', count > 0);

    // Deshabilitar items no seleccionados si llegamos al máximo
    document.querySelectorAll('.course-item').forEach(item => {
        if (count >= MAX_SELECTION && !item.classList.contains('selected')) {
            item.classList.add('disabled');
        } else {
            item.classList.remove('disabled');
        }
    });

    // Mostrar/ocultar sección de justificaciones
    if (count > 0) {
        justifContainer.style.display = 'block';
        renderizarJustificaciones(seleccionados);
    } else {
        justifContainer.style.display = 'none';
    }
}

// Lista de motivos válidos (whitelist para seguridad)
const MOTIVOS_VALIDOS = Object.freeze([
    'Requerimiento Normativo',
    'GAP - Evaluación Desempeño',
    'Nueva Tecnología',
    'Desarrollo',
    'Seguridad',
    'Promoción',
    'Otro'
]);

function createJustificationCard(curso, index, valorAnterior) {
    const card = document.createElement('div');
    card.className = 'justification-card' + (valorAnterior ? ' complete' : '');
    
    // Header
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const cardTitle = document.createElement('h4');
    cardTitle.className = 'card-title';
    
    const badge = document.createElement('span');
    badge.className = 'card-badge';
    badge.textContent = index + 1;
    cardTitle.appendChild(badge);
    
    const cursoText = document.createTextNode(' ' + curso);
    cardTitle.appendChild(cursoText);
    cardHeader.appendChild(cardTitle);
    
    const cardStatus = document.createElement('div');
    cardStatus.className = 'card-status';
    cardStatus.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>';
    cardHeader.appendChild(cardStatus);
    card.appendChild(cardHeader);
    
    // Form Group
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const label = document.createElement('label');
    label.className = 'form-label';
    label.innerHTML = '¿Por qué requieres este curso? <span class="required">*</span>';
    formGroup.appendChild(label);
    
    // Select (creado de forma segura)
    const select = document.createElement('select');
    select.className = 'form-select motivo-select';
    select.setAttribute('data-curso', SecurityUtils.sanitizeHTML(curso));
    select.addEventListener('change', function() { verificarJustificacion(this); });
    
    // Opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.disabled = true;
    defaultOption.selected = !valorAnterior;
    defaultOption.textContent = 'Selecciona el motivo...';
    select.appendChild(defaultOption);
    
    // Opciones de motivos (desde whitelist)
    const motivoLabels = {
        'Requerimiento Normativo': 'Requerimiento Normativo (Legal/ISO)',
        'GAP - Evaluación Desempeño': 'Cerrar GAP / Evaluación de Desempeño',
        'Nueva Tecnología': 'Nueva Tecnología / Proyecto',
        'Desarrollo': 'Plan de Desarrollo Personal',
        'Seguridad': 'Seguridad (EHS)',
        'Promoción': 'Preparación para Promoción',
        'Otro': 'Otro motivo'
    };
    
    MOTIVOS_VALIDOS.forEach(motivo => {
        const option = document.createElement('option');
        option.value = motivo;
        option.selected = valorAnterior === motivo;
        option.textContent = motivoLabels[motivo] || motivo;
        select.appendChild(option);
    });
    
    formGroup.appendChild(select);
    card.appendChild(formGroup);
    
    return card;
}

function renderizarJustificaciones(nodelist) {
    const cursos = Array.from(nodelist).map(item => item.getAttribute('data-curso'));

    // Guardar valores previos
    const valoresPrevios = {};
    document.querySelectorAll('.motivo-select').forEach(sel => {
        valoresPrevios[sel.dataset.curso] = sel.value;
    });

    cardsWrapper.innerHTML = '';

    cursos.forEach((curso, index) => {
        const valorAnterior = valoresPrevios[curso] || "";
        cardsWrapper.appendChild(createJustificationCard(curso, index, valorAnterior));
    });
}

function verificarJustificacion(select) {
    const card = select.closest('.justification-card');
    if (select.value) {
        card.classList.add('complete');
    } else {
        card.classList.remove('complete');
    }
}

// ===== VALIDACIÓN DE CAMPOS =====
document.getElementById('nombre').addEventListener('blur', function() {
    validateField(this, this.value.trim().length >= 3);
});

document.getElementById('area').addEventListener('change', function() {
    validateField(this, this.value !== '');
});

document.getElementById('nombre').addEventListener('input', actualizarEstado);
document.getElementById('area').addEventListener('change', actualizarEstado);

function validateField(field, isValid) {
    const group = field.closest('.form-group');
    if (isValid) {
        field.classList.remove('error');
        field.classList.add('valid');
        group.classList.remove('has-error');
    } else {
        field.classList.add('error');
        field.classList.remove('valid');
        group.classList.add('has-error');
    }
    return isValid;
}

// ===== TOAST NOTIFICATIONS =====
function showToast(type, title, message) {
    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="closeToast(this)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px;height:18px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function closeToast(btn) {
    const toast = btn.closest('.toast');
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
}

// ===== ENVÍO DEL FORMULARIO (Seguro) =====
function enviarFormulario() {
    const btn = document.getElementById('btn-enviar');
    
    // Verificar protecciones de seguridad
    if (!SubmissionGuard.canProceed()) {
        showToast('warning', 'Espera un momento', 'Tu solicitud anterior aún se está procesando.');
        return;
    }
    
    if (!RateLimiter.canSubmit()) {
        showToast('error', 'Demasiados intentos', 'Has excedido el límite de envíos. Intenta de nuevo en unos minutos.');
        return;
    }
    
    const nombre = document.getElementById('nombre').value.trim();
    const area = document.getElementById('area').value;
    const seleccionados = document.querySelectorAll('.course-item.selected');
    const selects = document.querySelectorAll('.motivo-select');

    // Validaciones
    let hasErrors = false;

    // Validar nombre (mínimo 3 caracteres, máximo 100)
    if (!nombre || nombre.length < 3 || nombre.length > 100) {
        validateField(document.getElementById('nombre'), false);
        showToast('error', 'Campo requerido', 'Por favor ingresa tu nombre completo (3-100 caracteres).');
        hasErrors = true;
    }

    // Validar área
    if (!area) {
        validateField(document.getElementById('area'), false);
        if (!hasErrors) showToast('error', 'Campo requerido', 'Por favor selecciona tu área de trabajo.');
        hasErrors = true;
    }

    // Validar selección de cursos
    if (seleccionados.length === 0) {
        if (!hasErrors) showToast('error', 'Selección requerida', 'Debes seleccionar al menos un curso.');
        hasErrors = true;
    }

    if (seleccionados.length > MAX_SELECTION) {
        if (!hasErrors) showToast('error', 'Límite excedido', `Máximo ${MAX_SELECTION} cursos permitidos.`);
        hasErrors = true;
    }

    // Validar motivos
    let faltaMotivo = false;
    let motivoInvalido = false;
    selects.forEach(sel => {
        if (!sel.value) faltaMotivo = true;
        if (sel.value && !MOTIVOS_VALIDOS.includes(sel.value)) motivoInvalido = true;
    });

    if (faltaMotivo) {
        if (!hasErrors) showToast('error', 'Justificación incompleta', 'Indica el motivo para TODOS los cursos seleccionados.');
        hasErrors = true;
    }

    if (motivoInvalido) {
        if (!hasErrors) showToast('error', 'Error de validación', 'Uno de los motivos seleccionados no es válido.');
        hasErrors = true;
    }

    if (hasErrors) return;

    // Recolectar datos (sanitizados)
    let selecciones = [];
    selects.forEach(sel => {
        const curso = sel.dataset.curso;
        const motivo = sel.value;
        
        // Validar que el curso existe en el catálogo
        let cursoValido = false;
        for (const cursos of Object.values(catalogoCursos)) {
            if (cursos.includes(curso)) {
                cursoValido = true;
                break;
            }
        }
        
        if (cursoValido && MOTIVOS_VALIDOS.includes(motivo)) {
            selecciones.push({
                curso: SecurityUtils.sanitizeHTML(curso),
                motivo: motivo
            });
        }
    });

    if (selecciones.length === 0) {
        showToast('error', 'Error de validación', 'No se pudieron validar los cursos seleccionados.');
        return;
    }

    // Sanitizar comentarios (limitar longitud)
    const comentariosRaw = document.getElementById('comentarios').value.trim();
    const comentarios = comentariosRaw.substring(0, 500); // Máximo 500 caracteres

    const payload = {
        nombre: SecurityUtils.sanitizeHTML(nombre),
        area: SecurityUtils.sanitizeHTML(area),
        selecciones: selecciones,
        comentarios: SecurityUtils.sanitizeHTML(comentarios),
        timestamp: new Date().toISOString(),
        sessionId: SESSION_ID,
        userAgent: navigator.userAgent.substring(0, 200) // Limitar longitud
    };

    // Obtener endpoint de forma segura
    const scriptURL = SecurityUtils.getEndpoint();
    if (!scriptURL) {
        showToast('error', 'Error de configuración', 'No se pudo establecer conexión con el servidor.');
        return;
    }

    // Marcar inicio de envío
    SubmissionGuard.startSubmission();
    btn.disabled = true;
    loadingOverlay.classList.add('active');

    // Configurar timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: controller.signal,
        mode: 'no-cors' // Google Apps Script requiere no-cors
    })
    .then(() => {
        // En modo no-cors, no podemos leer la respuesta pero si llegamos aquí, se envió
        clearTimeout(timeoutId);
        RateLimiter.recordSubmission();
        SubmissionGuard.endSubmission(true);
        loadingOverlay.classList.remove('active');
        modalOverlay.classList.add('active');
    })
    .catch(error => {
        clearTimeout(timeoutId);
        SubmissionGuard.endSubmission(false);
        loadingOverlay.classList.remove('active');
        
        if (error.name === 'AbortError') {
            showToast('error', 'Tiempo agotado', 'La solicitud tardó demasiado. Intenta de nuevo.');
        } else {
            showToast('error', 'Error de conexión', 'No se pudo enviar. Verifica tu conexión e intenta de nuevo.');
        }
        btn.disabled = false;
    });
}

function cerrarModalYRecargar() {
    modalOverlay.classList.remove('active');
    setTimeout(() => location.reload(), 300);
}

// ===== INICIALIZACIÓN =====
actualizarEstado();

