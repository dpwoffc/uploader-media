const path = require("path");

const MAX_SIZE = 500 * 1024 * 1024; // 500MB

const allowedExt = [
".zip",".rar",".7z",".tar",".gz",".tar.gz",
".jpg",".jpeg",".png",".gif",".webp",
".mp4",".mkv",".mov",".avi",
".mp3",".wav",".flac",".aac",
".pdf",".doc",".docx",".xls",".xlsx"
];

const blockedExt = [
".js",".ts",".py",".php",".java",".c",".cpp",".cs",
".rb",".go",".rs",".swift",".kt",".dart",".sh",
".html",".css",".jsx",".tsx",".json",".xml"
];

function validateUpload(file){

const ext = path.extname(file.originalname).toLowerCase();

if(file.size > MAX_SIZE){
throw new Error("File melebihi 500MB");
}

if(blockedExt.includes(ext)){
throw new Error("Format file bahasa pemrograman tidak diizinkan");
}

if(!allowedExt.includes(ext)){
throw new Error("Format file tidak didukung");
}

}

module.exports = validateUpload;