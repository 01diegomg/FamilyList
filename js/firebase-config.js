// ============================================
// CONFIGURACION DE FIREBASE - FamilyList
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAB3ltobJcMldyStAWd7qjUuLNemVuhZ-o",
    authDomain: "familylist-ab022.firebaseapp.com",
    projectId: "familylist-ab022",
    storageBucket: "familylist-ab022.firebasestorage.app",
    messagingSenderId: "536505045803",
    appId: "1:536505045803:web:d0a386fb12db049d8c2b6e",
    measurementId: "G-SQYQGB3HJM"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales a los servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar persistencia offline de Firestore
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Persistencia no disponible: multiples pestanas abiertas');
        } else if (err.code === 'unimplemented') {
            console.log('Persistencia no soportada en este navegador');
        }
    });

console.log('Firebase inicializado correctamente');
