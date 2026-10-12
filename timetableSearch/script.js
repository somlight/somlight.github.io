const maxDataAge = 1000 * 60 * 60 * 24 * 7;

const schoolForm = document.querySelector("#schoolForm");
const schoolUrl = document.querySelector("#schoolUrl");
const schoolSelect = document.querySelector("#schoolSelect");
const savedRow = document.querySelector("#savedRow");
const refreshBtn = document.querySelector("#refreshBtn");
const infoBox = document.querySelector("#infoBox");
const classList = document.querySelector("#classList");
const classTitle = document.querySelector("#classTitle");
const tableCon = document.querySelector("#tableCon");

let currentSchool = null;
let currentData = null;

function t(key) {
    return strings[document.documentElement.lang]?.[key] ?? key;
}

function showInfo(text, isError = false) {
    infoBox.textContent = text;
    infoBox.classList.toggle("error", isError);
}

function normalizeUrl(input) {
    let text = input.trim();
    if (!/^https?:\/\//.test(text)) text = "https://" + text;
    const url = new URL(text);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/[^/]*\.html?$/, "");
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    url.pathname = url.pathname.replace(/plany\/$/, "");
    return url.href;
}

async function fetchText(url) {
    const res = await fetch("https://cors.somlight.dev/?url=" + encodeURIComponent(url));
    if (!res.ok) throw new Error("fetch");
    return await res.text();
}

//lista.html links look like plany/o1.html (class), plany/n1.html (teacher), plany/s1.html (room)
function parseList(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const classes = [];
    const teachers = [];
    const rooms = [];

    doc.querySelectorAll("a[href]").forEach(a => {
        const href = a.getAttribute("href");
        const text = a.textContent.trim();

        if (/plany\/o\d+\.html/.test(href)) {
            classes.push({ id: text, href });
        } else if (/plany\/n\d+\.html/.test(href)) {
            const match = text.match(/^(.*)\((.+)\)$/); //"J.Kowalski (JK)"
            teachers.push({ id: match ? match[2].trim() : text, name: match ? match[1].trim() : text });
        } else if (/plany\/s\d+\.html/.test(href)) {
            const space = text.indexOf(" "); //"303 komputerowa" or just "WF1"
            rooms.push({
                id: space === -1 ? text : text.slice(0, space),
                name: space === -1 ? text : text.slice(space + 1),
            });
        }
    });

    if (classes.length === 0) throw new Error("notOptivum");
    return { classes, teachers, rooms };
}

function parseTimetable(html, classId) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const lessons = [];
    const hours = {};
    const table = doc.querySelector("table.tabela");
    if (!table) return { lessons, hours };

    table.querySelectorAll("tr").forEach(row => {
        const cells = row.querySelectorAll("td.l");
        if (cells.length === 0) return;

        const period = Number(row.children[0].textContent.trim());
        hours[period] = row.children[1].textContent.replace(/\s+/g, "");

        cells.forEach(cell => {
            const day = cell.cellIndex - 2; //first two columns are "nr" and hours
            cell.querySelectorAll(".p").forEach(p => {
                const text = p.textContent.trim();
                if (text === "" || text.startsWith("#")) return;

                //teacher (.n) and room (.s) come after the subject, until the next subject
                let teacherId = null;
                let roomId = null;
                let el = p.nextElementSibling;
                while (el && !el.classList.contains("p")) {
                    if (el.classList.contains("n")) teacherId = el.textContent.trim();
                    if (el.classList.contains("s")) roomId = el.textContent.trim();
                    el = el.nextElementSibling;
                }

                const groupMatch = text.match(/-(\d+)\/(\d+)$/); //"angielski-1/2"
                lessons.push({
                    classId,
                    day,
                    period,
                    subject: groupMatch ? text.slice(0, text.lastIndexOf("-")) : text,
                    group: groupMatch ? groupMatch[1] : null,
                    groupCount: groupMatch ? groupMatch[2] : null,
                    teacherId,
                    roomId,
                });
            });
        });
    });

    return { lessons, hours };
}

async function buildData(rootUrl) {
    const list = parseList(await fetchText(rootUrl + "lista.html"));
    const lessons = [];
    let hours = {};

    for (const [i, c] of list.classes.entries()) {
        showInfo(`${t("tt.downloading")} ${c.id} (${i + 1}/${list.classes.length})`);
        const result = parseTimetable(await fetchText(new URL(c.href, rootUrl).href), c.id);
        lessons.push(...result.lessons);
        hours = { ...hours, ...result.hours };
    }

    return { source: rootUrl, fetchedAt: Date.now(), ...list, hours, lessons };
}

async function getData(rootUrl, force) {
    const key = "tt:" + rootUrl;
    let cached = null;
    try {
        cached = JSON.parse(localStorage.getItem(key));
    } catch {}

    if (!force && cached && Date.now() - cached.fetchedAt < maxDataAge) {
        showInfo(t("tt.fromCache"));
        return cached;
    }

    const data = await buildData(rootUrl);
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {} //storage full or blocked, still works, just not cached
    showInfo(t("tt.fresh"));
    return data;
}

function getSavedSchools() {
    try {
        return JSON.parse(localStorage.getItem("tt.schools")) ?? [];
    } catch {
        return [];
    }
}

function saveSchool(rootUrl) {
    const schools = getSavedSchools().filter(s => s !== rootUrl);
    schools.unshift(rootUrl);
    localStorage.setItem("tt.schools", JSON.stringify(schools));
    localStorage.setItem("tt.last", rootUrl);
    drawSchoolSelect();
}

function drawSchoolSelect() {
    const schools = getSavedSchools();
    schoolSelect.replaceChildren();
    schools.forEach(url => {
        const option = document.createElement("option");
        const u = new URL(url);
        option.value = url;
        option.textContent = u.hostname.replace(/^www\./, "") + u.pathname;
        option.selected = url === currentSchool;
        schoolSelect.appendChild(option);
    });
    savedRow.hidden = schools.length === 0;
}

function drawClassList() {
    classList.replaceChildren();
    currentData.classes.forEach(c => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "classBtn";
        btn.textContent = c.id;
        btn.addEventListener("click", () => selectClass(c.id));
        classList.appendChild(btn);
    });
}

function selectClass(classId) {
    classList.querySelectorAll(".classBtn").forEach(btn => {
        btn.classList.toggle("active", btn.textContent === classId);
    });
    history.replaceState(null, "", "?class=" + encodeURIComponent(classId));
    classTitle.textContent = classId;
    drawTimetable(classId);
}

function makeEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function drawTimetable(classId) {
    const lessons = currentData.lessons.filter(l => l.classId === classId);
    tableCon.replaceChildren();

    if (lessons.length === 0) {
        tableCon.appendChild(makeEl("p", "hint", t("tt.noLessons")));
        return;
    }

    const teacherNames = new Map(currentData.teachers.map(tc => [tc.id, tc.name]));
    const roomNames = new Map(currentData.rooms.map(r => [r.id, r.name]));
    const dayCount = Math.max(5, ...lessons.map(l => l.day + 1));
    const firstPeriod = Math.min(...lessons.map(l => l.period));
    const lastPeriod = Math.max(...lessons.map(l => l.period));

    const table = makeEl("table");
    const headRow = table.appendChild(makeEl("tr"));
    headRow.appendChild(makeEl("th", null, "#"));
    for (let d = 0; d < dayCount; d++) {
        const th = makeEl("th", null, t("day." + d));
        th.setAttribute("data-translation-id", "day." + d);
        headRow.appendChild(th);
    }

    for (let p = firstPeriod; p <= lastPeriod; p++) {
        const row = table.appendChild(makeEl("tr"));
        const periodCell = row.appendChild(makeEl("th", "periodCell"));
        periodCell.appendChild(makeEl("span", "periodNr", p));
        periodCell.appendChild(makeEl("span", "periodHours", currentData.hours[p] ?? ""));

        for (let d = 0; d < dayCount; d++) {
            const cell = row.appendChild(makeEl("td"));
            const slot = cell.appendChild(makeEl("div", "slot"));
            lessons
                .filter(l => l.day === d && l.period === p)
                .sort((a, b) => Number(a.group) - Number(b.group))
                .forEach(l => {
                    const box = slot.appendChild(makeEl("div", "lesson"));
                    if (l.group) {
                        box.appendChild(makeEl("span", "groupTag", l.groupCount ? `${l.group}/${l.groupCount}` : l.group));
                    }
                    box.appendChild(makeEl("span", "subject", l.subject));
                    const meta = box.appendChild(makeEl("span", "meta"));
                    if (l.teacherId) {
                        const teacher = meta.appendChild(makeEl("span", null, l.teacherId));
                        teacher.title = teacherNames.get(l.teacherId) ?? "";
                    }
                    if (l.roomId) {
                        const room = meta.appendChild(makeEl("span", null, l.roomId));
                        room.title = roomNames.get(l.roomId) ?? "";
                    }
                });
        }
    }

    tableCon.appendChild(table);
}

async function loadSchool(rootUrl, force = false) {
    schoolForm.querySelector("button").disabled = true;
    refreshBtn.disabled = true;

    try {
        currentData = await getData(rootUrl, force);
        currentSchool = rootUrl;
        saveSchool(rootUrl);
        drawClassList();

        const wanted = new URLSearchParams(location.search).get("class");
        if (wanted && currentData.classes.some(c => c.id === wanted)) {
            selectClass(wanted);
        } else {
            classTitle.textContent = "";
            tableCon.replaceChildren(makeEl("p", "hint", t("tt.pick")));
        }
    } catch (err) {
        console.error(err);
        showInfo(t(err.message === "notOptivum" ? "tt.errNotOptivum" : "tt.errFetch"), true);
    } finally {
        schoolForm.querySelector("button").disabled = false;
        refreshBtn.disabled = false;
    }
}

schoolForm.addEventListener("submit", e => {
    e.preventDefault(); //forms reload the page by default
    let rootUrl;
    try {
        rootUrl = normalizeUrl(schoolUrl.value);
    } catch {
        showInfo(t("tt.errUrl"), true);
        return;
    }
    history.replaceState(null, "", location.pathname); //new school, forget the old class
    schoolUrl.value = "";
    loadSchool(rootUrl);
});

schoolSelect.addEventListener("change", () => {
    history.replaceState(null, "", location.pathname);
    loadSchool(schoolSelect.value);
});

refreshBtn.addEventListener("click", () => {
    if (currentSchool) loadSchool(currentSchool, true);
});

drawSchoolSelect();
const lastSchool = localStorage.getItem("tt.last");
if (lastSchool) {
    loadSchool(lastSchool);
} else {
    tableCon.replaceChildren(makeEl("p", "hint", t("tt.start")));
}