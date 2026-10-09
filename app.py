import os
from flask import Flask, render_template, send_from_directory

app = Flask(__name__)

# La página principal ahora solo muestra el diseño
@app.route("/")
def index():
    return render_template("index.html")

# Esto se queda para que la app siga siendo instalable en tu móvil (PWA)
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js')

if __name__ == "__main__":
    app.run(debug=True)

