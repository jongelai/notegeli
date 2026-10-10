var meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

var sesionPrivadaDesbloqueada = false;
var creandoNotaPrivada = false;

// Inicialización unificada al cargar el DOM
document.addEventListener("DOMContentLoaded", function() {
    mostrarFechaDeHoy();
    cargarNotasYAlertas();
    
    // Cargar tamaño de fuente guardado
    var tamanoGuardado = localStorage.getItem("notegeli_font_size") || "normal";
    aplicarTamanoFuente(tamanoGuardado);

    // Iniciar reloj en tiempo real
    actualizarRelojFooter();
    setInterval(actualizarRelojFooter, 1000);
});

function actualizarRelojFooter() {
    var ahora = new Date();
    var horas = String(ahora.getHours()).padStart(2, '0');
    var minutos = String(ahora.getMinutes()).padStart(2, '0');
    var segundos = String(ahora.getSeconds()).padStart(2, '0');
    
    var relojElem = document.getElementById("hora-footer");
    if (relojElem) {
        relojElem.innerText = horas + ":" + minutos + ":" + segundos;
    }
}

function cambiarTamanoFuente(tamano) {
    localStorage.setItem("notegeli_font_size", tamano);
    aplicarTamanoFuente(tamano);
}

function aplicarTamanoFuente(tamano) {
    document.body.classList.remove("font-normal", "font-grande", "font-muy-grande");
    document.body.classList.add("font-" + tamano);
}

function mostrarFechaDeHoy() {
    var hoy = new Date();
    var fechaLarga = hoy.getDate() + " " + meses[hoy.getMonth()] + " " + hoy.getFullYear();
    document.getElementById("fecha-actual-txt").innerText = fechaLarga;
}

function obtenerNotasDeMemoria() {
    return JSON.parse(localStorage.getItem("notegeli_notas")) || [];
}

function guardarNotasEnMemoria(notas) {
    localStorage.setItem("notegeli_notas", JSON.stringify(notas));
    cargarNotasYAlertas();
}

// Función para formatear fechas tipo "2026-10-15" a formato legible en español
function formatearFechaLegible(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
    const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return fecha.toLocaleDateString('es-ES', opciones);
}

function cargarNotasYAlertas(filtro = "") {
    var notas = obtenerNotasDeMemoria();
    var containerNotas = document.getElementById("notes-scroll-container");
    var containerAvisos = document.getElementById("avisos-container");
    
    containerNotas.innerHTML = "";
    containerAvisos.innerHTML = "";
    
    var mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    var año = mañana.getFullYear();
    var mes = String(mañana.getMonth() + 1).padStart(2, '0');
    var dia = String(mañana.getDate()).padStart(2, '0');
    var mañanaStr = año + "-" + mes + "-" + dia;

    var tieneAvisos = false;

    notas.forEach(function(n) {
        // Si la nota es privada y la sesión no está desbloqueada, no se muestra en avisos ni en el feed principal
        if (n.privada && !sesionPrivadaDesbloqueada) {
            return; 
        }

        if (n.fecha_recordatorio === mañanaStr && !n.contenido.startsWith('data:image/')) {
            tieneAvisos = true;
            var avisoHTML = '<div id="aviso-' + n.id + '" class="aviso-barra d-flex align-items-center" style="background: rgba(0, 255, 204, 0.1); border: 1px solid rgba(0, 255, 204, 0.3); border-radius: 10px; padding: 10px 15px; margin-bottom: 8px;">' +
                '<div class="calendar-icon-container" style="margin-right: 12px;"><i class="bi bi-calendar3 pulse-icon" style="color: #00b38f; font-size: 1.1rem;"></i></div>' +
                '<div class="flex-grow-1" style="overflow: hidden;">' +
                    '<small style="color: #00b38f; font-weight: bold; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; display: block;">Mañana</small>' +
                    '<span style="color: #ffffff !important; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">' + n.contenido + '</span>' +
                '</div>' +
                '<button onclick="eliminarNota(' + n.id + ')" style="background: none; border: none; color: #ff4444; padding: 5px; font-size: 1.1rem;" title="Borrar"><i class="bi bi-trash3-fill"></i></button>' +
            '</div>';
            containerAvisos.innerHTML += avisoHTML;
        }

        var esImagen = n.contenido.startsWith('data:image/');

        // --- FILTRO DE BÚSQUEDA ---
        if (filtro && !esImagen) {
            var textoNota = (n.contenido || "").toLowerCase();
            if (!textoNota.includes(filtro)) {
                return; // Si no coincide con la búsqueda, se omite de la lista
            }
        }
        // -------------------------

        var estiloColor = n.color ? 'background-color: ' + n.color + ' !important; border-color: transparent;' : '';
        var claseTinted = n.color ? 'tinted' : '';
        
        // Distintivo visual si la nota es privada
        if (n.privada) {
            estiloColor += ' border-left: 4px solid #d97706 !important;';
        }

        // Vista previa colapsada para notas largas (máximo 3 líneas)
        var cuerpoNota = esImagen ? 
            '<img src="' + n.contenido + '" class="img-garabato">' : 
            '<div class="nota-texto-preview">' + n.contenido + '</div>';
        
        var fechaFormateada = formatearFechaLegible(n.fecha_recordatorio);
        var tagFecha = n.fecha_recordatorio ? '<div class="nota-fecha-badge mt-2"><i class="bi bi-calendar3"></i><span>' + fechaFormateada + '</span></div>' : '';

        var notaHTML = '<div class="nota-fila ' + claseTinted + '" id="nota-' + n.id + '" style="' + estiloColor + '">' +
            '<div class="nota-link flex-fill d-flex flex-column" style="cursor:pointer" onclick="clickNota(' + n.id + ', ' + esImagen + ')">' +
                cuerpoNota + tagFecha +
            '</div>' +
            '<button onclick="eliminarNota(' + n.id + ')" class="btn-delete" style="background:none; border:none; padding:0 8px; color:#ff4444; font-size:1.1rem;" title="Borrar">' +
                '<i class="bi bi-trash3-fill"></i>' +
            '</button>' +
        '</div>';
        
        containerNotas.innerHTML += notaHTML;
    });

    containerAvisos.style.display = tieneAvisos ? "block" : "none";
}

function clickNota(id, esImagen) {
    var ArrayNotas = obtenerNotasDeMemoria();
    var encontrada = ArrayNotas.find(function(item) { return item.id === id; });
    if (!encontrada) return;

    if (esImagen) {
        alert("Visualizando garabato local");
    } else {
        abrirEditor(encontrada.id, encontrada.contenido, encontrada.color, encontrada.fecha_recordatorio);
    }
}

function crearNota(event) {
    event.preventDefault();
    var textoInput = document.getElementById("nueva-nota-texto");
    var fechaInput = document.getElementById("nueva-nota-fecha");
    var privadaInput = document.getElementById("nueva-nota-privada");
    
    if (!textoInput.value.trim()) return;

    var lista = obtenerNotasDeMemoria();
    var nuevaNota = {
        id: Date.now(),
        contenido: textoInput.value,
        fecha_recordatorio: fechaInput.value || null,
        color: "",
        privada: privadaInput.value === "true",
        fecha_creacion: new Date().toISOString()
    };

    lista.unshift(nuevaNota);
    guardarNotasEnMemoria(lista);

    textoInput.value = "";
    fechaInput.value = "";
    document.getElementById("nueva-fecha-preview").innerText = "";
    
    // Resetear estado del botón privado tras crear
    if (creandoNotaPrivada) {
        toggleModoPrivadaCreacion();
    }
}

function eliminarNota(id) {
    var lista = obtenerNotasDeMemoria();
    lista = lista.filter(function(n) { return n.id !== id; });
    guardarNotasEnMemoria(lista);
}

function abrirEditor(id, contenido, color, fecha) {
    document.getElementById("view-main").style.display = "none";
    document.getElementById("view-edit").style.display = "flex";

    document.getElementById("edit-id").value = id;
    document.getElementById("edit-textarea").value = contenido;
    document.getElementById("edit-color-input").value = color;
    document.getElementById("edit-fecha-input").value = fecha || "";
    document.getElementById("edit-fecha-preview").innerText = fecha || "";
}

function cerrarEditor() {
    document.getElementById("view-edit").style.display = "none";
    document.getElementById("view-main").style.display = "block";
}

function seleccionarColor(elemento, color) {
    document.getElementById("edit-color-input").value = color;
    var botones = document.querySelectorAll('.btn-color-dot');
    botones.forEach(function(b) { b.style.outline = "none"; });
    if(color !== "") {
        elemento.style.outline = "2px solid #333";
    }
}

function guardarEdicion(event) {
    event.preventDefault();
    var id = parseInt(document.getElementById("edit-id").value);
    var texto = document.getElementById("edit-textarea").value;
    var color = document.getElementById("edit-color-input").value;
    var fecha = document.getElementById("edit-fecha-input").value;

    var lista = obtenerNotasDeMemoria();
    var index = lista.findIndex(function(n) { return n.id === id; });
    
    if (index !== -1) {
        lista[index].contenido = texto;
        lista[index].color = color;
        lista[index].fecha_recordatorio = fecha || null;
        guardarNotasEnMemoria(lista);
    }
    cerrarEditor();
}

function actualizarFechaPreview() {
    var fecha = document.getElementById("nueva-nota-fecha").value;
    document.getElementById("nueva-fecha-preview").innerText = fecha;
}

function actualizarFechaEditPreview() {
    var fecha = document.getElementById("edit-fecha-input").value;
    document.getElementById("edit-fecha-preview").innerText = fecha;
}

// --- FUNCIONES DE LA CALCULADORA ---
function abrirCalculadoraModal() {
    document.getElementById("view-calc").style.display = "flex";
}

function cerrarCalculadoraModal() {
    document.getElementById("view-calc").style.display = "none";
}

function calcAppend(val) {
    var display = document.getElementById("calc-display");
    if (display.value === "0" || display.value === "Error") {
        display.value = val;
    } else {
        display.value += val;
    }
}

function calcClear() {
    document.getElementById("calc-display").value = "0";
}

function calcCalculate() {
    var display = document.getElementById("calc-display");
    try {
        var resultado = eval(display.value.replace(/×/g, '*').replace(/÷/g, '/'));
        display.value = resultado;
        var textoNota = document.getElementById("nueva-nota-texto");
        textoNota.value += (textoNota.value ? " " : "") + "= " + resultado;
    } catch (e) {
        display.value = "Error";
    }
}

// --- FUNCIONES DE BÚSQUEDA ---
function toggleBarraBusqueda() {
    var contenedor = document.getElementById("container-buscador-desplegable");
    if (contenedor.style.display === "none") {
        contenedor.style.display = "block";
        document.getElementById("input-buscar").focus();
    } else {
        contenedor.style.display = "none";
        limpiarBusqueda();
    }
}

function filtrarNotas() {
    var input = document.getElementById("input-buscar");
    var query = input.value.toLowerCase().trim();
    var btnClear = document.getElementById("clear-search");
    
    if (btnClear) {
        btnClear.style.display = query.length > 0 ? "block" : "none";
    }

    cargarNotasYAlertas(query);
}

function limpiarBusqueda() {
    var input = document.getElementById("input-buscar");
    input.value = "";
    document.getElementById("clear-search").style.display = "none";
    cargarNotasYAlertas();
}

// --- FUNCIONES DE NOTAS PRIVADAS (LLAVE) ---
function toggleModoPrivadaCreacion() {
    creandoNotaPrivada = !creandoNotaPrivada;
    var btn = document.getElementById("btn-toggle-privada");
    var inputPrivada = document.getElementById("nueva-nota-privada");
    
    inputPrivada.value = creandoNotaPrivada;
    if (creandoNotaPrivada) {
        btn.innerHTML = '<i class="bi bi-lock-fill" style="color: #d97706;"></i>';
        btn.style.background = '#fef3c7';
    } else {
        btn.innerHTML = '<i class="bi bi-unlock"></i>';
        btn.style.background = '#f8fafc';
    }
}

function intentarAbrirPrivadas() {
    var passGuardada = localStorage.getItem("notegeli_lock_pass");
    
    if (!passGuardada) {
        var nuevaPass = prompt("Configura tu contraseña de acceso para notas privadas:");
        if (nuevaPass && nuevaPass.trim() !== "") {
            localStorage.setItem("notegeli_lock_pass", nuevaPass.trim());
            alert("¡Contraseña configurada con éxito! Vuelve a pulsar la llave para desbloquear.");
        }
        return;
    }

    if (sesionPrivadaDesbloqueada) {
        sesionPrivadaDesbloqueada = false;
        document.getElementById("btn-icono-llave").style.background = "#f8fafc";
        document.getElementById("btn-icono-llave").style.color = "#d97706";
        alert("Sesión privada bloqueada de nuevo.");
        cargarNotasYAlertas();
    } else {
        document.getElementById("view-lock").style.display = "flex";
        document.getElementById("input-lock-pass").value = "";
        document.getElementById("input-lock-pass").focus();
    }
}

function cerrarModalLock() {
    document.getElementById("view-lock").style.display = "none";
}

function verificarPasswordLock() {
    var passIngresada = document.getElementById("input-lock-pass").value;
    var passGuardada = localStorage.getItem("notegeli_lock_pass");

    if (passIngresada === passGuardada) {
        sesionPrivadaDesbloqueada = true;
        cerrarModalLock();
        
        // Cambiar estética de la llave para indicar que está desbloqueado
        var btnLlave = document.getElementById("btn-icono-llave");
        btnLlave.style.background = '#fef3c7';
        btnLlave.style.color = '#d97706';

        cargarNotasYAlertas();
        alert("¡Acceso concedido! Mostrando notas privadas.");
    } else {
        alert("Contraseña incorrecta.");
        document.getElementById("input-lock-pass").value = "";
    }
}