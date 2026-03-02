const fileInput = document.getElementById("fileInput");
const dropArea = document.getElementById("dropArea");
const fileInfo = document.getElementById("fileInfo");
const previewBox = document.getElementById("previewBox");
const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("progressContainer");

dropArea.addEventListener("click", () => {
fileInput.click();
});

fileInput.addEventListener("change", previewFile);

function previewFile(){

const file = fileInput.files[0];

if(!file) return;

fileInfo.innerText = "File: " + file.name;

previewBox.innerHTML = "";

const url = URL.createObjectURL(file);

if(file.type.startsWith("image/")){

const img = document.createElement("img");
img.src = url;
previewBox.appendChild(img);

}

else if(file.type.startsWith("video/")){

const video = document.createElement("video");
video.src = url;
video.controls = true;
previewBox.appendChild(video);

}

else if(file.type.startsWith("audio/")){

const audio = document.createElement("audio");
audio.src = url;
audio.controls = true;
previewBox.appendChild(audio);

}

else{

previewBox.innerHTML = "<p>Preview tidak tersedia</p>";

}

}

dropArea.addEventListener("dragover",(e)=>{
e.preventDefault();
dropArea.style.background="#eef3ff";
});

dropArea.addEventListener("dragleave",()=>{
dropArea.style.background="";
});

dropArea.addEventListener("drop",(e)=>{

e.preventDefault();

fileInput.files = e.dataTransfer.files;

previewFile();

});

async function uploadFile(){

const file = fileInput.files[0];

if(!file){
alert("Pilih file dulu");
return;
}

progressContainer.style.display="block";

const form = new FormData();
form.append("file",file);

const xhr = new XMLHttpRequest();

xhr.open("POST","/api/upload",true);
xhr.withCredentials = true;

xhr.upload.onprogress = function(e){

if(e.lengthComputable){

const percent = (e.loaded/e.total)*100;

progressBar.style.width = percent+"%";

}

};

xhr.onload = function(){

const res = JSON.parse(xhr.responseText);

alert(res.message || "Upload selesai");

};

xhr.send(form);

}

document.getElementById("logoutBtn").onclick = async () => {

await fetch("/api/logout",{
method:"POST",
credentials:"include"
});

location.href="/login/index.html";

};

/* SIDEBAR MOBILE */
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
