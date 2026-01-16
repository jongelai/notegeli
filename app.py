from flask import Flask, request, render_template, redirect, url_for, session
from datetime import datetime, date, timedelta
from collections import defaultdict
import os
from flask import send_from_directory

app = Flask(__name__)
CARPETA = "archivos"

app.secret_key = os.getenv("SECRET_KEY", "notegeli_super_secreto")
USUARIO = os.getenv("USUARIO", "juan")
PASSWORD = os.getenv("PASSWORD", "1234")



MESES = {
    1: "Enero", 2: "Febrero", 3: "Marzo",
    4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre",
    10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

def requiere_login():
    return session.get("logueado") == True


# ---- Fechas ----
def formatear(nombre_archivo):
    fecha_str = nombre_archivo.split("_")[0]
    hora_str = nombre_archivo.split("_")[1].replace(".txt", "")

    año, mes, dia = map(int, fecha_str.split("-"))
    hora, minuto, _ = map(int, hora_str.split("-"))

    fecha = datetime(año, mes, dia, hora, minuto)
    hoy = date.today()
    ayer = hoy - timedelta(days=1)

    if fecha.date() == hoy:
        return f"Hoy · {hora:02d}:{minuto:02d}"
    if fecha.date() == ayer:
        return f"Ayer · {hora:02d}:{minuto:02d}"
    if fecha.year == hoy.year:
        return f"{fecha.day} de {MESES[fecha.month]} · {hora:02d}:{minuto:02d}"
    return f"{fecha.day} de {MESES[fecha.month]} {fecha.year} · {hora:02d}:{minuto:02d}"


# ---- Preview ----
def obtener_previews(archivos):
    previews = {}
    for archivo in archivos:
        ruta = os.path.join(CARPETA, archivo)
        try:
            with open(ruta, "r", encoding="utf-8") as f:
                primera = f.readline().strip()
                if len(primera) > 60:
                    primera = primera[:60] + "…"
                previews[archivo] = primera
        except:
            previews[archivo] = ""
    return previews


# ---- Agrupación meses ----
def agrupar_por_mes(archivos):
    grupos = defaultdict(list)
    for archivo in archivos:
        fecha = archivo.split("_")[0]
        año, mes, _ = fecha.split("-")
        mes_nombre = MESES[int(mes)]
        clave = f"{mes_nombre} {año}"
        grupos[clave].append(archivo)

    return dict(sorted(grupos.items(), reverse=True))


@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js', mimetype='application/javascript')


# ---- LOGIN ----
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = request.form.get("usuario")
        pwd = request.form.get("password")

        if user == USUARIO and pwd == PASSWORD:
            session["logueado"] = True
            return redirect(url_for("index"))

        return render_template("login.html", error="Datos incorrectos")

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ---- INDEX ----
@app.route("/", methods=["GET", "POST"])
def index():
    if not requiere_login():
        return redirect(url_for("login"))

    if request.method == "POST":
        texto = request.form.get("texto", "")

        if texto:
            # NORMALIZACIÓN AL CREAR
            texto = texto.replace("\r\n", "\n").replace("\r", "\n")
            texto = texto.rstrip("\n")

            os.makedirs(CARPETA, exist_ok=True)
            fecha = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            nombre = f"{fecha}.txt"
            with open(os.path.join(CARPETA, nombre), "w", encoding="utf-8") as f:
                f.write(texto)

    archivos = sorted(os.listdir(CARPETA), reverse=True) if os.path.exists(CARPETA) else []
    previews = obtener_previews(archivos)
    grupos = agrupar_por_mes(archivos)

    return render_template("index.html", grupos=grupos, previews=previews, formatear=formatear)


# ---- EDITAR ----
@app.route("/editar/<archivo>", methods=["GET", "POST"])
def editar(archivo):
    if not requiere_login():
        return redirect(url_for("login"))

    ruta = os.path.join(CARPETA, archivo)

    if not os.path.exists(ruta):
        return redirect(url_for("index"))

    if request.method == "POST":
        texto = request.form.get("texto", "")

        # NORMALIZAR PARA EVITAR DUPLICACIONES
        texto = texto.replace("\r\n", "\n").replace("\r", "\n")
        texto = texto.rstrip("\n")

        with open(ruta, "w", encoding="utf-8") as f:
            f.write(texto)

        return redirect(url_for("index"))

    with open(ruta, "r", encoding="utf-8") as f:
        contenido = f.read()

    contenido = contenido.replace("\r\n", "\n").replace("\r", "\n")
    contenido = contenido.rstrip("\n")

    return render_template("editar.html", archivo=archivo, contenido=contenido)


# ---- BORRAR ----
@app.route("/borrar/<archivo>")
def borrar(archivo):
    if not requiere_login():
        return redirect(url_for("login"))

    ruta = os.path.join(CARPETA, archivo)
    if os.path.exists(ruta):
        os.remove(ruta)

    return redirect(url_for("index"))


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

