import os
from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "notegeli_pro_2026"

USUARIO = "juan"
PASSWORD = "1234"
NOTAS_DIR = "notas"
meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

if not os.path.exists(NOTAS_DIR):
    os.makedirs(NOTAS_DIR)

# --- FUNCIONES DE APOYO ---
def extraer_info_tiempo(filename):
    parts = filename.split("_")
    if len(parts[0]) == 10 and "-" in parts[0]:
        try:
            yyyy, mm, dd = parts[0].split("-")
            return {"valor": f"{dd}/{mm}/{yyyy}", "es_fecha": True}
        except: pass
    return {"valor": "", "es_fecha": False}

# --- RUTAS PRINCIPALES ---
@app.route("/", methods=["GET", "POST"])
def index():
    if "user" not in session:
        return redirect(url_for("login"))

    hoy = datetime.now()
    fecha_larga = f"{hoy.day} {meses[hoy.month - 1]} {hoy.year}"

    if request.method == "POST":
        texto = request.form.get("texto")
        fecha = request.form.get("fecha")
        color = request.form.get("color")
        
        if texto:
            timestamp = datetime.now().strftime("%H%M%S")
            titulo_linea = texto.splitlines()[0][:15] if texto.strip() else "Nota"
            titulo_limpio = "".join(e for e in titulo_linea if e.isalnum() or e == " ").strip().replace(" ", "-")
            prefijo = fecha if (fecha and fecha.strip()) else "sinfecha"
            nombre = f"{prefijo}_{titulo_limpio}_{timestamp}.txt"

            with open(os.path.join(NOTAS_DIR, nombre), "w", encoding="utf-8", newline="\n") as f:
                if color: f.write(f"COLOR:{color}\n")
                f.write(texto.replace("\r\n", "\n").rstrip("\n"))
        return redirect(url_for("index"))

    archivos = os.listdir(NOTAS_DIR)
    archivos.sort(key=lambda x: os.path.getmtime(os.path.join(NOTAS_DIR, x)), reverse=True)

    notas_lista = []
    avisos_manana = []
    manana_str = (hoy + timedelta(days=1)).strftime('%Y-%m-%d')

    for a in archivos:
        try:
            with open(os.path.join(NOTAS_DIR, a), "r", encoding="utf-8") as f:
                contenido = f.read()

            lineas = contenido.split("\n")
            color = None
            if lineas and lineas[0].startswith("COLOR:"):
                color = lineas[0].replace("COLOR:", "").strip()
                contenido_final = "\n".join(lineas[1:])
            else:
                contenido_final = contenido

            tiempo = extraer_info_tiempo(a)
            notas_lista.append({
                "archivo": a,
                "preview": contenido_final,
                "contenido_raw": contenido_final,
                "tiempo": tiempo,
                "color": color
            })

            if tiempo["es_fecha"] and a.startswith(manana_str):
                avisos_manana.append({
                    "preview": contenido_final[:45],
                    "archivo": a,
                    "fecha": tiempo["valor"]
                })
        except: continue

    return render_template("index.html", notas=notas_lista, manana=avisos_manana, fecha_larga=fecha_larga)

@app.route("/editar_guardar", methods=["POST"])
def editar_guardar():
    if "user" not in session: return redirect(url_for("login"))
    archivo = request.form.get("archivo")
    nuevo_texto = request.form.get("texto") or ""
    nuevo_color = request.form.get("color") or ""
    
    if archivo:
        path_nota = os.path.join(NOTAS_DIR, archivo)
        if os.path.exists(path_nota):
            with open(path_nota, "w", encoding="utf-8", newline="\n") as f:
                if nuevo_color: f.write(f"COLOR:{nuevo_color}\n")
                f.write(nuevo_texto.replace("\r\n", "\n").rstrip("\n"))
    return redirect(url_for("index"))

@app.route("/borrar/<archivo>")
def borrar(archivo):
    if "user" not in session: return redirect(url_for("login"))
    path = os.path.join(NOTAS_DIR, archivo)
    if os.path.exists(path): os.remove(path)
    return redirect(url_for("index"))

# --- RUTAS DE ACCESO ---
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form.get("usuario") == USUARIO and request.form.get("password") == PASSWORD:
            session["user"] = USUARIO
            return redirect(url_for("index"))
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

# --- RUTAS PWA (CRUCIALES) ---
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)