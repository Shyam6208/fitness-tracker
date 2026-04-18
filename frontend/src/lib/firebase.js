import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCgYamZeQlqLRouUMP6fC1Zfl9EtFRMKVM',
  authDomain: 'fitness-tracker-ad2d9.firebaseapp.com',
  projectId: 'fitness-tracker-ad2d9',
  storageBucket: 'fitness-tracker-ad2d9.firebasestorage.app',
  messagingSenderId: '129996594408',
  appId: '1:129996594408:web:0f74f63eb44cdc6c313d5d',
  measurementId: 'G-FC6938YXJN'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Failed to set Firebase auth persistence:', error);
});

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  }).catch(() => {
    // Ignore analytics init errors in unsupported environments.
  });
}

export default app;
