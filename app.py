from flask import Flask, request, render_template, send_file, redirect, url_for, session
from datetime import datetime
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

    # Ordenar de más nuevo a más viejo
    grupos_ordenados = dict(sorted(grupos.items(), reverse=True))
    return grupos_ordenados


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
    return render_template("index.html", grupos=grupos)


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
