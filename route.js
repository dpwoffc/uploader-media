const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const transporter = require("./smtp/smtp");
const validateUpload = require("./validation/uploadsValidation");

const UserDataPath = path.join(__dirname, "database", "user.json");
const AdminDataPath = path.join(__dirname, "database", "admin.json");
const UploadBasePath = path.join(__dirname, "public", "database");

const MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }
});

const otpStore = {};

function readUsers() {
    if (!fs.existsSync(UserDataPath)) {
        fs.writeFileSync(UserDataPath, "[]");
    }
    return JSON.parse(fs.readFileSync(UserDataPath, "utf8"));
}

function saveUsers(data) {
    fs.writeFileSync(UserDataPath, JSON.stringify(data, null, 2));
}

function readAdmins() {
    if (!fs.existsSync(AdminDataPath)) {
        fs.writeFileSync(AdminDataPath, "[]");
    }
    return JSON.parse(fs.readFileSync(AdminDataPath, "utf8"));
}

function saveAdmins(data) {
    fs.writeFileSync(AdminDataPath, JSON.stringify(data, null, 2));
}

function getFolderSize(folder){

let total = 0;

if(!fs.existsSync(folder)) return 0;

const files = fs.readdirSync(folder);

files.forEach(file=>{

const filePath = path.join(folder,file);
const stat = fs.statSync(filePath);

if(stat.isFile()){
total += stat.size;
}

});

return total;

}

function getNextNumber(username){

const userFolder = path.join(UploadBasePath, username);

if(!fs.existsSync(userFolder)){
fs.mkdirSync(userFolder,{recursive:true});
return 1;
}

const files = fs.readdirSync(userFolder);

let max = 0;

files.forEach(file=>{

const match = file.match(/-(\d+)/);

if(match){
const num = parseInt(match[1]);
if(num > max) max = num;
}

});

return max + 1;

}

router.post("/api/register", async (req, res) => {
    const { username, email, password } = req.body;
    const users = readUsers();

    if (!username || !email || !password) {
        return res.json({ success:false, message:"Lengkapi semua data"});
    }

    if (!email.endsWith("@gmail.com")) {
        return res.json({ success:false, message:"Email harus Gmail"});
    }

    if (users.find(u=>u.email===email)) {
        return res.json({ success:false, message:"Email sudah terdaftar"});
    }

    if (users.find(u=>u.username===username)) {
        return res.json({ success:false, message:"Username sudah dipakai"});
    }

    const otp = Math.floor(100000 + Math.random()*900000);

    otpStore[email] = { otp, username, password };

    await transporter.sendMail({
        to: email,
        subject: "OTP Verification",
        html: `Kode OTP: <b>${otp}</b>`
    });

    res.json({ success:true });

});

router.post("/api/verify-otp", (req,res)=>{
    const { email, otp } = req.body;
    if (!otpStore[email] || otpStore[email].otp != otp) {
        return res.json({ success:false, message:"OTP salah"});
    }
    const users = readUsers();
    const data = otpStore[email];
    const userUploadPath = path.join(UploadBasePath, data.username);
    
    if (!fs.existsSync(UploadBasePath)) {
        fs.mkdirSync(UploadBasePath,{recursive:true});
    }

    if (!fs.existsSync(userUploadPath)) {
        fs.mkdirSync(userUploadPath);
    }

    users.push({
        username:data.username,
        email,
        password:data.password,
        role:"user",
        verified:true,
        uploadsPath:`./public/database/${data.username}`,
        cookies:""
    });

    saveUsers(users);
    delete otpStore[email];
    res.json({ success:true });
});

router.post("/api/login",(req,res)=>{

    const { email, password } = req.body;

    const users = readUsers();
    const admins = readAdmins();

    const user = users.find(u=>u.email===email && u.password===password);
    const admin = admins.find(a=>a.email===email && a.password===password);

    if(!user && !admin){
        return res.json({success:false,message:"Email atau password salah"});
    }

    const session = crypto.randomUUID();

    if(user){
        user.cookies = session;
        saveUsers(users);
    }

    if(admin){
        admin.cookies = session;
        saveAdmins(admins);
    }

    res.cookie("session",session,{
        httpOnly:true,
        maxAge:2592000000
    });

    res.json({success:true, role: admin ? "admin":"user"});

});

router.get("/api/check-session",(req,res)=>{

    const session = req.cookies?.session;

    if(!session) return res.json({logged:false});

    const users = readUsers();
    const admins = readAdmins();

    const user = users.find(u=>u.cookies===session);
    const admin = admins.find(a=>a.cookies===session);

    if(!user && !admin){
        return res.json({logged:false});
    }

    res.json({
        logged: true,
        role: admin ? "admin" : "user",
        username: admin ? admin.username : user.username
    });

});

router.post("/api/logout",(req,res)=>{

    const session = req.cookies?.session;

    if(session){

        const users = readUsers();
        const admins = readAdmins();

        const user = users.find(u=>u.cookies===session);
        const admin = admins.find(a=>a.cookies===session);

        if(user){
            user.cookies="";
            saveUsers(users);
        }

        if(admin){
            admin.cookies="";
            saveAdmins(admins);
        }

    }

    res.clearCookie("session",{httpOnly:true,path:"/"});

    res.json({success:true});

});

router.get("/api/users",(req,res)=>{
    const users = readUsers();
    res.json(users);
});

router.put("/api/users/:username/password",(req,res)=>{
    const { username } = req.params;
    const { password } = req.body;
    const users = readUsers();
    const user = users.find(u=>u.username===username);
    if(!user){
        return res.json({message:"User tidak ditemukan"});
    }
    user.password = password;
    saveUsers(users);
    res.json({message:"Password berhasil diubah"});
});

router.delete("/api/users/:username",(req,res)=>{
    const { username } = req.params;
    let users = readUsers();
    const user = users.find(u=>u.username===username);
    if(!user){
        return res.json({message:"User tidak ditemukan"});
    }
    const userFolder = path.join(UploadBasePath,username);
    if(fs.existsSync(userFolder)){
        fs.rmSync(userFolder,{recursive:true,force:true});
    }
    users = users.filter(u=>u.username!==username);
    saveUsers(users);
    res.json({message:"User dan folder upload berhasil dihapus"});
});

function getNextNumber(username){
const userFolder = path.join(UploadBasePath, username);
if(!fs.existsSync(userFolder)){
fs.mkdirSync(userFolder,{recursive:true});
return 1;
}
const files = fs.readdirSync(userFolder);
let max = 0;
files.forEach(file=>{
const match = file.match(/-(\d+)/);
if(match){
const num = parseInt(match[1]);
if(num > max) max = num;
}
});
return max + 1;
}

router.post("/api/upload", upload.single("file"), (req,res)=>{
try{
const file = req.file;
if(!file){
return res.json({success:false,message:"File tidak ada"});
}
validateUpload(file);
const session = req.cookies?.session;
const users = readUsers();
const user = users.find(u=>u.cookies===session);
if(!user){
return res.status(403).json({success:false,message:"Unauthorized"});
}

const userFolder = path.join(UploadBasePath,user.username);

fs.mkdirSync(userFolder,{recursive:true});

const currentSize = getFolderSize(userFolder);

if(currentSize + file.size > MAX_STORAGE){

return res.json({
success:false,
message:"Storage user mencapai limit 5GB"
});

}

const next = getNextNumber(user.username);

const ext = path.extname(file.originalname);

const filename = `${user.username}-${next}${ext}`;

const filePath = path.join(userFolder,filename);

fs.writeFileSync(filePath,file.buffer);

res.json({
success:true,
filename
});

}catch(err){

res.json({
success:false,
message:err.message
});

}

});

/* =========================
   GET USER FILES
========================= */

router.get("/api/files",(req,res)=>{

const session = req.cookies?.session;

const users = readUsers();
const user = users.find(u=>u.cookies===session);

if(!user){
return res.status(403).json({success:false});
}

const userFolder = path.join(UploadBasePath,user.username);

if(!fs.existsSync(userFolder)){
return res.json([]);
}

const files = fs.readdirSync(userFolder).map(file=>{

const filePath = path.join(userFolder,file);
const stat = fs.statSync(filePath);

return{
name:file,
size:stat.size,
created:stat.birthtime
};

});

res.json(files);

});


/* =========================
   DELETE FILE
========================= */

router.delete("/api/files/:name",(req,res)=>{

const session = req.cookies?.session;

const users = readUsers();
const user = users.find(u=>u.cookies===session);

if(!user){
return res.status(403).json({success:false});
}

const filePath = path.join(UploadBasePath,user.username,req.params.name);

if(fs.existsSync(filePath)){
fs.unlinkSync(filePath);
}

res.json({success:true});

});

/* =========================
   RENAME FILE
========================= */
router.put("/api/files/:name", (req, res) => {
  const session = req.cookies?.session;
  const users = readUsers();
  const user = users.find(u => u.cookies === session);
  if(!user) return res.status(403).json({success:false});

  const oldName = req.params.name;
  let newName = req.body.name?.trim();
  if(!newName) return res.status(400).json({success:false, error:"Nama baru kosong"});
  if(oldName === newName) return res.json({success:false, error:"Nama sama dengan sebelumnya"});

  const oldPath = path.join(UploadBasePath, user.username, oldName);
  if(!fs.existsSync(oldPath)) return res.json({success:false, error:"File tidak ditemukan"});

  const ext = path.extname(oldName); // ambil ekstensi lama
  newName = newName + ext; // tambahkan ekstensi lama
  const newPath = path.join(UploadBasePath, user.username, newName);

  if(fs.existsSync(newPath)) return res.json({success:false, error:"File dengan nama baru sudah ada"});

  try {
    fs.renameSync(oldPath, newPath);
    return res.json({success:true});
  } catch(err){
    console.error(err);
    return res.status(500).json({success:false, error:"Gagal rename file"});
  }
});
module.exports = router;
