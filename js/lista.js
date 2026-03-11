// ============================================
// LISTA DE COMPRAS - FamilyList
// ============================================

let productosListener = null;
let usuarioActual = null;
let familiaId = null;

// Categorias disponibles
const CATEGORIAS = ['Lacteos', 'Verduras', 'Carnes', 'Limpieza', 'Otros'];

// Unidades con abreviaturas
const UNIDADES_ABREV = {
    'Unidades': 'u',
    'Kilogramos': 'kg',
    'Gramos': 'g',
    'Litros': 'L',
    'Mililitros': 'ml',
    'Docena': 'doc',
    'Paquete': 'paq'
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar deteccion de conexion
    NetworkUtils.initConnectionBanner();

    // Esperar a que el usuario este autenticado
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            usuarioActual = await obtenerDatosUsuario();
            familiaId = usuarioActual?.familiaId;

            if (!familiaId) {
                console.error('Usuario sin familia configurada');
                return;
            }

            inicializarLista();
            configurarEventos();
            inicializarCacheProductos();
        }
    });
});

// Obtener referencia a la coleccion de productos de la familia
function getProductosCollection() {
    if (!familiaId) return null;
    return db.collection('familias').doc(familiaId).collection('productos');
}

// Inicializar escucha en tiempo real de productos
function inicializarLista() {
    const listaContainer = document.getElementById('lista-productos');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const productosCollection = getProductosCollection();

    if (!productosCollection) {
        console.error('No se pudo obtener la coleccion de productos');
        return;
    }

    // Escuchar cambios en tiempo real
    productosListener = productosCollection
        .orderBy('fecha', 'desc')
        .onSnapshot((snapshot) => {
            const productos = [];
            snapshot.forEach((doc) => {
                productos.push({ id: doc.id, ...doc.data() });
            });
            productosCache = productos;
            renderizarLista(productos, filtroCategoria?.value || 'todas');
        }, (error) => {
            console.error('Error al escuchar productos:', error);
            mostrarMensaje('Error al cargar la lista', 'error');
        });
}

// Renderizar lista de productos
function renderizarLista(productos, filtro = 'todas') {
    const listaContainer = document.getElementById('lista-productos');
    if (!listaContainer) return;

    // Filtrar por categoria si es necesario
    let productosFiltrados = productos;
    if (filtro !== 'todas') {
        productosFiltrados = productos.filter(p => p.categoria === filtro);
    }

    if (productosFiltrados.length === 0) {
        listaContainer.innerHTML = `
            <div class="lista-vacia">
                <p>No hay productos en la lista</p>
                <p>Agrega el primer producto con el boton +</p>
            </div>
        `;
        return;
    }

    listaContainer.innerHTML = productosFiltrados.map(producto => {
        const unidad = producto.unidad || 'Unidades';
        const abrev = UNIDADES_ABREV[unidad] || 'u';
        return `
        <div class="producto-item ${producto.comprado ? 'comprado' : ''}" data-id="${producto.id}">
            <div class="producto-check">
                <input type="checkbox"
                       ${producto.comprado ? 'checked' : ''}
                       onchange="toggleComprado('${producto.id}', this.checked)">
            </div>
            <div class="producto-info" onclick="abrirModalEditar('${producto.id}')">
                <span class="producto-nombre">${producto.nombre}</span>
                <span class="producto-cantidad">${producto.cantidad} ${abrev}</span>
                <span class="producto-categoria">${producto.categoria}</span>
                <span class="producto-agregado">Agregado por: ${producto.agregadoPor || 'Desconocido'}</span>
            </div>
            <button class="btn-eliminar" onclick="eliminarProducto('${producto.id}')">
                <span>X</span>
            </button>
        </div>
    `}).join('');
}

// Configurar eventos de la interfaz
function configurarEventos() {
    // Boton agregar producto
    const btnAgregar = document.getElementById('btn-agregar');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', abrirModalAgregar);
    }

    // Filtro por categoria
    const filtroCategoria = document.getElementById('filtro-categoria');
    if (filtroCategoria) {
        filtroCategoria.addEventListener('change', (e) => {
            // La lista se actualizara automaticamente por el listener
            const productos = obtenerProductosCache();
            renderizarLista(productos, e.target.value);
        });
    }

    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('modal-producto');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    }

    // Formulario de producto
    const formProducto = document.getElementById('form-producto');
    if (formProducto) {
        formProducto.addEventListener('submit', manejarSubmitProducto);
    }
}

// Cache local de productos para filtrado
let productosCache = [];
function obtenerProductosCache() {
    return productosCache;
}

// Inicializar cache de productos (se llama despues de tener familiaId)
function inicializarCacheProductos() {
    const productosCollection = getProductosCollection();
    if (!productosCollection) return;

    productosCollection.onSnapshot((snapshot) => {
        productosCache = [];
        snapshot.forEach((doc) => {
            productosCache.push({ id: doc.id, ...doc.data() });
        });
    });
}

// Abrir modal para agregar producto
function abrirModalAgregar() {
    const modal = document.getElementById('modal-producto');
    const modalTitulo = document.getElementById('modal-titulo');
    const form = document.getElementById('form-producto');

    modalTitulo.textContent = 'Agregar Producto';
    form.reset();
    form.dataset.modo = 'agregar';
    form.dataset.productoId = '';

    modal.classList.add('activo');
}

// Abrir modal para editar producto
function abrirModalEditar(productoId) {
    const producto = productosCache.find(p => p.id === productoId);
    if (!producto) return;

    const modal = document.getElementById('modal-producto');
    const modalTitulo = document.getElementById('modal-titulo');
    const form = document.getElementById('form-producto');

    modalTitulo.textContent = 'Editar Producto';
    form.dataset.modo = 'editar';
    form.dataset.productoId = productoId;

    document.getElementById('input-nombre').value = producto.nombre;
    document.getElementById('input-cantidad').value = producto.cantidad;
    document.getElementById('input-unidad').value = producto.unidad || 'Unidades';
    document.getElementById('input-categoria').value = producto.categoria;

    modal.classList.add('activo');
}

// Cerrar modal
function cerrarModal() {
    const modal = document.getElementById('modal-producto');
    modal.classList.remove('activo');
}

// Obtener nombre del usuario actual con fallback robusto (sincrono)
function obtenerNombreUsuario() {
    // Primero intentar desde el documento de Firestore (ya cargado)
    if (usuarioActual?.nombre && usuarioActual.nombre !== 'Usuario') {
        return usuarioActual.nombre;
    }
    // Fallback: usar displayName de Firebase Auth directamente
    const firebaseUser = auth.currentUser;
    if (firebaseUser?.displayName) {
        return firebaseUser.displayName;
    }
    // Ultimo recurso: usar la parte del email antes del @
    if (firebaseUser?.email) {
        return firebaseUser.email.split('@')[0];
    }
    return 'Usuario';
}

// Manejar submit del formulario
async function manejarSubmitProducto(e) {
    e.preventDefault();

    const form = e.target;
    const modo = form.dataset.modo;
    const productoId = form.dataset.productoId;

    const nombre = document.getElementById('input-nombre').value.trim();
    const cantidad = parseInt(document.getElementById('input-cantidad').value);
    const unidad = document.getElementById('input-unidad').value;
    const categoria = document.getElementById('input-categoria').value;

    if (!nombre || !cantidad || !unidad || !categoria) {
        mostrarMensaje('Completa todos los campos', 'error');
        return;
    }

    const productosCollection = getProductosCollection();
    if (!productosCollection) {
        mostrarMensaje('Error: No tienes familia configurada', 'error');
        return;
    }

    try {
        if (modo === 'agregar') {
            await productosCollection.add({
                nombre: nombre,
                cantidad: cantidad,
                unidad: unidad,
                categoria: categoria,
                comprado: false,
                agregadoPor: obtenerNombreUsuario(),
                fecha: firebase.firestore.FieldValue.serverTimestamp()
            });
            mostrarMensaje('Producto agregado', 'exito');
        } else {
            await productosCollection.doc(productoId).update({
                nombre: nombre,
                cantidad: cantidad,
                unidad: unidad,
                categoria: categoria
            });
            mostrarMensaje('Producto actualizado', 'exito');
        }
        cerrarModal();
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(ErrorUtils.traducirErrorFirestore(error), 'error');
    }
}

// Marcar/desmarcar producto como comprado
async function toggleComprado(productoId, comprado) {
    const productosCollection = getProductosCollection();
    if (!productosCollection) return;

    try {
        await productosCollection.doc(productoId).update({
            comprado: comprado
        });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        mostrarMensaje(ErrorUtils.traducirErrorFirestore(error), 'error');
    }
}

// Eliminar producto
async function eliminarProducto(productoId) {
    if (!confirm('¿Eliminar este producto de la lista?')) return;

    const productosCollection = getProductosCollection();
    if (!productosCollection) return;

    try {
        await productosCollection.doc(productoId).delete();
        mostrarMensaje('Producto eliminado', 'exito');
    } catch (error) {
        console.error('Error al eliminar:', error);
        mostrarMensaje(ErrorUtils.traducirErrorFirestore(error), 'error');
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
    }, 2500);
}

// Limpiar listener al salir
window.addEventListener('beforeunload', () => {
    if (productosListener) {
        productosListener();
    }
});
