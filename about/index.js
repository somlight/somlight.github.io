const maxCats = 16;
let catCnt = 1;

function summonDvdCat() {
    const dvdCat = document.createElement("img");
    dvdCat.src = "cat.gif";
    dvdCat.classList.add("dvdCat", "rainbow");
    document.body.appendChild(dvdCat);
    catCnt++;

    let x = Math.random() * (window.innerWidth - 200);
    let y = Math.random() * (window.innerHeight - 160);
    let dx = randomSpeed();
    let dy = randomSpeed();

    function moveDvdCat() {
        x += dx;
        y += dy;
        dvdCat.style.left = x + "px";
        dvdCat.style.top = y + "px";

        if (x + dvdCat.clientWidth >= window.innerWidth) {
            dx = -Math.abs(dx);
        } else if (x <= 0) {
            dx = Math.abs(dx);
        }

        if (y + dvdCat.clientHeight >= window.innerHeight) {
            dy = -Math.abs(dy);
        } else if (y <= 0) {
            dy = Math.abs(dy);
        }

        requestAnimationFrame(moveDvdCat);
    }
    requestAnimationFrame(moveDvdCat);
}

function randomSpeed() {
    const speed = Math.floor(Math.random() * 6) + 3;
    return Math.random() < 0.5 ? -speed : speed;
}

function doubleDvdCats() {
    if (catCnt >= maxCats) {
        summonDvdCat();
        return;
    }
    const currentCnt = catCnt;
    for (let i = 0; i < currentCnt; i++) {
        summonDvdCat();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const catCon = document.querySelector("#catCon");
    const cat = document.querySelector("#cat");
    const petCnt = document.querySelector("#petCnt");

    document.addEventListener("mousemove", (e) => {
        const rect = catCon.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
        //-0.3 so it actually looks up when the cursor is above it
        const dy = (e.clientY - (rect.top + rect.height / 2)) / window.innerHeight - 0.3;
        catCon.style.transform = `perspective(500px) rotateY(${dx * 50}deg) rotateX(${-dy * 50}deg)`;
    });

    const clicksNeeded = 10;
    let clickCnt = 0;

    catCon.addEventListener("click", () => {
        clickCnt++;

        if (clickCnt < clicksNeeded) {
            petCnt.textContent = clickCnt - clicksNeeded;
            new Audio("ui.mp3").play();
            return;
        }

        if (clickCnt === clicksNeeded) {
            petCnt.style.display = "none";
            document.querySelector("main").classList.add("rainbow");
            document.querySelector("header").classList.add("rainbow");
            document.querySelector("footer").classList.add("rainbow");
            cat.src = "cat.gif";

            const uiSong = new Audio("uiui.mp3");
            uiSong.loop = true;
            uiSong.play();
        }

        doubleDvdCats();
    });
});