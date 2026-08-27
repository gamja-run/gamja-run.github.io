import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { database, productionHost } from "./firebase-client.js";

const storageKey = "gamja-run:visitor-counted:v1";
const counter = document.querySelector("[data-visitor-counter]");
const counterDisplays = [...document.querySelectorAll("[data-visitor-display]")];
const countOutputs = [...document.querySelectorAll("[data-visitor-count]")];

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
  if (!counter || countOutputs.length === 0) return;

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
    const formattedCount = new Intl.NumberFormat("ko-KR").format(Number(count) || 0);
    countOutputs.forEach((output) => {
      output.textContent = formattedCount;
    });
    counterDisplays.forEach((display) => {
      display.hidden = false;
    });
    counter.setAttribute("aria-busy", "false");
  } catch (error) {
    if (firstVisit) releaseFirstVisit();
    counterDisplays.forEach((display) => {
      display.hidden = true;
    });
    console.warn("방문자 수를 불러오지 못했습니다.", error);
  }
}

loadVisitorCount();
