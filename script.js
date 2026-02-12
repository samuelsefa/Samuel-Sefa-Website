// ===============================
// 1) Shared NAV injection (edit once)
// ===============================
(function injectNav() {
  const nav = document.getElementById("navLinks");
  if (!nav) return;

  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const links = [
    ["index.html", "Home"],
    ["about.html", "About"],
    ["skills.html", "Skills"],
    ["timeline.html", "Timeline"],
    ["projects.html", "Projects"],
    ["weather.html", "Weather"],
    ["music.html", "Music"],
    ["movies.html", "Movies"],
    ["contact.html", "Contact", "btn small"]
  ];

  nav.innerHTML = links.map(([href, label, extraClass]) => {
    const isActive = path === href;
    const cls = [extraClass || "", isActive ? "active" : ""].join(" ").trim();
    return `<a href="${href}" class="${cls}">${label}</a>`;
  }).join("");
})();

// ===============================
// 2) Mobile menu + footer year
// ===============================
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn && navLinks) {
  menuBtn.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (e) => {
    if (e.target.closest("a")) navLinks.classList.remove("open");
  });
}

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Contact demo button
const fakeSendBtn = document.getElementById("fakeSendBtn");
const formNote = document.getElementById("formNote");
if (fakeSendBtn && formNote) {
  fakeSendBtn.addEventListener("click", () => {
    formNote.textContent = "Demo only — connect a backend (or Formspree) to actually send messages.";
  });
}

// ===============================
// 3) Weather page (Open-Meteo, no API key)
// ===============================
(function initWeatherPage() {
  const weatherCard = document.getElementById("weatherCard");
  const forecastCard = document.getElementById("forecastCard");
  const forecastGrid = document.getElementById("forecastGrid");
  if (!weatherCard) return; // only runs on weather.html

  function setWeatherHTML(title, body) {
    weatherCard.innerHTML = `<h2>${title}</h2><p class="muted">${body}</p>`;
  }

  const codeText = (code) => {
    const map = {
      0:"Clear sky",
      1:"Mainly clear", 2:"Partly cloudy", 3:"Overcast",
      45:"Fog", 48:"Rime fog",
      51:"Light drizzle", 53:"Drizzle", 55:"Dense drizzle",
      61:"Slight rain", 63:"Rain", 65:"Heavy rain",
      71:"Slight snow", 73:"Snow", 75:"Heavy snow",
      80:"Rain showers", 81:"Rain showers", 82:"Violent showers",
      95:"Thunderstorm"
    };
    return map[code] || `Weather code ${code}`;
  };

  if (!navigator.geolocation) {
    setWeatherHTML("Location not supported", "Your browser doesn’t support geolocation.");
    return;
  }

  setWeatherHTML("Loading weather…", "If prompted, allow location access.");

  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,wind_speed_10m,weather_code` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
        `&timezone=auto`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather request failed");
      const data = await res.json();

      const temp = data.current?.temperature_2m;
      const wind = data.current?.wind_speed_10m;
      const wcode = data.current?.weather_code;

      setWeatherHTML("Current Weather", `${codeText(wcode)} • ${temp}°C • Wind ${wind} km/h`);

      // 3-day forecast
      const days = data.daily?.time?.slice(0, 3) || [];
      const maxs = data.daily?.temperature_2m_max?.slice(0, 3) || [];
      const mins = data.daily?.temperature_2m_min?.slice(0, 3) || [];
      const codes = data.daily?.weather_code?.slice(0, 3) || [];

      if (forecastCard && forecastGrid && days.length) {
        forecastCard.style.display = "block";
        forecastGrid.innerHTML = days.map((d, i) => `
          <div class="rec-card">
            <div class="rec-title">${d}</div>
            <div class="rec-meta">${codeText(codes[i])}</div>
            <div class="rec-tags">
              <span class="tag">High: ${maxs[i]}°C</span>
              <span class="tag">Low: ${mins[i]}°C</span>
            </div>
          </div>
        `).join("");
      }
    } catch (err) {
      console.error(err);
      setWeatherHTML("Weather error", "Could not load weather. Check your internet connection and refresh.");
    }
  }, (err) => {
    console.error(err);
    setWeatherHTML("Location blocked", "Allow location access to show local weather, then refresh.");
  });
})();

// ===============================
// 4) Smart Lists (Music + Movies)
// ===============================
(function initSmartLists() {
  const cfg = window.PAGE_RECS;
  if (!cfg) return;

  const $ = (id) => document.getElementById(id);

  const searchEl = $(cfg.searchId);
  const clearEl = $(cfg.clearId);
  const filtersWrap = $(cfg.filtersId);
  const listEl = $(cfg.listId);
  const countEl = $(cfg.countId);
  const favsEl = $(cfg.favsId);
  const favsEmptyEl = $(cfg.favsEmptyId);
  const clearFavsEl = $(cfg.clearFavsId);

  if (!searchEl || !filtersWrap || !listEl || !favsEl) return;

  const LS_KEY = `sas_favs_${cfg.pageKey}`;
  const norm = (s) => (s || "").toLowerCase().trim();

  const getFavs = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
  };
  const setFavs = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));
  const isFav = (id) => getFavs().includes(id);

  let state = { q: "", filter: "all" };

  function toggleFav(id) {
    const favs = getFavs();
    const idx = favs.indexOf(id);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.unshift(id);
    setFavs(favs);
    render();
  }

  function matches(item) {
    const q = norm(state.q);
    const hay = norm([item.title, item.type, item.category, ...(item.tags || [])].join(" "));
    const filterOk = state.filter === "all" ? true : item.category === state.filter;
    const searchOk = q ? hay.includes(q) : true;
    return filterOk && searchOk;
  }

  function cardHTML(item) {
    const star = isFav(item.id) ? "⭐" : "☆";
    const tags = (item.tags || []).slice(0, 6).map(t => `<span class="tag">${t}</span>`).join("");

    return `
      <div class="rec-card">
        <div class="rec-top">
          <div>
            <div class="rec-title">${item.title}</div>
            <div class="rec-meta">${item.type.toUpperCase()} • ${item.category.toUpperCase()}</div>
          </div>
          <button class="icon-btn" type="button" data-action="fav" data-id="${item.id}" title="Favorite">${star}</button>
        </div>

        ${tags ? `<div class="rec-tags">${tags}</div>` : ""}

        <div class="rec-actions">
          <button class="icon-btn primary" type="button" data-action="open" data-url="${item.trailer || ""}">▶ Open</button>
          <button class="icon-btn" type="button" data-action="copy" data-title="${encodeURIComponent(item.title)}">Copy title</button>
        </div>
      </div>
    `;
  }

  function renderFavs() {
    const favIds = getFavs();
    const favItems = cfg.items.filter(it => favIds.includes(it.id));
    favsEl.innerHTML = favItems.map(cardHTML).join("");
    if (favsEmptyEl) favsEmptyEl.style.display = favItems.length ? "none" : "block";
  }

  function renderList() {
    const visible = cfg.items.filter(matches);
    listEl.innerHTML = visible.map(cardHTML).join("");
    if (countEl) countEl.textContent = `${visible.length} item(s) shown`;
  }

  function render() {
    renderFavs();
    renderList();
  }

  filtersWrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    filtersWrap.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.getAttribute("data-filter") || "all";
    render();
  });

  searchEl.addEventListener("input", () => {
    state.q = searchEl.value || "";
    render();
  });

  if (clearEl) {
    clearEl.addEventListener("click", () => {
      searchEl.value = "";
      state.q = "";
      render();
      searchEl.focus();
    });
  }

  if (clearFavsEl) {
    clearFavsEl.addEventListener("click", () => {
      setFavs([]);
      render();
    });
  }

  function handleClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");

    if (action === "fav") return toggleFav(btn.getAttribute("data-id"));
    if (action === "open") {
      const url = btn.getAttribute("data-url");
      if (url) window.open(url, "_blank", "noreferrer");
      return;
    }
    if (action === "copy") {
      const title = decodeURIComponent(btn.getAttribute("data-title") || "");
      navigator.clipboard?.writeText(title);
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = "Copy title"), 800);
    }
  }

  listEl.addEventListener("click", handleClick);
  favsEl.addEventListener("click", handleClick);

  render();
})();

// ===============================
// 5) Mini “AI” Profile Chatbot (offline)
// ===============================
const root = document.getElementById("chatbot-root");
if (root) {
  const profile = {
    name: "Samuel Amoah Sefa",
    email: "ssefa@caldwell.edu",
    phone: "862-406-6258",
    linkedin: "https://www.linkedin.com/in/samuel-kofi-sefa-amoah/",
    school: "Caldwell University (Caldwell, NJ)",
    major: "B.S. Computer Science",
    gpa: "3.4",
    grad: "December 2026",
    highlights: [
      "TMCF The Pitch finalist (May 2024): SerenitySphere — AI virtual companion with gamification for veterans with PTSD/combat stress",
      "National AI Campus Project researcher (Feb–May 2023): classification/regression + visualizations (Legend of Zelda dataset)",
      "YouTube Clone (September 2024): responsive UI with HTML/CSS"
    ],
    projects: [
      { name: "YouTube Clone", date: "September 2024" },
      { name: "Web Development Challenge", date: "Team Project" },
      { name: "Code Clash Seminar", date: "2023" }
    ]
  };

  const norm = (s) => (s || "").toLowerCase().trim();

  function answer(qRaw) {
    const q = norm(qRaw);
    if (!q) return "Ask: “What’s your GPA?” or “List your projects.”";
    if (/(hi|hello|hey)\b/.test(q)) return "Hey! I’m Samuel’s profile bot. Ask about education, projects, experience, or contact info.";
    if (q.includes("name")) return `Name: ${profile.name}`;
    if (q.includes("email")) return `Email: ${profile.email}`;
    if (q.includes("phone")) return `Phone: ${profile.phone}`;
    if (q.includes("linkedin")) return `LinkedIn: ${profile.linkedin}`;
    if (q.includes("gpa")) return `GPA: ${profile.gpa}`;
    if (q.includes("graduate")) return `Expected graduation: ${profile.grad}`;
    if (q.includes("project")) return `Projects:\n- ${profile.projects.map(p => `${p.name} (${p.date})`).join("\n- ")}`;
    if (q.includes("experience") || q.includes("timeline")) return `Highlights:\n- ${profile.highlights.join("\n- ")}`;
    return "Try: “List your projects”, “What’s your GPA?”, “How do I contact you?”";
  }

  root.innerHTML = `
    <button class="chatbot-launcher" id="chatbotOpen">Ask about Samuel</button>
    <div class="chatbot-panel" id="chatbotPanel" aria-label="Profile chatbot">
      <div class="chatbot-header">
        <div class="chatbot-title">
          <strong>Samuel’s Profile Bot</strong>
          <span>Ask about projects, timeline, contact</span>
        </div>
        <button class="chatbot-close" id="chatbotClose">✕</button>
      </div>
      <div class="chatbot-messages" id="chatbotMsgs"></div>
      <div class="chatbot-suggestions" id="chatbotSug">
        <button type="button" data-q="List your projects">Projects</button>
        <button type="button" data-q="What’s your GPA?">GPA</button>
        <button type="button" data-q="How can I contact you?">Contact</button>
      </div>
      <div class="chatbot-input">
        <input id="chatbotInput" type="text" placeholder="Ask a question..." autocomplete="off" />
        <button id="chatbotSend" type="button">Send</button>
      </div>
    </div>
  `;

  const panel = document.getElementById("chatbotPanel");
  const openBtn = document.getElementById("chatbotOpen");
  const closeBtn = document.getElementById("chatbotClose");
  const msgs = document.getElementById("chatbotMsgs");
  const input = document.getElementById("chatbotInput");
  const send = document.getElementById("chatbotSend");
  const sug = document.getElementById("chatbotSug");

  function addMsg(text, who) {
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function openChat() {
    panel.classList.add("open");
    if (msgs.childElementCount === 0) addMsg("Hi! Ask me anything about Samuel’s profile.", "bot");
    setTimeout(() => input.focus(), 50);
  }
  function closeChat() { panel.classList.remove("open"); }
  function reply(q) { addMsg(q, "user"); addMsg(answer(q), "bot"); }

  openBtn.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  send.addEventListener("click", () => {
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    reply(q);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); send.click(); }
  });

  sug.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-q]");
    if (!btn) return;
    openChat();
    reply(btn.getAttribute("data-q"));
  });
}
