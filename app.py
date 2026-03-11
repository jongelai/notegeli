import os
from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta


app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "notegeli_pro_2026")

# --- CONFIGURACIÓN DE BASE DE DATOS ---
uri = os.getenv('DATABASE_URL')

if uri:
    # Si por casualidad copiaste postgres:// lo arreglamos a postgresql://
    if uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql://", 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = uri
else:
    # Fallback local por si el .env falla
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'notegeli.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Ajuste vital para conexiones de larga distancia (Cloud)
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

db = SQLAlchemy(app)
# --- EL RESTO DE TU CÓDIGO SIGUE IGUAL ABAJO ---
# ------------------------------------------------------------------

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

# Crear tablas automáticamente si no existen
with app.app_context():
    db.create_all()

meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

# --- RUTAS DE LA APLICACIÓN ---

@app.route("/", methods=["GET", "POST"])
def index():
    if "user_id" not in session:
        return redirect(url_for("login"))

    hoy = datetime.now()
    fecha_larga = f"{hoy.day} {meses[hoy.month - 1]} {hoy.year}"
    
    if request.method == "POST":
        texto = request.form.get("texto")
        fecha = request.form.get("fecha")
        if texto:
            nueva = Nota(contenido=texto, fecha_recordatorio=fecha, usuario_id=session["user_id"])
            db.session.add(nueva)
            db.session.commit()
        return redirect(url_for("index"))

    # Consultar notas del usuario actual
    notas_db = Nota.query.filter_by(usuario_id=session["user_id"]).order_by(Nota.fecha_creacion.desc()).all()
    manana_str = (hoy + timedelta(days=1)).strftime('%Y-%m-%d')
    avisos_manana = [n for n in notas_db if n.fecha_recordatorio == manana_str]

    return render_template("index.html", notas=notas_db, manana=avisos_manana, fecha_larga=fecha_larga)

@app.route("/editar_guardar", methods=["POST"])
def editar_guardar():
    if "user_id" not in session: return redirect(url_for("login"))
    nota = Nota.query.get(request.form.get("id"))
    if nota and nota.usuario_id == session["user_id"]:
        nota.contenido = request.form.get("texto")
        nota.color = request.form.get("color")
        nota.fecha_recordatorio = request.form.get("nueva_fecha")
        db.session.commit()
    return redirect(url_for("index"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = Usuario.query.filter_by(username=request.form.get("usuario")).first()
        if user and check_password_hash(user.password, request.form.get("password")):
            session["user_id"] = user.id
            return redirect(url_for("index"))
        flash("Usuario o contraseña incorrectos", "danger")
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
                session["user_id"] = nuevo.id
                return redirect(url_for("index"))
            except: 
                flash("El usuario ya existe", "danger")
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

# --- RUTAS PWA ---
@app.route('/manifest.json')
def manifest(): 
    return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker(): 
    return send_from_directory('static', 'service-worker.js')
app.debug =True
if __name__ == "__main__":
    app.run()