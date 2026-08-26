const header = document.querySelector("#siteHeader");
const menuButton = document.querySelector("#menuButton");
const siteNav = document.querySelector("#siteNav");
const toast = document.querySelector("#toast");

const eventStart = new Date("2026-08-30T20:30:00+09:00");
const eventEnd = new Date("2026-08-30T21:35:00+09:00");

function setMenu(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  siteNav.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
}

menuButton.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a, button")) setMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNav.classList.contains("open")) setMenu(false);
});

function updateHeader() {
  header.classList.toggle("scrolled", window.scrollY > 24);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));

const sectionLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const current = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!current) return;
    sectionLinks.forEach((link) => {
      const selected = link.getAttribute("href") === `#${current.target.id}`;
      link.classList.toggle("active", selected);
      if (selected) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  },
  { rootMargin: "-25% 0px -60%", threshold: [0, 0.25, 0.6] },
);

sections.forEach((section) => sectionObserver.observe(section));

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const now = new Date();
  const difference = Math.max(0, eventStart.getTime() - now.getTime());
  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const countdown = document.querySelector("[data-header-countdown]");
  const timer = countdown.closest('[role="timer"]');

  if (now >= eventStart && now <= eventEnd) {
    countdown.textContent = "지금 진행 중!";
    timer.setAttribute("aria-label", "감자데이 행사가 지금 진행 중입니다");
  } else if (now > eventEnd) {
    countdown.textContent = "행사 종료";
    timer.setAttribute("aria-label", "감자데이 행사가 종료되었습니다");
  } else {
    countdown.textContent = `D-${days} · ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    timer.setAttribute("aria-label", `감자데이 행사 시작까지 ${days}일 ${hours}시간 ${minutes}분 남았습니다`);
  }
}

updateCountdown();
setInterval(updateCountdown, 1000);

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      showToast("집합 장소를 복사했어요.");
    } catch {
      showToast("복사하지 못했어요. 장소를 직접 선택해 주세요.");
    }
  });
});

function setupImageDialog(dialogSelector, openSelector, closeSelector) {
  const dialog = document.querySelector(dialogSelector);
  if (!dialog) return;

  document.querySelectorAll(openSelector).forEach((button) => {
    button.addEventListener("click", () => dialog.showModal());
  });

  dialog.querySelector(closeSelector).addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (outside) dialog.close();
  });
}

setupImageDialog("#posterDialog", "[data-poster-open]", "[data-poster-close]");
setupImageDialog("#invitationDialog", "[data-invitation-open]", "[data-invitation-close]");
setupImageDialog("#recruitmentDialog", "[data-recruitment-open]", "[data-recruitment-close]");
