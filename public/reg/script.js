const form = document.getElementById("registerForm");
const otpSection = document.getElementById("otpSection");
const verifyBtn = document.getElementById("verifyBtn");
const resendBtn = document.getElementById("resendBtn");

let savedEmail = "";
let countdownInterval = null;

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !email || !password) {
        alert("Lengkapi semua data");
        return;
    }

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (!data.success) {
        alert(data.message);
        return;
    }

    savedEmail = email;
    form.style.display = "none";
    otpSection.style.display = "block";
    startCooldown();
    alert("OTP dikirim ke email kamu");
});

verifyBtn.addEventListener("click", async () => {
    const otp = document.getElementById("otpInput").value.trim();

    if (!otp) {
        alert("Masukkan OTP");
        return;
    }

    const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: savedEmail, otp })
    });

    const data = await res.json();

    if (!data.success) {
        alert(data.message);
        return;
    }

    alert("Register berhasil");
    window.location.href = "/login/index.html";
});

function startCooldown() {
    let countdown = 60;
    resendBtn.disabled = true;

    countdownInterval = setInterval(() => {
        countdown--;
        resendBtn.textContent = `Kirim ulang (${countdown})`;

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            resendBtn.disabled = false;
            resendBtn.textContent = "Kirim ulang OTP";
        }
    }, 1000);
}
