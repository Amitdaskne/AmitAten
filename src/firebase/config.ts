import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyALHFd8-PhTpNSn8ipHlLsQYeUjEiBDRMs",
  authDomain: "chat2-6bd92.firebaseapp.com",
  databaseURL: "https://chat2-6bd92-default-rtdb.firebaseio.com",
  projectId: "chat2-6bd92",
  storageBucket: "chat2-6bd92.appspot.com",
  messagingSenderId: "1052210817036",
  appId: "1:1052210817036:web:80674c39836371f46487e4"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);

export const dbRef = ref(database);
