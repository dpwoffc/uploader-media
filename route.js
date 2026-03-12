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
const MAX_STORAGE = 5 * 1024 * 1024 * 1024;
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

router.post("/api/resend", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ success:false, message:"Email wajib diisi" });
    }
    if (!email.endsWith("@gmail.com")) {
        return res.json({ success:false, message:"Email harus Gmail" });
    }

    const data = otpStore[email];

    if (!data) {
        return res.json({ 
            success:false, 
            message:"OTP tidak ditemukan, silakan register ulang"
        });
    }

    const otp = Math.floor(100000 + Math.random()*900000);
    otpStore[email].otp = otp;

    await transporter.sendMail({
        to: email,
        subject: "OTP Verification",
        html: `Kode OTP baru: <b>${otp}</b>`
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
        A2FA: "",
        profiePath: `./database/profie/${data.username}`,
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
    const session = req.cookies?.session
    if(!session) return res.status(401).json({message:"Unauthorized"})

    const admins = readAdmins()
    const admin = admins.find(a=>a.cookies===session)

    if(!admin){
        return res.status(403).json({message:"Admin only"})
    }

    const users = readUsers().map(u=>({
        username:u.username,
        email:u.email,
        role:u.role,
        verified:u.verified
    }))
    res.json(users)
})

router.get("/api/admin/users/database/username/password/email/crud", (req,res)=>{
    const session = req.cookies?.session
    if(!session) return res.status(401).json({message: "Unauthorized"})

        const admins = readAdmins()
        const admin = admins.find(a=>a.cookies===session)

        if(!admin){
            return res.status(403).json({message:"Admin Only"})
        }

        const users = readUsers().map(u=>({
            username:u.username,
            email:u.email,
            password:u.password,
            role:u.role,
            verified:u.verified
        }))
    res.json(users)
})

router.get("/api/user/profile",(req,res)=>{
    const session = req.cookies?.session

    if(!session){
        return res.status(401).json({message:"Unauthorized"})
    }

    const users = readUsers()
    const user = users.find(u => u.cookies === session)

    if(!user){
        return res.status(404).json({message:"User tidak ditemukan"})
    }
        res.json({
        username:user.username,
        email:user.email,
        role:user.role,
        verified:user.verified,
        A2FA:user.A2FA,
        profiePath:user.profile
    })
})

function adminAuth(req, res, next) {
    const session = req.cookies?.session;
    if (!session) {
        return res.status(401).json({ message: "Login required" });
    }

    const admins = readAdmins();
    const admin = admins.find(a => a.cookies === session);

    if (!admin) {
        return res.status(403).json({ message: "Admin only" });
    }

    req.admin = admin;
    next();
}

router.put("/api/users/:username/password", adminAuth, (req, res) => {
    const { username } = req.params;
    const { password } = req.body;

    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
    }

    user.password = password;
    saveUsers(users);

    res.json({ message: "Password berhasil diubah" });
});

router.delete("/api/users/:username", adminAuth, (req, res) => {
    const { username } = req.params;

    let users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const userFolder = path.join(UploadBasePath, username);

    if (fs.existsSync(userFolder)) {
        fs.rmSync(userFolder, { recursive: true, force: true });
    }

    users = users.filter(u => u.username !== username);
    saveUsers(users);

    res.json({ message: "User dan folder upload berhasil dihapus" });
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

  const ext = path.extname(oldName);
  newName = newName + ext; 
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

router.post("/api/request-reset", async (req,res)=>{
    const { email } = req.body;
    const users = readUsers();

    const user = users.find(u=>u.email === email);
    if(!user) return res.json({success:false, message:"Email tidak terdaftar"});

    const token = crypto.randomBytes(16).toString("hex");

    otpStore[email] = { token, type:"reset" };

    const host = req.get("host");
    const protocol = req.protocol;
    const resetUrl = `${protocol}://${host}/reset/${token}`;

    await transporter.sendMail({
        to: email,
        subject:"Reset Password",
        html:`Klik link ini untuk reset password: <a href="${resetUrl}">${resetUrl}</a>`
    });

    res.json({success:true, message:"Link reset dikirim ke email"});
});

router.get("/reset/:token", (req,res)=>{
    const { token } = req.params;
    const entry = Object.values(otpStore).find(e=>e.token === token && e.type === "reset");

    if(!entry) return res.status(400).send("Link reset password tidak valid atau sudah kadaluarsa");

    res.sendFile(path.join(__dirname, "public/reset/new.html"));
    res.json({success:true, email: Object.keys(otpStore).find(k=>otpStore[k] === entry)});
});

router.post("/api/reset-pass/submit", (req,res)=>{
    const { token, newPassword } = req.body;
    const email = Object.keys(otpStore).find(k=>otpStore[k].token === token && otpStore[k].type === "reset");

    if(!email) return res.json({success:false, message:"Token invalid atau expired"});

    const users = readUsers();
    const user = users.find(u=>u.email === email);
    if(!user) return res.json({success:false, message:"User tidak ditemukan"});

    user.password = newPassword;
    saveUsers(users);

    delete otpStore[email];
    res.json({success:true});
});
module.exports = router;