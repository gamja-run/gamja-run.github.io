import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { database, ensureAnonymousUser } from "./firebase-client.js";

const form = document.querySelector("[data-cheer-form]");
const input = document.querySelector("[data-cheer-input]");
const submitButton = document.querySelector("[data-cheer-submit]");
const refreshButton = document.querySelector("[data-cheer-refresh]");
const list = document.querySelector("[data-cheer-list]");
const emptyMessage = document.querySelector("[data-cheer-empty]");
const status = document.querySelector("[data-cheer-status]");
const lengthOutput = document.querySelector("[data-cheer-length]");

const cheerCollection = collection(database, "gamjaRunCheers");
const cooldownKey = "gamja-run:cheer-cooldown:v1";
const hiddenKey = "gamja-run:hidden-cheers:v1";
const cooldownMilliseconds = 30_000;
const blockedWords = ["시발", "씨발", "ㅅㅂ", "병신", "ㅂㅅ", "개새", "좆", "지랄", "꺼져", "죽어"];

function readStorage(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing can make localStorage unavailable.
  }
}

function getHiddenIds() {
  try {
    const parsed = JSON.parse(readStorage(hiddenKey, "[]"));
    return new Set(Array.isArray(parsed) ? parsed.slice(-100) : []);
  } catch {
    return new Set();
  }
}

function hideCheer(id) {
  const hiddenIds = getHiddenIds();
  hiddenIds.add(id);
  writeStorage(hiddenKey, JSON.stringify([...hiddenIds].slice(-100)));
}

function setStatus(message, tone = "normal") {
  status.textContent = message;
  status.dataset.tone = tone;
}

function updateLength() {
  lengthOutput.textContent = `${[...input.value].length} / 60`;
}

function normalizeForModeration(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s._~!@#$%^&*()+=[\]{}'"`|\\/:;?,<>-]/g, "");
}

function validateMessage(value) {
  const message = value.trim();
  const characterCount = [...message].length;
  const compact = normalizeForModeration(message);

  if (!message) return "응원 문구를 입력해 주세요.";
  if (characterCount > 60) return "응원 문구는 60자까지 입력할 수 있어요.";
  if (/[\r\n]/u.test(message)) return "응원 문구는 한 줄로 적어 주세요.";
  if (/(?:https?:\/\/|www\.|discord\.gg|\S+@\S+\.\S+)/iu.test(message)) return "링크와 이메일 주소는 입력할 수 없어요.";
  if (/\b0\d{1,2}-?\d{3,4}-?\d{4}\b/u.test(message)) return "전화번호는 입력할 수 없어요.";
  if (blockedWords.some((word) => compact.includes(normalizeForModeration(word)))) return "서로 기분 좋은 응원 문구로 적어 주세요.";
  return "";
}

function formatTime(timestamp) {
  const date = timestamp?.toDate?.() ?? (timestamp instanceof Date ? timestamp : null);
  if (!date || Number.isNaN(date.getTime())) return "방금";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function createCheerItem({ id, message, createdAt }) {
  const item = document.createElement("li");
  item.className = "cheer-item";
  item.dataset.cheerId = id;

  const line = document.createElement("div");
  line.className = "cheer-line";

  const time = document.createElement("time");
  time.textContent = `[${formatTime(createdAt)}]`;

  const author = document.createElement("strong");
  author.textContent = "익명의 감자 >";

  const content = document.createElement("span");
  content.textContent = message;

  const hideButton = document.createElement("button");
  hideButton.type = "button";
  hideButton.className = "cheer-hide-button";
  hideButton.textContent = "[ 가리기 ]";
  hideButton.setAttribute("aria-label", `응원 글 가리기: ${message}`);
  hideButton.addEventListener("click", () => {
    hideCheer(id);
    item.remove();
    emptyMessage.hidden = list.childElementCount > 0;
    setStatus("선택한 글을 이 브라우저에서 가렸습니다.");
  });

  line.append(time, author, content, hideButton);
  item.append(line);
  return item;
}

async function loadCheers() {
  refreshButton.disabled = true;
  list.setAttribute("aria-busy", "true");
  setStatus("최근 응원을 불러오는 중입니다...");

  try {
    const cheerQuery = query(cheerCollection, orderBy("createdAt", "desc"), limit(10));
    const snapshot = await getDocs(cheerQuery);
    const hiddenIds = getHiddenIds();
    const cheers = snapshot.docs
      .map((snapshotDocument) => ({ id: snapshotDocument.id, ...snapshotDocument.data() }))
      .filter((cheer) => !hiddenIds.has(cheer.id))
      .reverse();

    list.replaceChildren(...cheers.map(createCheerItem));
    emptyMessage.hidden = cheers.length > 0;
    setStatus(cheers.length > 0 ? `최근 응원 ${cheers.length}개를 불러왔습니다.` : "첫 번째 응원을 남겨 주세요!");
  } catch (error) {
    console.warn("응원 글을 불러오지 못했습니다.", error);
    setStatus("응원 글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
  } finally {
    refreshButton.disabled = false;
    list.setAttribute("aria-busy", "false");
  }
}

function getRemainingCooldown() {
  const lastSentAt = Number(readStorage(cooldownKey, "0"));
  return Math.max(0, cooldownMilliseconds - (Date.now() - lastSentAt));
}

async function submitCheer(event) {
  event.preventDefault();
  const message = input.value.trim();
  const validationError = validateMessage(message);

  if (validationError) {
    setStatus(validationError, "error");
    input.focus();
    return;
  }

  const remainingCooldown = getRemainingCooldown();
  if (remainingCooldown > 0) {
    setStatus(`${Math.ceil(remainingCooldown / 1000)}초 뒤에 다시 응원할 수 있어요.`, "error");
    return;
  }

  submitButton.disabled = true;
  input.disabled = true;
  setStatus("익명의 감자 이름표를 준비하는 중입니다...");

  try {
    const user = await ensureAnonymousUser();
    const cheerReference = doc(cheerCollection);
    const rateLimitReference = doc(database, "gamjaRunCheerRateLimits", user.uid);
    const batch = writeBatch(database);

    batch.set(cheerReference, {
      message,
      createdAt: serverTimestamp(),
    });
    batch.set(rateLimitReference, {
      lastMessageId: cheerReference.id,
      lastCreatedAt: serverTimestamp(),
    });

    await batch.commit();
    writeStorage(cooldownKey, String(Date.now()));
    form.reset();
    updateLength();
    setStatus("응원을 전송했습니다. 고마워요!", "success");
    await loadCheers();
  } catch (error) {
    console.warn("응원 글을 전송하지 못했습니다.", error);
    if (error?.code === "permission-denied") {
      setStatus("30초 뒤에 다시 시도하거나 문구를 조금 다듬어 주세요.", "error");
    } else if (error?.code === "auth/operation-not-allowed") {
      setStatus("익명 응원 기능을 준비 중입니다. 잠시 후 다시 시도해 주세요.", "error");
    } else {
      setStatus("응원을 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
    }
  } finally {
    submitButton.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

if (form && input && submitButton && refreshButton && list && emptyMessage && status && lengthOutput) {
  form.addEventListener("submit", submitCheer);
  input.addEventListener("input", updateLength);
  refreshButton.addEventListener("click", loadCheers);
  updateLength();
  loadCheers();
}
