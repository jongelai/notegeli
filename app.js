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
            badgeFecha = `<span class="badge bg-light text-dark border mt-2"><i class="bi bi-calendar3 me-1"></i>${nota.fechaRecordatorio}</span>`;
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
    if (confirm('¿Seguro que deseas eliminar esta nota?')) {
        notas = notas.filter(n => n.id !== id);
        guardarEnLocalStorage();
        cargarNotas();
    }
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
// NOTAS PRIVADAS & LLAVE / PASSWORD
// ==========================================
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

function intentarAbrirPrivadas() {
    if (accesoPrivadoConcedido) {
        // Si ya estaban abiertas, las bloqueamos de nuevo
        accesoPrivadoConcedido = false;
        const btnLlave = document.getElementById('btn-icono-llave');
        if (btnLlave) btnLlave.classList.remove('text-warning');
        alert("Notas privadas bloqueadas de nuevo.");
        cargarNotas();
    } else {
        // Mostrar modal de contraseña
        const modal = document.getElementById('view-lock');
        if (modal) modal.style.display = 'flex';
        document.getElementById('input-lock-pass').value = '';
        document.getElementById('input-lock-pass').focus();
    }
}

function cerrarModalLock() {
    const modal = document.getElementById('view-lock');
    if (modal) modal.style.display = 'none';
}

function verificarPasswordLock() {
    const passInput = document.getElementById('input-lock-pass').value;
    let passwordGuardada = localStorage.getItem('notegeli_pass');

    if (!passwordGuardada) {
        // Si no hay contraseña establecida, configuramos una nueva
        if (passInput.trim().length > 0) {
            localStorage.setItem('notegeli_pass', passInput);
            accesoPrivadoConcedido = true;
            cerrarModalLock();
            const btnLlave = document.getElementById('btn-icono-llave');
            if (btnLlave) btnLlave.classList.add('text-warning');
            alert("¡Contraseña establecida y notas privadas desbloqueadas!");
            cargarNotas();
        } else {
            alert("Introduce una contraseña válida.");
        }
    } else {
        if (passInput === passwordGuardada) {
            accesoPrivadoConcedido = true;
            cerrarModalLock();
            const btnLlave = document.getElementById('btn-icono-llave');
            if (btnLlave) btnLlave.classList.add('text-warning');
            cargarNotas();
        } else {
            alert("Contraseña incorrecta.");
        }
    }
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
        // Reemplazar símbolos visuales por operadores de JS seguros
        let expresion = display.value.replace(/×/g, '*').replace(/÷/g, '/');
        let resultado = eval(expresion);
        display.value = resultado;
    } catch {
        display.value = 'Error';
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
    // Efecto visual de selección en los círculos de colores
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