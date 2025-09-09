import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyCLiPkISiuave91bqLg7WGKdqYrz376pCA",
  authDomain: "catalogo-b6e67.firebaseapp.com",
  projectId: "catalogo-b6e67",
  storageBucket: "catalogo-b6e67.firebasestorage.app",
  messagingSenderId: "832808330065",
  appId: "1:832808330065:web:80469d16bfb9a360e46970",
  measurementId: "G-3MZ71V4PPY",
  databaseURL: "https://catalogo-b6e67-default-rtdb.firebaseio.com/"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
export const realtimeDb = getDatabase(app)
export default app
