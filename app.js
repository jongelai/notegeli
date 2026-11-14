document.addEventListener('DOMContentLoaded', () => {
    // Cargar notas y configuración inicial
    cargarNotas();
    actualizarFechaHeader();
    actualizarHoraFooter();
    setInterval(actualizarHoraFooter, 1000);
});

// Reloj y fecha en el header/footer
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
    cargarNotas();

    // Resetear formulario
    textoInput.value = '';
    if (fechaInput) fechaInput.value = '';
    limpiarFechaPreview();
    
    // Desactivar modo privada si estaba activo
    if (modoPrivadaCreacionActivo) {
        toggleModoPrivadaCreacion();
    }
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

        // Las notas con fecha para hoy o mañana van primero
        if (esUrgenteA && !esUrgenteB) return -1;
        if (!esUrgenteA && esUrgenteB) return 1;
        return 0; // Mantiene el orden original para el resto
    });
    // ----------------------------------------------------

    if (notasFiltradas.length === 0) {
        container.innerHTML = `<p class="text-muted text-center small mt-4">No hay notas para mostrar.</p>`;
        return;
    }

    notasFiltradas.forEach(nota => {
        const card = document.createElement('div');
        card.className = 'card mb-2 shadow-sm border-0 note-item';
        if (nota.color) card.style.backgroundColor = nota.color;

        let badgeFecha = '';
        if (nota.fechaRecordatorio) {
            if (nota.fechaRecordatorio === hoyStr) {
                // Aviso destacado para HOY
                badgeFecha = `<span class="badge bg-danger text-white mt-2 shadow-sm"><i class="bi bi-alarm-fill me-1"></i>¡Para HOY!</span>`;
                card.classList.add('border-start', 'border-danger', 'border-3'); // Opcional: resalta el borde de la tarjeta
            } else if (nota.fechaRecordatorio === mananaStr) {
                // Aviso destacado para MAÑANA
                badgeFecha = `<span class="badge bg-warning text-dark mt-2"><i class="bi bi-calendar-event me-1"></i>Para Mañana (${nota.fechaRecordatorio})</span>`;
            } else {
                // Fecha normal futura o pasada
                badgeFecha = `<span class="badge bg-light text-dark border mt-2"><i class="bi bi-calendar3 me-1"></i>${nota.fechaRecordatorio}</span>`;
            }
        }

        let iconoPrivada = nota.privada ? '<i class="bi bi-key-fill text-warning me-1" title="Nota privada"></i>' : '';

        card.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start gap-2">
                    <p class="mb-1 text-break" style="white-space: pre-wrap; font-size: inherit;">${iconoPrivada}${escapeHtml(nota.texto)}</p>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-link text-muted p-0 text-decoration-none" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="font-size: 0.85rem;">
                            <li><button class="dropdown-item py-1" onclick="abrirEditor(${nota.id})"><i class="bi bi-pencil me-2"></i>Editar</button></li>
                            <li><button class="dropdown-item py-1 text-danger" onclick="eliminarNota(${nota.id})"><i class="bi bi-trash me-2"></i>Eliminar</button></li>
                        </ul>
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
    if (input) input.value = '';
    const clearBtn = document.getElementById('clear-search');
    if (clearBtn) clearBtn.style.display = 'none';
    cargarNotas();
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
    
    if (btn && inputHidden) {
        inputHidden.value = modoPrivadaCreacionActivo;
        if (modoPrivadaCreacionActivo) {
            btn.innerHTML = '<i class="bi bi-lock text-warning"></i>';
            btn.title = "Nota privada activada";
            btn.classList.add('active');
        } else {
            btn.innerHTML = '<i class="bi bi-unlock"></i>';
            btn.title = "Hacer nota privada";
            btn.classList.remove('active');
        }
    }
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
    }, 1000);
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
function procesarArchivoBackup(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            const listaNotas = Array.isArray(contenido) ? contenido : contenido.notas;
            const passwordGuardado = Array.isArray(contenido) ? null : contenido.passHash;

            if (listaNotas) {
                localStorage.setItem('notegeli_notes', JSON.stringify(listaNotas));
                
                // Forzamos que se guarde estrictamente como un string limpio de texto plano
                if (passwordGuardado !== null && passwordGuardado !== undefined) {
                    localStorage.setItem('notegeli_pass', String(passwordGuardado).replace(/["']/g, ""));
                }

                alert("¡Copia de seguridad restaurada con éxito!");
                location.reload(); 
            } else {
                alert("El archivo no tiene un formato de notas válido.");
            }
        } catch (error) {
            alert("Error al leer el archivo de respaldo.");
            console.error(error);
        }
    };
    lector.readAsText(archivo);
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
        mostrarToast("¡Todo listo!", "Contraseña establecida.", "success");
        cargarNotas();
        return;
    } 

    if (passHash === passwordGuardada) {
        accesoPrivadoConcedido = true;
        document.querySelector('.app-container').classList.add('modo-privado-activo');
        cerrarModalLock();
        const btnLlave = document.getElementById('btn-icono-llave');
        if (btnLlave) btnLlave.classList.add('text-warning');
        cargarNotas();
        mostrarToast("Acceso concedido", "Notas privadas desbloqueadas.", "success");
    } else {
        inputPass.value = ''; 
        inputPass.focus();
        mostrarToast("Acceso denegado", "La contraseña es incorrecta.", "error");
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

// Obtiene la fecha actual o con offset en formato 'YYYY-MM-DD' local
function obtenerFechaLocal(diasOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + diasOffset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function importarBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                if (!data.notas || !Array.isArray(data.notas)) {
                    throw new Error("Formato inválido");
                }

                notas = data.notas;
                guardarEnLocalStorage();

                if (data.passHash) {
                    localStorage.setItem('notegeli_pass', data.passHash);
                }

                cargarNotas();
                mostrarToast("Restaurado", "Las notas se han recuperado correctamente.", "success");

            } catch (err) {
                console.error(err);
                mostrarToast("Error", "El archivo de backup está corrupto o no es válido.", "error");
            }
        };
        reader.readAsText(file);
    };

    input.click();
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
    container.classList.remove('font-normal', 'font-grande', 'font-muy-grande');
    if (tamano === 'grande') container.style.fontSize = '1.1rem';
    else if (tamano === 'muy-grande') container.style.fontSize = '1.25rem';
    else container.style.fontSize = '1rem';
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