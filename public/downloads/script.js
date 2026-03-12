function getQuery(){
  const params = new URLSearchParams(window.location.search)

  return {
    user: params.get("user"),
    file: params.get("file")
  }
}

async function init(){

  const {user, file} = getQuery()

  const nameEl = document.getElementById("fileName")
  const sizeEl = document.getElementById("fileSize")
  const btn = document.getElementById("downloadBtn")
  const error = document.getElementById("error")

  if(!user || !file){
    error.innerText = "File tidak ditemukan."
    btn.style.display = "none"
    nameEl.innerText = "-"
    return
  }

  const fileUrl = `/database/${user}/${file}`

  nameEl.innerText = file

  try{

    const res = await fetch(fileUrl)

    if(!res.ok){
      throw new Error("File tidak ada")
    }

    const blob = await res.blob()

    const size = blob.size / 1024

    if(size > 1024){
      sizeEl.innerText = (size/1024).toFixed(2) + " MB"
    }else{
      sizeEl.innerText = size.toFixed(2) + " KB"
    }

    btn.onclick = () => {
      const a = document.createElement("a")
      a.href = fileUrl
      a.download = file
      document.body.appendChild(a)
      a.click()
      a.remove()
    }

  }catch(err){

    error.innerText = "File tidak tersedia."
    btn.style.display = "none"
    sizeEl.innerText = ""

  }

}

init()