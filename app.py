import os
from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory,flash #
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "notegeli_pro_2026"

# Configuración de Base de Datos SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///notegeli.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- MODELOS ---
class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    notas = db.relationship('Nota', backref='autor', lazy=True, cascade="all, delete-orphan")

class Nota(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    contenido = db.Column(db.Text, nullable=False)
    fecha_recordatorio = db.Column(db.String(10)) 
    color = db.Column(db.String(20))
    fecha_creacion = db.Column(db.DateTime, default=datetime.now)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)

# Crear base de datos
with app.app_context():
    db.create_all()

meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

@app.route("/quien-hay")
def lista_usuarios():
    # Solo deja entrar si tú estás logueado (opcional)
    users = Usuario.query.all()
    lista = "<br>".join([f"ID: {u.id} | Nombre: {u.username}" for u in users])
    return f"<h1>Usuarios registrados:</h1>{lista}"
@app.route("/", methods=["GET", "POST"])
def index():
    if "user_id" not in session:
        return redirect(url_for("login"))

    hoy = datetime.now()
    fecha_larga = f"{hoy.day} {meses[hoy.month - 1]} {hoy.year}"
    
    if request.method == "POST":
        texto = request.form.get("texto")
        fecha = request.form.get("fecha")
        color = request.form.get("color")
        if texto:
            nueva = Nota(contenido=texto, fecha_recordatorio=fecha, color=color, usuario_id=session["user_id"])
            db.session.add(nueva)
            db.session.commit()
        return redirect(url_for("index"))

    notas_db = Nota.query.filter_by(usuario_id=session["user_id"]).order_by(Nota.fecha_creacion.desc()).all()
    manana_str = (hoy + timedelta(days=1)).strftime('%Y-%m-%d')
    avisos_manana = [n for n in notas_db if n.fecha_recordatorio == manana_str]

    return render_template("index.html", notas=notas_db, manana=avisos_manana, fecha_larga=fecha_larga)

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        u = request.form.get("usuario")
        p = request.form.get("password")
        user = Usuario.query.filter_by(username=u).first()
        
        if user and check_password_hash(user.password, p):
            session["user_id"] = user.id
            return redirect(url_for("index"))
        else:
            flash("Usuario o contraseña incorrectos", "danger") # <--- Mensaje de error
            
    return render_template("login.html")

@app.route("/registro", methods=["GET", "POST"])
def registro():
    if request.method == "POST":
        u, p = request.form.get("usuario"), request.form.get("password")
        if u and p:
            nuevo = Usuario(username=u, password=generate_password_hash(p))
            try:
                db.session.add(nuevo)
                db.session.commit()
                return redirect(url_for("login"))
            except: return "El usuario ya existe."
    return render_template("registro.html")

@app.route("/borrar/<int:id>")
def borrar(id):
    if "user_id" not in session: return redirect(url_for("login"))
    nota = Nota.query.get(id)
    if nota and nota.usuario_id == session["user_id"]:
        db.session.delete(nota)
        db.session.commit()
    return redirect(url_for("index"))

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route('/manifest.json')
def manifest(): return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker(): return send_from_directory('static', 'service-worker.js')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)