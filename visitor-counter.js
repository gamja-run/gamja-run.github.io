import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js";
import {
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyCkCJh5iMqIFULqVMFzbi_MAH-O0XCt-pg",
  authDomain: "dogoo-a697f.firebaseapp.com",
  projectId: "dogoo-a697f",
  appId: "1:9622978431:web:7a85175c40a7dc0cf4244a",
  appCheckSiteKey: "6Lcx5VotAAAAAGuZCQIzsK3aCOXZXkVzXYsDvqVw",
});

const storageKey = "gamja-run:visitor-counted:v1";
const productionHost = "gamja-run.github.io";
const counter = document.querySelector("[data-visitor-counter]");
const countOutput = counter?.querySelector("[data-visitor-count]");

function reserveFirstVisit() {
  try {
    if (localStorage.getItem(storageKey)) return false;
    localStorage.setItem(storageKey, "pending");
    return true;
  } catch {
    return true;
  }
}

function confirmFirstVisit() {
  try {
    localStorage.setItem(storageKey, "counted");
  } catch {
    // Storage can be unavailable in privacy-focused browsing modes.
  }
}

function releaseFirstVisit() {
  try {
    if (localStorage.getItem(storageKey) === "pending") localStorage.removeItem(storageKey);
  } catch {
    // There is no reservation to release when storage is unavailable.
  }
}

async function loadVisitorCount() {
  if (!counter || !countOutput) return;

  const app = initializeApp(firebaseConfig, "gamja-run-visitor-counter");
  if (location.hostname === productionHost) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(firebaseConfig.appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  const database = getFirestore(app);
  const counterDocument = doc(database, "publicCounters", "gamjaRunSite");
  const firstVisit = location.hostname === productionHost && reserveFirstVisit();

  try {
    if (firstVisit) {
      await setDoc(
        counterDocument,
        {
          count: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      confirmFirstVisit();
    }

    const snapshot = await getDoc(counterDocument);
    const count = snapshot.exists() ? snapshot.data().count : 0;
    countOutput.textContent = new Intl.NumberFormat("ko-KR").format(Number(count) || 0);
    counter.setAttribute("aria-busy", "false");
  } catch (error) {
    if (firstVisit) releaseFirstVisit();
    counter.hidden = true;
    console.warn("방문자 수를 불러오지 못했습니다.", error);
  }
}

loadVisitorCount();
