import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Проверка наличия переменных окружения
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Проверяем, что все переменные заполнены
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value.includes('your-'))
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(
    '❌ Firebase configuration error: Missing or incomplete environment variables:',
    missingVars.join(', ')
  );
  console.error(
    '📝 Please create a .env file in the project root with your Firebase credentials.'
  );
  console.error(
    '📖 See CONTRIBUTION.md for setup instructions or .env.example for template.'
  );
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.error("Firebase persistence error:", error);
});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const db = getFirestore(app);

export { auth, provider, db };