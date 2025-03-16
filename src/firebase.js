import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database"; // Realtime Database

const firebaseConfig = {
  apiKey: "AIzaSyB8jt3jwwhA-r5E4nIDz9Nwm1RtRCpLZsY",
  authDomain: "shoof-1.firebaseapp.com",
  databaseURL:
    "https://shoof-1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shoof-1",
  storageBucket: "shoof-1.firebasestorage.app",
  messagingSenderId: "794689825805",
  appId: "1:794689825805:web:d636079e82810a6e533944",
  measurementId: "G-6TQC0WFDWX",
};

// Initialize Firebase only if it hasn’t been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app); // Firestore
export const realtimeDb = getDatabase(app); // Realtime Database
