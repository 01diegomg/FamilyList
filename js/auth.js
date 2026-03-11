// ============================================
// AUTENTICACION - FamilyList
// ============================================

// Provider de Google
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Verificar estado de autenticacion al cargar cualquier pagina
auth.onAuthStateChanged(async (user) => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Paginas que NO requieren autenticacion
    const paginasPublicas = ['index.html', ''];

    // Paginas que requieren familia configurada
    const paginasConFamilia = ['lista.html', 'perfil.html'];

    // Paginas del flujo de onboarding (requieren auth pero NO familia)
    const paginasOnboarding = ['bienvenida.html', 'familia.html'];

    if (user) {
        // Usuario autenticado
        console.log('Usuario autenticado:', user.email);

        const tieneFamilia = await verificarUsuarioTieneFamilia(user.uid);

        // Si esta en login, redirigir segun estado de familia
        if (paginasPublicas.includes(currentPage)) {
            if (tieneFamilia) {
                window.location.href = 'lista.html';
            } else {
                window.location.href = 'bienvenida.html';
            }
        }
        // Si esta en paginas que requieren familia
        else if (paginasConFamilia.includes(currentPage)) {
            if (!tieneFamilia) {
                window.location.href = 'bienvenida.html';
            }
        }
        // Si esta en onboarding pero ya tiene familia, ir a lista
        else if (paginasOnboarding.includes(currentPage)) {
            if (tieneFamilia) {
                window.location.href = 'lista.html';
            }
        }
    } else {
        // Usuario no autenticado - solo puede estar en paginas publicas
        console.log('Usuario no autenticado');

        if (!paginasPublicas.includes(currentPage)) {
            window.location.href = 'index.html';
        }
    }
});

// Verificar si usuario tiene familia configurada
async function verificarUsuarioTieneFamilia(uid) {
    try {
        const doc = await db.collection('usuarios').doc(uid).get();
        if (doc.exists) {
            const datos = doc.data();
            return datos.familiaId && datos.familiaId.length > 0;
        }
        return false;
    } catch (error) {
        console.error('Error verificando familia:', error);
        return false;
    }
}

// Funcion para registrar nuevo usuario con email/password
async function registrarUsuario(email, password, nombre) {
    try {
        // Crear usuario en Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Guardar datos adicionales en Firestore
        await db.collection('usuarios').doc(user.uid).set({
            uid: user.uid,
            nombre: nombre,
            email: email,
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Usuario registrado exitosamente');
        return { success: true, user: user };
    } catch (error) {
        console.error('Error al registrar:', error);
        return { success: false, error: traducirError(error.code) };
    }
}

// Funcion para iniciar sesion con email/password
async function iniciarSesion(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Sesion iniciada exitosamente');
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Error al iniciar sesion:', error);
        return { success: false, error: traducirError(error.code) };
    }
}

// Funcion para iniciar sesion con Google
async function iniciarSesionConGoogle() {
    try {
        console.log('Iniciando Google Sign-In...');
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        console.log('Usuario autenticado con Google:', user.email);

        // Verificar si el usuario ya existe en Firestore
        const userDoc = await db.collection('usuarios').doc(user.uid).get();

        if (!userDoc.exists) {
            // Crear documento del usuario si es nuevo
            await db.collection('usuarios').doc(user.uid).set({
                uid: user.uid,
                nombre: user.displayName || 'Usuario',
                email: user.email,
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Nuevo usuario creado en Firestore');
        }

        console.log('Sesion con Google iniciada exitosamente');
        return { success: true, user: user };
    } catch (error) {
        console.error('Error completo:', error);
        console.error('Codigo de error:', error.code);
        console.error('Mensaje:', error.message);

        // Manejar errores especificos de Google
        if (error.code === 'auth/popup-closed-by-user') {
            return { success: false, error: 'Inicio de sesion cancelado' };
        }
        if (error.code === 'auth/popup-blocked') {
            return { success: false, error: 'El popup fue bloqueado. Permite popups para este sitio.' };
        }

        return { success: false, error: traducirError(error.code) };
    }
}

// Funcion para cerrar sesion
async function cerrarSesion() {
    try {
        await auth.signOut();
        console.log('Sesion cerrada');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesion:', error);
    }
}

// Obtener datos del usuario actual
async function obtenerDatosUsuario() {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const doc = await db.collection('usuarios').doc(user.uid).get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        return null;
    }
}

// Obtener nombre del usuario con fallback robusto
// Prioridad: 1) Documento Firestore, 2) displayName de Auth, 3) parte del email
async function obtenerNombreUsuarioRobusto() {
    const user = auth.currentUser;
    if (!user) return 'Usuario';

    // Intentar desde Firestore primero
    try {
        const doc = await db.collection('usuarios').doc(user.uid).get();
        if (doc.exists) {
            const datos = doc.data();
            if (datos.nombre && datos.nombre !== 'Usuario') {
                return datos.nombre;
            }
        }
    } catch (error) {
        console.error('Error al obtener nombre de Firestore:', error);
    }

    // Fallback: displayName de Firebase Auth
    if (user.displayName) {
        return user.displayName;
    }

    // Ultimo recurso: parte del email antes del @
    if (user.email) {
        return user.email.split('@')[0];
    }

    return 'Usuario';
}

// Traducir errores de Firebase al espanol
function traducirError(codigo) {
    const errores = {
        'auth/email-already-in-use': 'Este correo ya esta registrado',
        'auth/invalid-email': 'El correo electronico no es valido',
        'auth/operation-not-allowed': 'Google Sign-In no esta habilitado. Ve a Firebase Console > Authentication > Sign-in method > Google y habilitalo.',
        'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/user-not-found': 'No existe una cuenta con este correo',
        'auth/wrong-password': 'Contrasena incorrecta',
        'auth/too-many-requests': 'Demasiados intentos. Intenta mas tarde',
        'auth/network-request-failed': 'Error de conexion. Verifica tu internet',
        'auth/popup-closed-by-user': 'Inicio de sesion cancelado',
        'auth/cancelled-popup-request': 'Operacion cancelada',
        'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro metodo',
        'auth/unauthorized-domain': 'Este dominio no esta autorizado. Agrega tu dominio en Firebase Console > Authentication > Settings > Authorized domains',
        'auth/operation-not-supported-in-this-environment': 'No puedes usar Google Sign-In abriendo el archivo directamente. Usa un servidor local (ver consola para instrucciones).'
    };

    if (errores[codigo]) {
        return errores[codigo];
    }

    // Mostrar el codigo real del error para debugging
    console.error('Codigo de error no manejado:', codigo);
    return 'Error: ' + codigo;
}
