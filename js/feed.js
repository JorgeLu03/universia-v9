
const publicarBtn = document.getElementById("publicarBtn");

publicarBtn.addEventListener("click", async () => {
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
    const ACCESS_TOKEN = "EAAfnTtgFdgMBPo4NtaVGvxv7Pw5V4UmBvy31ijVRNjiV1gX7qJBThUZALzYShK1bnp8Qp4bQZARou7bWwkB5NlRcVUOlsZCo0qZBZBRZC7DC9sc3E6sump2cJghUYF6o0miAIdlvsNTmu0fVWnb8xr3rKjbZCq3jmFJcjGnOrLWlkHtWQAF2vvQ9eLe2zL98ay4HevIDFmgDeM6A2kxgblXB43BBWzt62rEfqKVg0FzCiwm";
  
    const mensajeFinal = `${mensaje}\n- Usuario1`;

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
});


const feed = document.getElementById("feed");

function cargarPublicaciones() {
  fetch("https://graph.facebook.com/v24.0/809241768945035/posts?fields=message,created_time,full_picture&access_token=EAAfnTtgFdgMBPo4NtaVGvxv7Pw5V4UmBvy31ijVRNjiV1gX7qJBThUZALzYShK1bnp8Qp4bQZARou7bWwkB5NlRcVUOlsZCo0qZBZBRZC7DC9sc3E6sump2cJghUYF6o0miAIdlvsNTmu0fVWnb8xr3rKjbZCq3jmFJcjGnOrLWlkHtWQAF2vvQ9eLe2zL98ay4HevIDFmgDeM6A2kxgblXB43BBWzt62rEfqKVg0FzCiwm")
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