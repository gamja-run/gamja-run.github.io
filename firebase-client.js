import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyCsGj7AD92mJ9wEXBZ4LZEHHB1Q4BaMasg",
  authDomain: "gamja-run-github-io.firebaseapp.com",
  projectId: "gamja-run-github-io",
  storageBucket: "gamja-run-github-io.firebasestorage.app",
  messagingSenderId: "339460836630",
  appId: "1:339460836630:web:0ef2c8ed1197542ec7d437",
  appCheckSiteKey: "6LfmbpstAAAAAPLLMAS2YGRwtTl3U5SLsO-uWM2J",
});

export const productionHost = "gamja-run.github.io";
export const firebaseApp = initializeApp(firebaseConfig);

if (location.hostname === productionHost) {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(firebaseConfig.appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const database = getFirestore(firebaseApp);
export const authentication = getAuth(firebaseApp);

export async function ensureAnonymousUser() {
  if (typeof authentication.authStateReady === "function") {
    await authentication.authStateReady();
  }

  if (authentication.currentUser) return authentication.currentUser;
  const credential = await signInAnonymously(authentication);
  return credential.user;
}
