import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCGXMvEeJrDmJFeDyDV7PGRIyQx4ZL1BaU",
  authDomain: "gcweb-e1ac1.firebaseapp.com",
  databaseURL: "https://gcweb-e1ac1-default-rtdb.firebaseio.com/",
  projectId: "gcweb-e1ac1",
  storageBucket: "gcweb-e1ac1.appspot.com",
  messagingSenderId: "214660784200",
  appId: "1:214660784200:web:1954fd43c8e3f79ca0387d",
  measurementId: "G-7C0CQ4S0HF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const database = getDatabase(app);

export { auth, db, storage, database };