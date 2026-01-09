from flask import Flask, request, render_template, send_file
from datetime import datetime
from collections import defaultdict
import os

app = Flask(__name__)

CARPETA = "archivos"

# Diccionario de meses en español
MESES = {
    "01": "Enero", "02": "Febrero", "03": "Marzo",
    "04": "Abril", "05": "Mayo", "06": "Junio",
    "07": "Julio", "08": "Agosto", "09": "Septiembre",
    "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
}

def agrupar_por_mes(archivos):
    grupos = defaultdict(list)
    for archivo in archivos:
        # ejemplo nombre: 2026-01-08_18-38-46.txt
        fecha = archivo.split("_")[0]   # → 2026-01-08
        año, mes, dia = fecha.split("-")
        mes_nombre = MESES.get(mes, mes)
        clave = f"{año} {mes_nombre}"
        grupos[clave].append(archivo)

    # Para que se ordene del más nuevo al más viejo visualmente
    grupos_ordenados = dict(sorted(grupos.items(), reverse=True))
    return grupos_ordenados


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        texto = request.form.get("texto", "")
        if texto:
            os.makedirs(CARPETA, exist_ok=True)
            fecha = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            nombre = f"{fecha}.txt"
            ruta = os.path.join(CARPETA, nombre)
            with open(ruta, "w", encoding="utf-8") as f:
                f.write(texto)

    archivos = sorted(os.listdir(CARPETA)) if os.path.exists(CARPETA) else []
    grupos = agrupar_por_mes(archivos)
    return render_template("index.html", grupos=grupos)


@app.route("/leer/<archivo>")
def leer(archivo):
    ruta = os.path.join(CARPETA, archivo)
    if not os.path.exists(ruta):
        return "Archivo no encontrado"
    with open(ruta, "r", encoding="utf-8") as f:
        contenido = f.read()
    return f"<pre>{contenido}</pre>"


@app.route("/descargar/<archivo>")
def descargar(archivo):
    ruta = os.path.join(CARPETA, archivo)
    if not os.path.exists(ruta):
        return "Archivo no encontrado"
    return send_file(ruta, as_attachment=True)


@app.route("/editar/<archivo>", methods=["GET", "POST"])
def editar(archivo):
    ruta = os.path.join(CARPETA, archivo)

    if request.method == "POST":
        nuevo_texto = request.form.get("texto", "")
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(nuevo_texto)
        return "<script>window.location='/'</script>"

    with open(ruta, "r", encoding="utf-8") as f:
        contenido = f.read()

    return render_template("editar.html", archivo=archivo, contenido=contenido)


@app.route("/borrar/<archivo>")
def borrar(archivo):
    ruta = os.path.join(CARPETA, archivo)
    if os.path.exists(ruta):
        os.remove(ruta)
    return "<script>window.location='/'</script>"


if __name__ == "__main__":
    app.run()
