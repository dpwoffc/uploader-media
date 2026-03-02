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
    if(window.innerWidth <= 768) closeSidebar();
  });
});

/* SESSION & CURRENT USER */
let currentUser = "";
(async () => {
  try {
    const res = await fetch("/api/check-session", { credentials:"include" });
    const data = await res.json();
    if(!data.logged || data.role !== "user") location.href = "/login/index.html";

    const userRes = await fetch("/api/users", { credentials:"include" });
    const userData = await userRes.json();
    const sessionUser = userData.find(u => u.cookies);
    if(sessionUser) currentUser = sessionUser.username;
  } catch (e) {
    location.href = "/login/index.html";
  }
})();

/* LOGOUT */
document.getElementById("logoutBtn").onclick = async () => {
  await fetch("/api/logout",{ method:"POST", credentials:"include" });
  location.href="/login/index.html";
};

/* TOAST */
function showToast(msg, duration=1500){
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.background="#198754";
  toast.style.color="#fff";
  toast.style.padding="10px 20px";
  toast.style.borderRadius="8px";
  toast.style.boxShadow="0 4px 10px rgba(0,0,0,0.2)";
  toast.style.zIndex=9999;
  toast.style.opacity=0;
  toast.style.transition="opacity 0.3s";
  document.body.appendChild(toast);
  requestAnimationFrame(()=>toast.style.opacity=1);
  setTimeout(()=>{ toast.style.opacity=0; setTimeout(()=>toast.remove(),300); }, duration);
}

/* MODAL POPUP */
function showModal(title, inputValue="", onConfirm){
  const overlay = document.createElement("div");
  overlay.style.position="fixed";
  overlay.style.top=0;
  overlay.style.left=0;
  overlay.style.width="100%";
  overlay.style.height="100%";
  overlay.style.background="rgba(0,0,0,0.5)";
  overlay.style.display="flex";
  overlay.style.alignItems="center";
  overlay.style.justifyContent="center";
  overlay.style.zIndex=10000;

  const modal = document.createElement("div");
  modal.style.background="#fff";
  modal.style.padding="20px";
  modal.style.borderRadius="12px";
  modal.style.minWidth="300px";
  modal.style.boxShadow="0 4px 12px rgba(0,0,0,0.3)";

  const h3 = document.createElement("h3");
  h3.textContent = title;
  h3.style.marginBottom="12px";

  const input = document.createElement("input");
  input.type="text";
  input.value = inputValue;
  input.style.width="100%";
  input.style.padding="8px";
  input.style.marginBottom="12px";
  input.style.border="1px solid #ccc";
  input.style.borderRadius="6px";

  const btnConfirm = document.createElement("button");
  btnConfirm.textContent = "OK";
  btnConfirm.style.marginRight="10px";
  btnConfirm.style.background="#0d6efd";
  btnConfirm.style.color="#fff";
  btnConfirm.style.border="none";
  btnConfirm.style.padding="6px 12px";
  btnConfirm.style.borderRadius="6px";
  btnConfirm.style.cursor="pointer";

  const btnCancel = document.createElement("button");
  btnCancel.textContent = "Cancel";
  btnCancel.style.background="#dc3545";
  btnCancel.style.color="#fff";
  btnCancel.style.border="none";
  btnCancel.style.padding="6px 12px";
  btnCancel.style.borderRadius="6px";
  btnCancel.style.cursor="pointer";

  btnConfirm.onclick = () => {
    onConfirm(input.value);
    overlay.remove();
  };
  btnCancel.onclick = () => overlay.remove();

  modal.appendChild(h3);
  modal.appendChild(input);
  modal.appendChild(btnConfirm);
  modal.appendChild(btnCancel);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  input.focus();
}

/* TABLE & FILTER */
const table = document.getElementById("fileTable");
const filter = document.getElementById("filter");
let files = [];

function formatSize(bytes){
  const sizes=["B","KB","MB","GB"];
  let i=0; while(bytes>=1024 && i<3){ bytes/=1024; i++; }
  return bytes.toFixed(2)+" "+sizes[i];
}

/* LOAD FILES */
async function loadFiles(){
  try{
    const res = await fetch("/api/files",{ credentials:"include" });
    files = await res.json();
    render();
  }catch(err){ console.error(err); }
}

/* RENDER TABLE */
function render(){
  if(!currentUser) return setTimeout(render, 100); // tunggu currentUser terisi
  let sorted = [...files];
  const type = filter.value;
  if(type==="newest") sorted.sort((a,b)=>new Date(b.created)-new Date(a.created));
  if(type==="oldest") sorted.sort((a,b)=>new Date(a.created)-new Date(b.created));
  if(type==="largest") sorted.sort((a,b)=>b.size-a.size);
  if(type==="smallest") sorted.sort((a,b)=>a.size-b.size);

  table.innerHTML="";
  sorted.forEach(file=>{
    const url = `${location.origin}/downloads/?user=${encodeURIComponent(currentUser)}&file=${encodeURIComponent(file.name)}`; // pakai username=
    const row = document.createElement("tr");
    row.innerHTML=`
      <td>${file.name}</td>
      <td>${formatSize(file.size)}</td>
      <td><a href="${url}" class="btn-copy" target="_blank">Open</a></td>
      <td><button class="btn-edit" data-file="${file.name}">Edit</button></td>
      <td><button class="btn-delete" data-file="${file.name}">Delete</button></td>
    `;
    table.appendChild(row);
  });
}

/* EVENT DELEGATION UNTUK COPY, EDIT, DELETE */
table.addEventListener("click", (e) => {
  const fileName = e.target.dataset.file;
  if(!fileName) return;

  if(e.target.classList.contains("btn-copy")){
    if(!currentUser) return showToast("User belum terdeteksi!");
    // URL FIXED
    const url = `https://domain.com/downloads/?username=${encodeURIComponent(currentUser)}&file=${encodeURIComponent(fileName)}`;
    navigator.clipboard.writeText(url)
      .then(() => showToast("Link berhasil dicopy!"))
      .catch(() => showToast("Gagal copy link!"));
  }

  if(e.target.classList.contains("btn-edit")){
    renameFile(fileName);
  }

  if(e.target.classList.contains("btn-delete")){
    deleteFile(fileName);
  }
});

/* DELETE FILE */
async function deleteFile(name){
  showModal("Hapus file?", "", async () => {
    await fetch("/api/files/"+encodeURIComponent(name),{ method:"DELETE", credentials:"include" });
    files = files.filter(f=>f.name!==name);
    render();
    showToast("Deleted!");
  });
}

/* RENAME FILE */
async function renameFile(oldName){
  const nameOnly = oldName.replace(/\.[^/.]+$/, ""); // tampilkan tanpa ekstensi

  showModal("Edit Nama File", nameOnly, async (newName)=>{
    newName = newName.trim();
    if(!newName || newName === nameOnly) return showToast("Nama tidak valid atau sama");

    try {
      const res = await fetch("/api/files/"+encodeURIComponent(oldName),{
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name: newName }),
        credentials:"include"
      });
      const result = await res.json();
      if(result.success){
        const idx = files.findIndex(f => f.name === oldName);
        if(idx>=0) files[idx].name = newName + oldName.substring(oldName.lastIndexOf(".")); // update di table dengan ekstensi
        render();
        showToast("Renamed!");
      } else {
        showToast("Gagal: "+(result.error||"unknown"));
      }
    } catch(err){
      console.error(err);
      showToast("Terjadi kesalahan!");
    }
  });
}

/* FILTER CHANGE */
filter.addEventListener("change", render);

/* INITIAL LOAD */
loadFiles();