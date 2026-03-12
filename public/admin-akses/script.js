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

(async () => {
    try {
        const res = await fetch("/api/check-session", { credentials: "include" });
        const data = await res.json();

        if (!data.logged || data.role !== "admin") {
            location.href = "/login/index.html";
        }
    } catch (e) {
        location.href = "/login/index.html";
    }
})();

document.getElementById("logoutBtn").onclick = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    location.href = "/login/index.html";
};

async function loadDashboardChart() {
    try {
        const res = await fetch("/api/dashboard-stats", { credentials: "include" });
        const data = await res.json();
        const ctx = document.getElementById("dashboardChart").getContext("2d");

        new Chart(ctx, {
            type: "pie",
            data: {
                labels: ["Total Users", "Total Files"],
                datasets: [{
                    label: "Dashboard Stats",
                    data: [data.totalUsers, data.totalFiles],
                    backgroundColor: ["#0d6efd", "#198754"]
                }]
            },
            options: {
                responsive: true
            }
        });
    } catch (err) {
        console.error("Failed to load dashboard stats:", err);
    }
}

loadDashboardChart();
