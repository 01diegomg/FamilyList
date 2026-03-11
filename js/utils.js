// ============================================
// UTILIDADES - FamilyList
// ============================================

// ==================== DETECCION DE RED ====================

const NetworkUtils = {
    // Verificar si hay conexion a internet
    isOnline: function() {
        return navigator.onLine;
    },

    // Escuchar cambios de conexion
    onConnectionChange: function(callback) {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));

        // Retornar estado inicial
        return this.isOnline();
    },

    // Mostrar/ocultar banner de sin conexion
    initConnectionBanner: function() {
        // Crear banner si no existe
        if (!document.getElementById('offline-banner')) {
            const banner = document.createElement('div');
            banner.id = 'offline-banner';
            banner.className = 'offline-banner';
            banner.innerHTML = '⚠️ Sin conexion a internet - Los cambios se sincronizaran cuando vuelvas a conectarte';
            document.body.insertBefore(banner, document.body.firstChild);
        }

        const banner = document.getElementById('offline-banner');

        this.onConnectionChange((isOnline) => {
            if (isOnline) {
                banner.classList.remove('visible');
                mostrarMensaje('Conexion restaurada', 'exito');
            } else {
                banner.classList.add('visible');
            }
        });

        // Estado inicial
        if (!this.isOnline()) {
            banner.classList.add('visible');
        }
    }
};

// ==================== ERRORES DE FIRESTORE ====================

const ErrorUtils = {
    // Traducir errores de Firestore a espanol
    traducirErrorFirestore: function(error) {
        // Si es un error de Firebase con codigo
        if (error.code) {
            const errores = {
                // Errores de red
                'unavailable': 'Sin conexion al servidor. Verifica tu internet.',
                'network-request-failed': 'Error de conexion. Verifica tu internet.',

                // Errores de permisos
                'permission-denied': 'No tienes permiso para realizar esta accion.',
                'unauthenticated': 'Tu sesion ha expirado. Inicia sesion de nuevo.',

                // Errores de datos
                'not-found': 'El elemento no fue encontrado.',
                'already-exists': 'El elemento ya existe.',
                'cancelled': 'Operacion cancelada.',
                'deadline-exceeded': 'La operacion tardo demasiado. Intenta de nuevo.',

                // Errores de cuota
                'resource-exhausted': 'Demasiadas solicitudes. Espera un momento.',

                // Otros
                'invalid-argument': 'Datos invalidos. Verifica la informacion.',
                'failed-precondition': 'No se puede realizar esta accion ahora.',
                'aborted': 'Operacion interrumpida. Intenta de nuevo.',
                'out-of-range': 'Valor fuera de rango.',
                'unimplemented': 'Funcion no disponible.',
                'internal': 'Error interno del servidor.',
                'data-loss': 'Error al guardar datos.'
            };

            // Buscar el codigo en el mensaje de error
            for (const [codigo, mensaje] of Object.entries(errores)) {
                if (error.code.includes(codigo)) {
                    return mensaje;
                }
            }
        }

        // Si no hay internet
        if (!navigator.onLine) {
            return 'Sin conexion a internet. Los cambios se guardaran cuando vuelvas a conectarte.';
        }

        // Error generico
        return error.message || 'Ocurrio un error. Intenta de nuevo.';
    },

    // Verificar si es error de red
    isNetworkError: function(error) {
        if (!navigator.onLine) return true;
        if (error.code) {
            return error.code.includes('unavailable') ||
                   error.code.includes('network');
        }
        return false;
    }
};

// ==================== ESTILOS DEL BANNER ====================

// Agregar estilos CSS para el banner de offline
const style = document.createElement('style');
style.textContent = `
    .offline-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #f44336;
        color: white;
        text-align: center;
        padding: 10px;
        font-size: 14px;
        z-index: 9999;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
    }

    .offline-banner.visible {
        transform: translateY(0);
    }
`;
document.head.appendChild(style);
