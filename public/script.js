const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const hamburger = document.getElementById("hamburger");
const menuLinks = document.querySelectorAll(".menu-link");

hamburger.addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
});

function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
}

overlay.addEventListener("click", closeSidebar);

menuLinks.forEach(link => {
    link.addEventListener("click", () => {
        if (window.innerWidth <= 768) closeSidebar();
    });
});
