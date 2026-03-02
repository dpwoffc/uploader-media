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

const table = document.querySelector(".product-table");

// Render tabel user
async function loadUsers() {
  try {
    const res = await fetch("/api/users", { credentials: "include" });
    const users = await res.json();

    let html = `<tr>
      <th>Username</th>
      <th>Email</th>
      <th>Password</th>
      <th>Edit</th>
      <th>Delete</th>
    </tr>`;

    users.forEach(user => {
      html += `<tr>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>
          <input type="text" value="${user.password}" id="pass-${user.username}" style="width:100%;"/>
        </td>
        <td>
          <button class="btn-edit" onclick="editPassword('${user.username}')">Edit</button>
        </td>
        <td>
          <button class="btn-delete" onclick="deleteUser('${user.username}')">Delete</button>
        </td>
      </tr>`;
    });

    table.innerHTML = html;
  } catch (err) {
    console.error(err);
  }
}

// Edit password
async function editPassword(username) {
  const password = document.getElementById(`pass-${username}`).value;
  const res = await fetch(`/api/users/${username}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  alert(data.message);
}

// Delete user
async function deleteUser(username) {
  if (!confirm(`Hapus user ${username}?`)) return;
  const res = await fetch(`/api/users/${username}`, {
    method: "DELETE",
    credentials: "include"
  });
  const data = await res.json();
  alert(data.message);
  loadUsers(); // refresh tabel
}

// Load user saat page siap
loadUsers();