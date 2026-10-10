var meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

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

function cargarNotasYAlertas() {
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
        var estiloColor = n.color ? 'background-color: ' + n.color + ' !important; border-color: transparent;' : '';
        var claseTinted = n.color ? 'tinted' : '';

        var cuerpoNota = esImagen ? '<img src="' + n.contenido + '" class="img-garabato">' : '<span class="nota-texto">' + n.contenido + '</span>';
        var tagFecha = n.fecha_recordatorio ? '<div class="nota-fecha-tag mt-1"><i class="bi bi-calendar3"></i><span>' + n.fecha_recordatorio + '</span></div>' : '';

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
    
    if (!textoInput.value.trim()) return;

    var lista = obtenerNotasDeMemoria();
    var nuevaNota = {
        id: Date.now(),
        contenido: textoInput.value,
        fecha_recordatorio: fechaInput.value || null,
        color: "",
        fecha_creacion: new Date().toISOString()
    };

    lista.unshift(nuevaNota);
    guardarNotasEnMemoria(lista);

    textoInput.value = "";
    fechaInput.value = "";
    document.getElementById("nueva-fecha-preview").innerText = "";
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
    
    // Quitar el borde activo a todos los botones de colores y ponérselo al pulsado
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
    
    // AQUÍ ESTABA EL FALLO: leemos directamente del input oculto correcto
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
        // Evaluamos de forma segura la operación matemática básica
        var resultado = eval(display.value.replace(/×/g, '*').replace(/÷/g, '/'));
        display.value = resultado;
        
        // Opcional: si quieres pasar el resultado directamente a la nota al calcular:
        var textoNota = document.getElementById("nueva-nota-texto");
        textoNota.value += (textoNota.value ? " " : "") + "= " + resultado;
    } catch (e) {
        display.value = "Error";
    }
}