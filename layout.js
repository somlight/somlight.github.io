const savedTheme = localStorage.getItem("theme");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
document.documentElement.dataset.theme = savedTheme ?? systemTheme;

const savedLang = localStorage.getItem("lang");
const systemLang = navigator.language.startsWith("pl") ? "pl" : "en";
document.documentElement.lang = savedLang ?? systemLang;

const strings = {
    pl: { "nav.about": "o mnie", "nav.timetable": "plany lekcji", "nav.soon": "wkrótce" },
    en: { "nav.about": "about", "nav.timetable": "timetables", "nav.soon": "coming soon" },
};

function applyLang(lang) {
    document.querySelectorAll("[data-translation-id]").forEach(el => {
        const key = el.getAttribute("data-translation-id");
        el.textContent = strings[lang][key] ?? el.textContent;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const header = `
    <header>
        <a href="/" id="logo">somlight.dev</a>
        <nav id="nav">
            <ul id="navList">
                <li><a href="/about/" data-translation-id="nav.about">about</a></li>
                <li><a href="/timetableSearch/" data-translation-id="nav.timetable">timetables</a></li>
                <li><a href="#" class="soon" data-translation-id="nav.soon">coming soon</a></li>
            </ul>
        </nav>
        <button class="iconBtn" id="themeBtn" aria-label="toggle light/dark mode">
            <svg class="iconMoon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg>
            <svg class="iconSun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>
        <button class="iconBtn" id="langBtn" aria-label="change language"></button>
        <button class="iconBtn" id="menuBtn" aria-label="menu" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
    </header>`;
    const footer = `<footer>&copy; ${new Date().getFullYear()} somlight.dev</footer>`;
    document.body.insertAdjacentHTML("afterbegin", header);
    document.body.insertAdjacentHTML("beforeend", footer);

    const html = document.documentElement;
    const themeBtn = document.querySelector("#themeBtn");
    const langBtn = document.querySelector("#langBtn");
    const menuBtn = document.querySelector("#menuBtn");
    const nav = document.querySelector("#nav");

    document.querySelectorAll("#navList a").forEach(link => {
        const href = link.getAttribute("href");
        if (href !== "#" && location.pathname.startsWith(href)) link.classList.add("active");
    });

    themeBtn.addEventListener("click", () => {
        const theme = html.dataset.theme === "light" ? "dark" : "light";
        html.dataset.theme = theme;
        localStorage.setItem("theme", theme);
    });

    langBtn.textContent = html.lang.toUpperCase();
    applyLang(html.lang);
    langBtn.addEventListener("click", () => {
        const lang = html.lang === "pl" ? "en" : "pl";
        html.lang = lang;
        langBtn.textContent = lang.toUpperCase();
        localStorage.setItem("lang", lang);
        applyLang(lang);
    });

    menuBtn.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", open);
    });

    document.addEventListener("click", e => {
        if (!e.target.closest("header")) {
            nav.classList.remove("open");
            menuBtn.setAttribute("aria-expanded", false);
        }
    });
});