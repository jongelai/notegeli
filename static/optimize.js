// ======================================
// NOTEGELI - Optimización de Fluidez
// ======================================

// --- CREAR NOTA CON AJAX ---
document.addEventListener('DOMContentLoaded', () => {
    const formNueva = document.querySelector('.nuevo-form');
    const textareaInput = document.querySelector('.textarea');
    
    if (formNueva) {
        formNueva.addEventListener('submit', (e) => {
            e.preventDefault();
            crearNotaAjax();
        });
    }

    // Delegación para borrar notas
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete')) {
            e.preventDefault();
            const elem = e.target.closest('.btn-delete');
            const notaId = elem.closest('.nota-fila')?.id.replace('nota-', '');
            if (notaId) borrarNotaAjax(notaId, elem);
        }
    });

    // Guardar edición
    const formEdit = document.getElementById('form-edit');
    if (formEdit) {
        formEdit.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarEdicionAjax();
        });
    }
});

async function crearNotaAjax() {
    const texto = document.querySelector('.textarea').value.trim();
    const fecha = document.querySelector('.input-fecha-hidden').value;
    
    if (!texto) {
        alert('Escribe algo primero');
        return;
    }

    // Mostrar loader
    const btn = document.querySelector('.btn-amber');
    const btnOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    btn.disabled = true;

    try {
        const response = await fetch('/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({
                texto: texto,
                fecha: fecha
            })
        });

        if (response.ok) {
            // Agregar nota al DOM sin recargar
            const notasScroll = document.querySelector('.notes-scroll');
            const nuevaNota = crearElementoNota(texto, fecha);
            notasScroll.insertAdjacentHTML('afterbegin', nuevaNota);

            // Limpiar formulario
            document.querySelector('.textarea').value = '';
            document.querySelector('.input-fecha-hidden').value = '';
            document.querySelector('.fecha-preview').textContent = '';

            // Mostrar feedback
            mostrarNotificacion('✓ Nota agregada');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al crear nota');
    } finally {
        btn.innerHTML = btnOriginal;
        btn.disabled = false;
    }
}

async function borrarNotaAjax(notaId, elemento) {
    const notaDiv = elemento.closest('.nota-fila');
    
    try {
        const response = await fetch(`/borrar/${notaId}`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (response.ok) {
            // Animación de desaparición
            notaDiv.style.opacity = '0';
            notaDiv.style.transform = 'translateX(100%)';
            notaDiv.style.transition = 'all 0.3s ease';
            
            setTimeout(() => notaDiv.remove(), 300);
            mostrarNotificacion('✓ Nota eliminada');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al borrar nota');
    }
}

async function guardarEdicionAjax() {
    const id = document.getElementById('edit-id').value;
    const texto = document.getElementById('edit-textarea').value.trim();
    const color = document.getElementById('edit-color-input').value;
    const fecha = document.getElementById('edit-fecha-input').value;

    if (!texto) {
        alert('La nota no puede estar vacía');
        return;
    }

    const btn = document.querySelector('#view-edit .btn-amber');
    const btnOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
    btn.disabled = true;

    try {
        const response = await fetch('/editar_guardar', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({
                id: id,
                texto: texto,
                color: color,
                nueva_fecha: fecha
            })
        });

        if (response.ok) {
            // Actualizar nota en el DOM
            const notaDiv = document.getElementById(`nota-${id}`);
            const notaSpan = notaDiv.querySelector('.nota-texto');
            if (notaSpan) notaSpan.textContent = texto;
            
            if (color) {
                notaDiv.style.borderLeftColor = color;
                notaDiv.style.setProperty('--color-base', color);
            }

            cerrarEditor();
            mostrarNotificacion('✓ Nota guardada');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar');
    } finally {
        btn.innerHTML = btnOriginal;
        btn.disabled = false;
    }
}

function crearElementoNota(contenido, fecha) {
    const fechaHtml = fecha ? `<div class="nota-fecha-tag mt-1"><i class="bi bi-calendar3"></i><span>${fecha}</span></div>` : '';
    return `
        <div class="nota-fila" id="nota-new" style="opacity: 0; transform: translateY(-20px); transition: all 0.3s ease;">
            <div class="nota-link flex-fill d-flex flex-column" style="cursor:pointer">
                <span class="nota-texto">${contenido}</span>
                ${fechaHtml}
            </div>
            <button class="btn-delete"><i class="bi bi-trash3"></i></button>
        </div>
    `;
}

function mostrarNotificacion(mensaje) {
    const notif = document.createElement('div');
    notif.textContent = mensaje;
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00ffcc;
        color: #000;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
        font-weight: bold;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}
