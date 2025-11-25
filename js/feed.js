import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {

    const textarea = document.getElementById('mensaje');
    const btnPublicar = document.getElementById('publicarBtn');
    let isAuthenticated = false;

    btnPublicar?.addEventListener('click', (event) => {
        if (!isAuthenticated) {
            event.preventDefault();
            window.location.href = "login.html";
        }else{
            enviarPost();
        }
    });

    onAuthStateChanged(auth, (user) => {
        isAuthenticated = Boolean(user);
        console.log(isAuthenticated);
        if (isAuthenticated == true) {
            btnPublicar.textContent = "Publicar"
            currentUser = user.displayName;
        }else{
            textarea.disabled = "true";
        }
    });
});
const publicarBtn = document.getElementById("publicarBtn");

async function enviarPost () {
    const mensaje = document.getElementById("mensaje").value.trim();
    const estado = document.getElementById("estado");

    if (!mensaje) {
        estado.style.color = "#FFB30F";
        estado.textContent = "Por favor escribe un mensaje antes de publicar.";
        return;
    }

    publicarBtn.disabled = true;
    publicarBtn.style.backgroundColor = "#FFB30F";
    publicarBtn.textContent = "Publicando...";
    const PAGE_ID = "809241768945035";
    const ACCESS_TOKEN = "EAAfnTtgFdgMBQL8FxCc6vMuhyIShlj5nv4T7X02ZCzWLaRNa6A2SFCh3Qkh4zCUQl7eSNVoFHkpBs44KTvBMGU5uti1EZCiJ8bB1Hq8s39I2c1dh5r4uaM3etBO2ObLGRokkEVabOJ360bnn8V1JyuQOqjSwZCqfU2YblvozPten0XgsOekZCazDQiLfWOZAyyIZAa3ZAjplUdAj9zfwcHU1a8p2dOZAZCFsaZCscsdGkZD";
  
    const mensajeFinal = `${mensaje}\n- ${currentUser}`;

    try {
        const response = await fetch(`https://graph.facebook.com/${PAGE_ID}/feed`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: mensajeFinal,
            access_token: ACCESS_TOKEN
        })
    });

    const data = await response.json();

    if (data.id) {
        estado.style.color = "#849324";
        estado.textContent = "✅ Publicación realizada con éxito. ID: " + data.id;
        document.getElementById("mensaje").value = "";
    } else {
        estado.style.color = "#FD151B";
        estado.textContent = "⚠️ Error al publicar: " + JSON.stringify(data);
    }
    } catch (error) {
        estado.style.color = "#FD151B";
        estado.textContent = "❌ Error de conexión: " + error;
    }

    publicarBtn.disabled = false;
    publicarBtn.textContent = "Publicar";
    publicarBtn.style.backgroundColor = "#849324";

    cargarPublicaciones();
};


const feed = document.getElementById("feed");

function cargarPublicaciones() {
  fetch("https://graph.facebook.com/v24.0/809241768945035/posts?fields=message,created_time,full_picture&access_token=EAAfnTtgFdgMBQL8FxCc6vMuhyIShlj5nv4T7X02ZCzWLaRNa6A2SFCh3Qkh4zCUQl7eSNVoFHkpBs44KTvBMGU5uti1EZCiJ8bB1Hq8s39I2c1dh5r4uaM3etBO2ObLGRokkEVabOJ360bnn8V1JyuQOqjSwZCqfU2YblvozPten0XgsOekZCazDQiLfWOZAyyIZAa3ZAjplUdAj9zfwcHU1a8p2dOZAZCFsaZCscsdGkZD")
    .then(response => response.json())
    .then(data => {
    feed.innerHTML = ""; // Limpiar antes de volver a llenar

    if (!data.data) {
        feed.innerHTML = "<p>No se pudieron cargar las publicaciones.</p>";
        return;
    }

    data.data.forEach(post => {
        const publicacion = document.createElement("div");
        publicacion.classList.add("publicacion");

        const fecha = new Date(post.created_time).toLocaleString();

        let contenido = `
          <div class="head-publi">
            <img src="./assets/images/logo-temp.png">
            <h3>Comunidad Universia</h3>
          </div>
          <small>${fecha}</small>
          <p>${post.message ? post.message : ""}</p>
        `;

        // Si hay imagen o video
        if (post.full_picture) {
          contenido += `<img src="${post.full_picture}" class="imagen-publi">`;
        }

        publicacion.innerHTML = contenido;
        feed.appendChild(publicacion);
        });
    })
    .catch(error => {
      console.error(error);
      feed.innerHTML = "<p>Error al cargar las publicaciones.</p>";
    });
}

// Cargar publicaciones al entrar a la página
cargarPublicaciones();