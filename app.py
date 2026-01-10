from flask import Flask, request, render_template, send_file, redirect, url_for, session
from datetime import datetime, date, timedelta
from collections import defaultdict
import os

app = Flask(__name__)
app.secret_key = "notegeli_super_secreto"  # Necesario para sesiones

CARPETA = "archivos"

# Usuario y contraseña del login
USUARIO = "juan"
PASSWORD = "1234"

# Diccionario de meses en español
MESES = {
    "01": "Enero", "02": "Febrero", "03": "Marzo",
    "04": "Abril", "05": "Mayo", "06": "Junio",
    "07": "Julio", "08": "Agosto", "09": "Septiembre",
    "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
}


def requiere_login():
    return session.get("logueado") == True


def agrupar_por_mes(archivos):
    grupos = defaultdict(list)
    for archivo in archivos:
        fecha = archivo.split("_")[0]  # --> 2026-01-08
        año, mes, dia = fecha.split("-")
        mes_nombre = MESES.get(mes, mes)
        clave = f"{año} {mes_nombre}"
        grupos[clave].append(archivo)

    grupos_ordenados = dict(sorted(grupos.items(), reverse=True))
    return grupos_ordenados


# --- Formateador inteligente (estilo Notion / Apple Notes / Chat) ---
def formatear_nombre(archivo):
    base = archivo.replace(".txt", "")
    fecha_str, hora_str = base.split("_")

    año, mes, dia = map(int, fecha_str.split("-"))
    hora, minuto, segundo = map(int, hora_str.split("-"))

    dt = datetime(año, mes, dia, hora, minuto, segundo)
    hoy = date.today()
    fecha = dt.date()

    # Hoy
    if fecha == hoy:
        return dt.strftime("%H:%M")

    # Ayer
    if fecha == hoy - timedelta(days=1):
        return "Ayer • " + dt.strftime("%H:%M")

    # Misma semana
    if fecha.isocalendar()[1] == hoy.isocalendar()[1] and fecha.year == hoy.year:
        dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        return f"{dias[fecha.weekday()]} • {dt.strftime('%H:%M')}"

    # Mismo año
    if fecha.year == hoy.year:
        meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
        return f"{dia:02d} {meses[mes-1]} • {dt.strftime('%H:%M')}"

    # Otro año
    meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    return f"{dia:02d} {meses[mes-1]} {año}"


# ------------ LOGIN -------------
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


# ------------ INDEX (HOME) -------------
@app.route("/", methods=["GET", "POST"])
def index():
    if not requiere_login():
        return redirect(url_for("login"))

    if request.method == "POST":
        texto = request.form.get("texto", "")
        if texto:
            os.makedirs(CARPETA, exist_ok=True)
            fecha = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            nombre = f"{fecha}.txt"
            ruta = os.path.join(CARPETA, nombre)
            with open(ruta, "w", encoding="utf-8") as f:
                f.write(texto)

    if not os.path.exists(CARPETA):
        archivos = []
    else:
        archivos = sorted(os.listdir(CARPETA), reverse=True)

    grupos = agrupar_por_mes(archivos)
    return render_template("index.html", grupos=grupos, formatear=formatear_nombre)


# ------------ EDITAR -------------
@app.route("/editar/<archivo>", methods=["GET", "POST"])
def editar(archivo):
    if not requiere_login():
        return redirect(url_for("login"))

    ruta = os.path.join(CARPETA, archivo)
    if request.method == "POST":
        nuevo_texto = request.form.get("texto", "")
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(nuevo_texto)
        return redirect(url_for("index"))

    with open(ruta, "r", encoding="utf-8") as f:
        contenido = f.read()

    return render_template("editar.html", archivo=archivo, contenido=contenido)


# ------------ BORRAR -------------
@app.route("/borrar/<archivo>")
def borrar(archivo):
    if not requiere_login():
        return redirect(url_for("login"))

    ruta = os.path.join(CARPETA, archivo)
    if os.path.exists(ruta):
        os.remove(ruta)

    return redirect(url_for("index"))


# ------------ DESCARGAR -------------
@app.route("/descargar/<archivo>")
def descargar(archivo):
    if not requiere_login():
        return redirect(url_for("login"))

    ruta = os.path.join(CARPETA, archivo)
    return send_file(ruta, as_attachment=True)


# ------------ RUN LOCAL -------------
if __name__ == "__main__":
    app.run(debug=True)
