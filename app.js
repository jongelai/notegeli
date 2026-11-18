document.addEventListener('DOMContentLoaded', () => {
    // Cargar notas y configuración inicial
    cargarNotas();
    actualizarFechaHeader();
    actualizarHoraFooter();
    setInterval(actualizarHoraFooter, 60000);
    if (localStorage.getItem('notegeli_dark') === 'true') {
        document.body.classList.add('dark-mode');
        const switchElement = document.getElementById('switchDarkMode');
        if (switchElement) switchElement.checked = true;
    }
});

// ==========================================
// RELOJ Y FECHA
// ==========================================
function actualizarFechaHeader() {
    const el = document.getElementById('fecha-actual-txt');
    if (!el) return;
    const opciones = { weekday: 'short', day: 'numeric', month: 'short' };
    el.textContent = new Date().toLocaleDateString('es-ES', opciones);
}

function actualizarHoraFooter() {
    const el = document.getElementById('hora-footer');
    if (!el) return;
    const ahora = new Date();
    el.textContent = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ==========================================
// GESTIÓN DE NOTAS
// ==========================================
let notas = JSON.parse(localStorage.getItem('notegeli_notas')) || [];
let modoPrivadaCreacionActivo = false;
let accesoPrivadoConcedido = false;

function guardarEnLocalStorage() {
    localStorage.setItem('notegeli_notas', JSON.stringify(notas));
}

function crearNota(event) {
    event.preventDefault();
    const textoInput = document.getElementById('nueva-nota-texto');
    const fechaInput = document.getElementById('nueva-nota-fecha');
    
    const texto = textoInput.value.trim();
    if (!texto) return;

    const nuevaNota = {
        id: Date.now(),
        texto: texto,
        fechaRecordatorio: fechaInput ? fechaInput.value : '',
        privada: modoPrivadaCreacionActivo,
        color: '',
        fechaCreacion: new Date().toISOString()
    };

    notas.unshift(nuevaNota);
    guardarEnLocalStorage();
    
    
    if (modoPrivadaCreacionActivo) {
        accesoPrivadoConcedido = false;
    }

    cargarNotas();

    textoInput.value = '';
    if (fechaInput) fechaInput.value = '';
    limpiarFechaPreview();
    
    }


function cargarNotas(filtro = '') {
    const container = document.getElementById('notes-scroll-container');
    if (!container) return;
    container.innerHTML = '';

    const notasFiltradas = notas.filter(nota => {
        // Si la nota es privada y no se ha introducido la contraseña, se oculta
        if (nota.privada && !accesoPrivadoConcedido) return false;
        
        // Aplicar filtro de búsqueda
        if (filtro && !nota.texto.toLowerCase().includes(filtro.toLowerCase())) {
            return false;
        }
        return true;
    });

    // --- LÓGICA DE RECORDATORIOS (HOY Y MAÑANA ARRIBA) ---
    const hoyStr = obtenerFechaLocal(0);
    const mananaStr = obtenerFechaLocal(1);

    notasFiltradas.sort((a, b) => {
        const fechaA = a.fechaRecordatorio || '';
        const fechaB = b.fechaRecordatorio || '';
        
        const esUrgenteA = (fechaA === hoyStr || fechaA === mananaStr);
        const esUrgenteB = (fechaB === hoyStr || fechaB === mananaStr);

        if (esUrgenteA && !esUrgenteB) return -1;
        if (!esUrgenteA && esUrgenteB) return 1;
        return 0;
    });

    if (notasFiltradas.length === 0) {
        container.innerHTML = `<p class="text-muted text-center small mt-4">No hay notas para mostrar.</p>`;
        return;
    }

    notasFiltradas.forEach(nota => {
        const card = document.createElement('div');
        card.className = 'card mb-2 shadow-sm border-0 note-item';
        if (nota.color) {
            card.style.setProperty('--note-color', nota.color);
            card.classList.add('nota-con-color');
}
        let badgeFecha = '';
        if (nota.fechaRecordatorio) {
            if (nota.fechaRecordatorio === hoyStr) {
                badgeFecha = `<span class="badge bg-danger text-white mt-2 shadow-sm"><i class="bi bi-alarm-fill me-1"></i>¡Para HOY!</span>`;
                card.classList.add('border-start', 'border-danger', 'border-3');
            } else if (nota.fechaRecordatorio === mananaStr) {
                badgeFecha = `<span class="badge bg-warning text-dark mt-2"><i class="bi bi-calendar-event me-1"></i>Para Mañana (${nota.fechaRecordatorio})</span>`;
            } else {
                badgeFecha = `<span class="badge bg-light text-dark border mt-2"><i class="bi bi-calendar3 me-1"></i>${nota.fechaRecordatorio}</span>`;
            }
        }

        let iconoPrivada = nota.privada ? '<i class="bi bi-key-fill text-warning me-1" title="Nota privada"></i>' : '';

        card.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start gap-2">
                    <p class="mb-1 text-break flex-grow-1 pe-2" style="white-space: pre-wrap; font-size: inherit;">${iconoPrivada}${escapeHtml(nota.texto)}</p>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <button class="btn btn-sm btn-outline-secondary border-0 p-1 rounded-circle" onclick="abrirEditor(${nota.id})" title="Editar nota">
                            <i class="bi bi-pencil fs-6"></i>
                        </button>
                        <button class="btn btn-sm btn-danger p-1 px-2 rounded-2 shadow-sm" onclick="eliminarNota(${nota.id})" title="Eliminar nota" style="background-color: #dc3545; border: none;">
                            <i class="bi bi-trash-fill fs-6 text-white"></i>
                        </button>
                    </div>
                </div>
                ${badgeFecha}
            </div>
        `;
        container.appendChild(card);
    });
}

function eliminarNota(id) {
    notas = notas.filter(n => n.id !== id);
    guardarEnLocalStorage();
    cargarNotas();
    mostrarToast("Nota eliminada", "La nota ha sido borrada correctamente.", "success");
}

// ==========================================
// BUSCADOR / LUPA
// ==========================================
function toggleBarraBusqueda() {
    const box = document.getElementById('container-buscador-desplegable');
    if (!box) return;
    if (box.style.display === 'none' || !box.style.display) {
        box.style.display = 'block';
        document.getElementById('input-buscar').focus();
    } else {
        box.style.display = 'none';
        limpiarBusqueda();
    }
}

function filtrarNotas() {
    const query = document.getElementById('input-buscar').value;
    const clearBtn = document.getElementById('clear-search');
    if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
    }
    cargarNotas(query);
}

function limpiarBusqueda() {
    const input = document.getElementById('input-buscar');
    if (input) {
        input.value = ''; // Borra el texto
    }
    
    // Ejecuta tu función para refrescar las notas y mostrar la lista completa
    if (typeof filtrarNotas === 'function') {
        filtrarNotas(); 
    }

    // Oculta la barra desplegable automáticamente
    const box = document.getElementById('container-buscador-desplegable');
    if (box) {
        box.style.display = 'none';
    }
}

// ==========================================
// FECHAS Y PREVIEW EN CREACIÓN
// ==========================================
function actualizarFechaPreview() {
    const fechaInput = document.getElementById('nueva-nota-fecha');
    const preview = document.getElementById('nueva-fecha-preview');
    if (fechaInput && preview) {
        preview.textContent = fechaInput.value ? `📅 ${fechaInput.value}` : '';
    }
}

function limpiarFechaPreview() {
    const preview = document.getElementById('nueva-fecha-preview');
    if (preview) preview.textContent = '';
}

// ==========================================
// NOTAS PRIVADAS, CIFRADO & PASSWORD
// ==========================================
async function encriptarPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function toggleModoPrivadaCreacion() {
    modoPrivadaCreacionActivo = !modoPrivadaCreacionActivo;
    const btn = document.getElementById('btn-toggle-privada');
    const inputHidden = document.getElementById('nueva-nota-privada');
    const textarea = document.getElementById('nueva-nota-texto'); // El campo de texto de la nota
    
    if (btn && inputHidden) {
        inputHidden.value = modoPrivadaCreacionActivo;
        
        // Comprobamos si ya existe el aviso flotante en el DOM
        let avisoPrivado = document.getElementById('aviso-privado-dinamico');

        if (modoPrivadaCreacionActivo) {
            // 1. Candado cerrado: Ponemos el botón ámbar
            btn.innerHTML = '<i class="bi bi-lock-fill text-dark"></i>';
            btn.title = "Nota privada activada";
            btn.classList.add('active', 'bg-warning', 'border-warning');
            btn.classList.remove('text-warning');
            
            // 2. Creamos y mostramos el aviso flotante dinámicamente dentro del contenedor del textarea
            if (textarea) {
                const contenedorPadre = textarea.parentElement;
                
                // Nos aseguramos de que el padre sea position-relative para que el absolute funcione bien
                if (window.getComputedStyle(contenedorPadre).position === 'static') {
                    contenedorPadre.style.position = 'relative';
                }
                
                if (!avisoPrivado) {
                    avisoPrivado = document.createElement('div');
                    avisoPrivado.id = 'aviso-privado-dinamico';
                    avisoPrivado.className = 'position-absolute top-0 end-0 m-2 px-2 py-1 bg-warning text-dark rounded-pill shadow-sm d-flex align-items-center gap-1';
                    avisoPrivado.style.fontSize = '0.7rem';
                    avisoPrivado.style.fontWeight = '600';
                    avisoPrivado.style.zIndex = '10';
                    avisoPrivado.innerHTML = '<i class="bi bi-lock-fill"></i> Nota privada';
                    contenedorPadre.appendChild(avisoPrivado);
                }
            }
        } else {
            // 1. Candado abierto: Volvemos a la normalidad
            btn.innerHTML = '<i class="bi bi-unlock"></i>';
            btn.title = "Hacer nota privada";
            btn.classList.remove('active', 'bg-warning', 'border-warning');
            btn.classList.add('text-warning');
            
            // 2. Eliminamos el aviso flotante si existe
            if (avisoPrivado) {
                avisoPrivado.remove();
            }
        }
    }
}



function intentarAbrirPrivadas() {
    if (accesoPrivadoConcedido) {
        accesoPrivadoConcedido = false;
        document.querySelector('.app-container').classList.remove('modo-privado-activo');
        const btnLlave = document.getElementById('btn-icono-llave');
        if (btnLlave) btnLlave.classList.remove('text-warning');
        cargarNotas();
        mostrarToast("Bloqueado", "Notas privadas ocultas.", "info");
        return;
    } 

    const modal = document.getElementById('view-lock');
    if (modal) {
        modal.style.display = 'flex';
        const inputPass = document.getElementById('input-lock-pass');
        if (inputPass) {
            inputPass.value = '';
            inputPass.focus();
        }
    }
}

function cerrarModalLock() {
    const modal = document.getElementById('view-lock');
    if (modal) modal.style.display = 'none';
}

async function verificarPasswordLock() {
    const inputPass = document.getElementById('input-lock-pass');
    if (!inputPass) return;

    const passInput = inputPass.value;
    if (!passInput.trim()) {
        inputPass.value = ''; 
        inputPass.focus();
        mostrarToast("Atención", "Introduce una contraseña.", "warning");
        return;
    }

    const passHash = await encriptarPassword(passInput);
    let passwordGuardada = localStorage.getItem('notegeli_pass');

    if (!passwordGuardada) {
        localStorage.setItem('notegeli_pass', passHash);
        accesoPrivadoConcedido = true;
        document.querySelector('.app-container').classList.add('modo-privado-activo');
        cerrarModalLock();
        const btnLlave = document.getElementById('btn-icono-llave');
        if (btnLlave) btnLlave.classList.add('text-warning');
        mostrarToast("¡Todo listo! ", "Contraseña establecida.", "success");
        cargarNotas();
        return;
    } 

    if (passHash === passwordGuardada) {
        accesoPrivadoConcedido = true;
        document.querySelector('.app-container').classList.add('modo-privado-activo');
        cerrarModalLock();
        const btnLlave = document.getElementById('btn-icono-llave');
        if (btnLlave) btnLlave.classList.add('text-warning');
        mostrarToast("Acceso concedido ", "Notas privadas desbloqueadas.", "success");
        
        cargarNotas(); // <--- ¡Añadido aquí para que se recarguen y aparezcan las notas ocultas!
    } else {
        inputPass.value = ''; 
        inputPass.focus();
        mostrarToast("Acceso denegado ", "La contraseña es incorrecta.", "error");
    }
}

// ==========================================
// BACKUP Y RESTAURACIÓN (EXPORTAR / IMPORTAR)
// ==========================================
function exportarBackup() {
    const backupData = {
        notas: notas,
        passHash: localStorage.getItem('notegeli_pass') || '',
        fechaBackup: new Date().toISOString()
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toTimeString().split(' ')[0].replace(/:/g, '-');
    a.download = `notegeli-backup-${fechaStr}_${horaStr}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarToast("Backup creado", "El archivo de copia de seguridad se ha descargado.", "success");
}

function importarBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    
    input.onchange = e => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = function(event) {
            try {
                const contenido = JSON.parse(event.target.result);
                const listaNotas = Array.isArray(contenido) ? contenido : contenido.notas;
                const passwordGuardado = Array.isArray(contenido) ? null : contenido.passHash;

                if (listaNotas) {
                    notas = listaNotas;
                    guardarEnLocalStorage();
                    
                    if (passwordGuardado !== null && passwordGuardado !== undefined) {
                        localStorage.setItem('notegeli_pass', String(passwordGuardado).replace(/["']/g, ""));
                    }

                    cargarNotas();
                    mostrarToast("Restaurado", "Las notas se han recuperado correctamente.", "success");
                } else {
                    mostrarToast("Error", "El archivo no tiene un formato de notas válido.", "error");
                }
            } catch (error) {
                console.error(error);
                mostrarToast("Error", "Error al leer el archivo de respaldo.", "error");
            }
        };
        lector.readAsText(archivo);
    };

    input.click();
}

// Obtiene la fecha actual o con offset en formato 'YYYY-MM-DD' local
function obtenerFechaLocal(diasOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + diasOffset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function mostrarToast(titulo, mensaje, tipo = "success") {
    const anterior = document.querySelector('.toast-notegeli');
    if (anterior) anterior.remove();

    const iconos = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
    const toast = document.createElement('div');
    toast.className = `toast-notegeli ${tipo}`;

    const icono = document.createElement('div');
    icono.className = 'toast-icon';
    icono.textContent = iconos[tipo] || "ℹ";

    const contenido = document.createElement('div');
    contenido.className = 'toast-content';

    const tituloEl = document.createElement('strong');
    tituloEl.textContent = titulo;

    const mensajeEl = document.createElement('span');
    mensajeEl.textContent = mensaje;

    contenido.append(tituloEl, mensajeEl);
    toast.append(icono, contenido);
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 150);
    }, 1500);
}
// ==========================================
// CALCULADORA
// ==========================================
function abrirCalculadoraModal() {
    const modal = document.getElementById('view-calc');
    if (modal) modal.style.display = 'flex';
    calcClear();
}

function cerrarCalculadoraModal() {
    const modal = document.getElementById('view-calc');
    if (modal) modal.style.display = 'none';
}

function calcAppend(val) {
    const display = document.getElementById('calc-display');
    if (!display) return;
    if (display.value === '0' || display.value === 'Error') {
        display.value = val;
    } else {
        display.value += val;
    }
}

function calcClear() {
    const display = document.getElementById('calc-display');
    if (display) display.value = '0';
}

function calcCalculate() {
    const display = document.getElementById('calc-display');
    if (!display) return;

    try {
        let expresion = display.value.replace(/×/g, '*').replace(/÷/g, '/');
        let resultado = eval(expresion);

        if (resultado.toString().includes('.')) {
            resultado = parseFloat(resultado.toFixed(8)); 
        }

        display.value = resultado;

        navigator.clipboard.writeText(resultado).then(() => {
            mostrarToast("¡Copiado!", "El resultado se ha copiado al portapapeles.", "success");
        }).catch(err => {
            console.error("Error al copiar: ", err);
        });

    } catch (e) {
        display.value = 'Error';
        mostrarToast("Error", "Cálculo no válido", "error");
        setTimeout(() => calcClear(), 1500);
    }
}

// ==========================================
// MODAL DE EDITOR Y TAMAÑO DE FUENTE
// ==========================================
function abrirEditor(id) {
    const nota = notas.find(n => n.id === id);
    if (!nota) return;

    document.getElementById('edit-id').value = nota.id;
    document.getElementById('edit-textarea').value = nota.texto;
    document.getElementById('edit-color-input').value = nota.color || '';
    document.getElementById('edit-fecha-input').value = nota.fechaRecordatorio || '';
    
    actualizarFechaEditPreview();

    const modal = document.getElementById('view-edit');
    if (modal) modal.style.display = 'flex';
}

function cerrarEditor() {
    const modal = document.getElementById('view-edit');
    if (modal) modal.style.display = 'none';
}

function guardarEdicion(event) {
    event.preventDefault();
    const id = Number(document.getElementById('edit-id').value);
    const texto = document.getElementById('edit-textarea').value.trim();
    const color = document.getElementById('edit-color-input').value;
    const fechaRecordatorio = document.getElementById('edit-fecha-input').value;

    const index = notas.findIndex(n => n.id === id);
    if (index !== -1) {
        notas[index].texto = texto;
        notas[index].color = color;
        notas[index].fechaRecordatorio = fechaRecordatorio;
        guardarEnLocalStorage();
        cargarNotas();
    }
    cerrarEditor();
}

function seleccionarColor(btn, colorHex) {
    document.getElementById('edit-color-input').value = colorHex;
    document.querySelectorAll('.btn-color-dot').forEach(b => b.style.border = 'none');
    btn.style.border = '2px solid #333';
}

function actualizarFechaEditPreview() {
    const input = document.getElementById('edit-fecha-input');
    const preview = document.getElementById('edit-fecha-preview');
    if (input && preview) {
        preview.textContent = input.value ? `📅 ${input.value}` : '📅 Añadir fecha';
    }
}

function cambiarTamanoFuente(tamano) {
    const container = document.querySelector('.app-container');
    if (!container) return;

    let fuente;
    if (tamano === 'grande') {
        fuente = '1.35rem';
    } else if (tamano === 'muy-grande') {
        fuente = '1.5rem';
    } else {
        fuente = '1.25rem';
    }

    container.style.fontSize = fuente;

    const campos = container.querySelectorAll(
        'textarea, input, select, [contenteditable="true"]'
    );

    campos.forEach(campo => {
        campo.style.fontSize = fuente;
    });
}

// Utilidad para prevenir inyecciones HTML en las notas
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('notegeli_dark', isDark);
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => menu.classList.remove('show'));
}

