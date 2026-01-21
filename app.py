import os
from flask import Flask, render_template, request, redirect, url_for, session
from datetime import datetime, timedelta
from flask import send_from_directory

app = Flask(__name__)
app.secret_key = "notegeli_pro_2026"

USUARIO = "juan"
PASSWORD = "1234"
NOTAS_DIR = "notas"
meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]

hoy = datetime.now()
fecha_larga = f"{hoy.day} {meses[hoy.month - 1]} {hoy.year}"

if not os.path.exists(NOTAS_DIR):
    os.makedirs(NOTAS_DIR)

def formatear_nombre(filename):
    name = filename.replace(".txt", "")
    parts = name.split("_")
    if len(parts) >= 3:
        return "_".join(parts[1:-1])
    return name

def extraer_info_tiempo(filename):
    name = filename.replace(".txt", "")
    parts = name.split("_")

    if len(parts[0]) == 10 and "-" in parts[0]:
        yyyy, mm, dd = parts[0].split("-")
        return {"valor": f"{dd}/{mm}/{yyyy}", "es_fecha": True}
    
    if len(parts) >= 3:
        ts = parts[-1]
        if len(ts) >= 4:
            return {"valor": f"{ts[:2]}:{ts[2:4]}", "es_fecha": False}
    return {"valor": "00:00", "es_fecha": False}

@app.route("/", methods=["GET", "POST"])
def index():
    if "user" not in session:
        return redirect(url_for("login"))

    if request.method == "POST":
        texto = request.form.get("texto")
        fecha = request.form.get("fecha")
        if texto:
            ts = datetime.now().strftime("%H%M%S")
            titulo_linea = texto.splitlines()[0][:20] if texto.strip() else "Nota"
            titulo = "".join(e for e in titulo_linea if e.isalnum() or e == " ").strip()
            
            if fecha and fecha.strip():
                prefijo = fecha
            else:
                prefijo = "sinfecha"
                
            nombre = f"{prefijo}_{titulo}_{ts}.txt"

            with open(os.path.join(NOTAS_DIR, nombre), "w", encoding="utf-8", newline="\n") as f:
                f.write(texto.replace("\r\n", "\n").rstrip("\n"))
        return redirect(url_for("index"))

    def sort_key(fname):
        base = fname.replace(".txt", "")
        parts= base.split("_")
        ts = parts[-1]        # HHMMSS
        return ts

    archivos = sorted(os.listdir(NOTAS_DIR), key=sort_key, reverse=True)

    hoy = datetime.now()
    hoy_str = hoy.strftime('%Y-%m-%d')
    manana_str = (hoy + timedelta(days=1)).strftime('%Y-%m-%d')

    notas_lista = []
    avisos = []
    avisos_manana = []
    calendario = []

    for a in archivos:
        try:
            with open(os.path.join(NOTAS_DIR, a), "r", encoding="utf-8") as f:
                contenido = f.read()
            tiempo = extraer_info_tiempo(a)
            titulo = formatear_nombre(a)
            nota_obj = {
                "archivo": a,
                "titulo": titulo,
                "preview": contenido,
                "tiempo": tiempo
            }
            if tiempo["es_fecha"]:
                calendario.append(nota_obj)
                if tiempo["valor"] == hoy_str:
                    avisos.append(titulo)
                elif tiempo["valor"] == manana_str:
                    avisos_manana.append(titulo)
            notas_lista.append(nota_obj)
        except:
            continue

    calendario.sort(key=lambda x: x["tiempo"]["valor"])

    return render_template("index.html",
                           notas=notas_lista,
                           avisos=avisos,
                           manana=avisos_manana,
                           calendario=calendario,
                           current_year=datetime.now().year,
                           current_date=datetime.now().strftime("%d/%m/%Y"),
                           fecha_larga=fecha_larga)
                           
     
    
@app.route("/editar/<archivo>", methods=["GET", "POST"])
def editar(archivo):
    if "user" not in session:
        return redirect(url_for("login"))

    path_viejo = os.path.join(NOTAS_DIR, archivo)

    if request.method == "POST":
        nuevo_texto = request.form.get("texto") or ""
        nuevo_texto = nuevo_texto.replace("\r\n", "\n").rstrip("\n")
        with open(path_viejo, "w", encoding="utf-8", newline="\n") as f:
            f.write(nuevo_texto)
        return redirect(url_for("index"))

    if not os.path.exists(path_viejo):
        return redirect(url_for("index"))

    with open(path_viejo, "r", encoding="utf-8") as f:
        contenido = f.read()

    contenido = contenido.replace("\r\n", "\n").rstrip("\n")

    info = extraer_info_tiempo(archivo)
    fecha_val = info["valor"] if info["es_fecha"] else ""

    return render_template("editar.html", contenido=contenido, fecha=fecha_val)

@app.route("/borrar/<archivo>")
def borrar(archivo):
    if "user" not in session:
        return redirect(url_for("login"))
    path = os.path.join(NOTAS_DIR, archivo)
    if os.path.exists(path):
        os.remove(path)
    return redirect(url_for("index"))

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

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js', mimetype='application/javascript')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
