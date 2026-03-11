// ============================================
// CONFIGURACION DE FAMILIA - FamilyList
// ============================================
// Nota: La verificacion de autenticacion se maneja en auth.js

// Generar codigo aleatorio de 6 caracteres
function generarCodigo() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const overlay = document.getElementById('loading-overlay');
    if (mostrar) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// Mostrar mensaje temporal
function mostrarMensaje(texto, tipo) {
    const mensajeExistente = document.querySelector('.mensaje-temporal');
    if (mensajeExistente) {
        mensajeExistente.remove();
    }

    const mensaje = document.createElement('div');
    mensaje.className = `mensaje-temporal mensaje-${tipo}`;
    mensaje.textContent = texto;
    document.body.appendChild(mensaje);

    setTimeout(() => {
        mensaje.classList.add('ocultar');
        setTimeout(() => mensaje.remove(), 300);
    }, 3000);
}

// Crear nueva familia
async function crearFamilia(nombre) {
    const user = auth.currentUser;
    if (!user) {
        console.error('No hay usuario autenticado');
        mostrarMensaje('Debes iniciar sesion primero', 'error');
        return;
    }

    console.log('Iniciando creacion de familia para usuario:', user.uid);
    mostrarLoading(true);

    try {
        let codigo = generarCodigo();
        console.log('Codigo generado:', codigo);

        // Paso 1: Verificar que el codigo no exista
        console.log('PASO 1: Verificando codigo unico...');
        try {
            const existente = await db.collection('familias')
                .where('codigo', '==', codigo)
                .get();
            console.log('PASO 1 OK: Query de familias exitoso');

            if (!existente.empty) {
                codigo = generarCodigo();
                console.log('Codigo duplicado, nuevo codigo:', codigo);
            }
        } catch (e) {
            console.error('PASO 1 FALLO: Error en query de familias', e.code, e.message);
            throw e;
        }

        // Paso 2: Crear documento de familia
        console.log('PASO 2: Creando documento de familia...');
        let familiaRef;
        try {
            familiaRef = await db.collection('familias').add({
                nombre: nombre,
                creador: user.uid,
                miembros: [user.uid],
                codigo: codigo,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('PASO 2 OK: Familia creada con ID:', familiaRef.id);
        } catch (e) {
            console.error('PASO 2 FALLO: Error creando familia', e.code, e.message);
            throw e;
        }

        // Paso 3: Actualizar usuario con familiaId
        console.log('PASO 3: Actualizando usuario con familiaId...');
        try {
            await db.collection('usuarios').doc(user.uid).set({
                familiaId: familiaRef.id
            }, { merge: true });
            console.log('PASO 3 OK: Usuario actualizado correctamente');
        } catch (e) {
            console.error('PASO 3 FALLO: Error actualizando usuario', e.code, e.message);
            throw e;
        }

        mostrarLoading(false);
        mostrarMensaje(`Familia creada. Codigo: ${codigo}`, 'exito');

        // Redirigir a lista despues de un momento
        setTimeout(() => {
            window.location.href = 'lista.html';
        }, 1500);

    } catch (error) {
        mostrarLoading(false);
        console.error('Error creando familia:', error);
        console.error('Codigo de error:', error.code);
        console.error('Mensaje:', error.message);

        // Mostrar mensaje mas especifico
        let mensajeError = 'Error al crear la familia';
        if (error.code === 'permission-denied') {
            mensajeError = 'Sin permisos. Verifica las reglas de Firebase.';
        } else if (error.code === 'unavailable') {
            mensajeError = 'Sin conexion al servidor.';
        } else if (error.message) {
            mensajeError = error.message;
        }
        mostrarMensaje(mensajeError, 'error');
    }
}

// Unirse a familia existente
async function unirseFamilia(codigo) {
    const user = auth.currentUser;
    if (!user) return;

    mostrarLoading(true);

    try {
        // Buscar familia por codigo
        const query = await db.collection('familias')
            .where('codigo', '==', codigo.toUpperCase())
            .get();

        if (query.empty) {
            mostrarLoading(false);
            mostrarMensaje('Codigo de familia no valido', 'error');
            return;
        }

        const familiaDoc = query.docs[0];
        const familiaId = familiaDoc.id;

        // Agregar usuario a la lista de miembros
        await db.collection('familias').doc(familiaId).update({
            miembros: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });

        // Actualizar usuario con familiaId (usar set con merge para evitar error si no existe)
        await db.collection('usuarios').doc(user.uid).set({
            familiaId: familiaId
        }, { merge: true });

        mostrarLoading(false);
        mostrarMensaje('Te has unido a la familia', 'exito');

        // Redirigir a lista despues de un momento
        setTimeout(() => {
            window.location.href = 'lista.html';
        }, 1500);

    } catch (error) {
        mostrarLoading(false);
        console.error('Error uniendose a familia:', error);
        mostrarMensaje('Error al unirse a la familia', 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Formulario crear familia
    document.getElementById('form-crear').addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre-familia').value.trim();
        if (nombre) {
            crearFamilia(nombre);
        }
    });

    // Formulario unirse a familia
    document.getElementById('form-unirse').addEventListener('submit', (e) => {
        e.preventDefault();
        const codigo = document.getElementById('codigo-familia').value.trim();
        if (codigo.length === 6) {
            unirseFamilia(codigo);
        } else {
            mostrarMensaje('El codigo debe tener 6 caracteres', 'error');
        }
    });
});
