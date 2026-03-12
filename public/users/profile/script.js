let currentUser = null
let pendingA2FA = null

async function loadProfile(){

const res = await fetch("/api/user/profile",{credentials:"include"})

if(!res.ok){
console.error("API ERROR")
return
}

const user = await res.json()

console.log(user)

currentUser = user

document.getElementById("usernameTitle").innerText = user.username

const container = document.getElementById("profileData")
container.innerHTML = ""

const fields = [
["Email",user.email],
["Role",user.role],
["Verified",user.verified]
]

fields.forEach(f=>{
const row = document.createElement("div")
row.className="profile-item"
row.innerHTML = `<span>${f[0]}</span><span>${f[1]}</span>`
container.appendChild(row)
})

addEditable("Username","username",user.username,editUsername)
addEditable("Password","password","",editPassword)
addEditable("A2FA (WhatsApp)","a2fa",user.A2FA,editA2FA)

}

function addEditable(label,id,value,func){

const row = document.createElement("div")
row.className="profile-item"

row.innerHTML = `
<span>${label}</span>
<div>
<input id="${id}" value="${value}">
<button class="btn" onclick="${func.name}()">Edit</button>
</div>
`

document.getElementById("profileData").appendChild(row)

}

async function editUsername(){

const username = document.getElementById("username").value

const res = await fetch("/api/user/username",{
method:"PUT",
headers:{ "Content-Type":"application/json"},
credentials:"include",
body:JSON.stringify({username})
})

const data = await res.json()
alert(data.message)

loadProfile()

}

async function editPassword(){

const password = document.getElementById("password").value

const res = await fetch("/api/user/password",{
method:"PUT",
headers:{ "Content-Type":"application/json"},
credentials:"include",
body:JSON.stringify({password})
})

const data = await res.json()
alert(data.message)

}

async function editA2FA(){

const number = document.getElementById("a2fa").value

pendingA2FA = number

await fetch("/api/user/send-otp",{
method:"POST",
headers:{ "Content-Type":"application/json"},
credentials:"include",
body:JSON.stringify({number})
})

document.getElementById("otpPopup").style.display="flex"

}

async function verifyOtp(){

const otp = document.getElementById("otpInput").value

const res = await fetch("/api/user/verify-otp",{
method:"POST",
headers:{ "Content-Type":"application/json"},
credentials:"include",
body:JSON.stringify({
otp,
number:pendingA2FA
})
})

const data = await res.json()

alert(data.message)

document.getElementById("otpPopup").style.display="none"

loadProfile()

}

loadProfile()