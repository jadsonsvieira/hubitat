import os
import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

# Load environment configuration (.env)
load_dotenv()

app = FastAPI(title="Hubitat by Frame [IA] - Backend")

# Secure CORS config: Allow only local origins for API calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5002", "http://127.0.0.1:5002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

# Bearer Token Auth Config
security = HTTPBearer()
ADMIN_TOKEN = "hubitat-jwt-secret-session-token"
ADMIN_USER = "admin"
ADMIN_PASSWORD = "frameia_hubitat_2026"

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validates the Bearer token sent in the Authorization header."""
    token = credentials.credentials
    if token != ADMIN_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Token de autenticação inválido ou expirado"
        )
    return token

# Model definitions
class LoginRequest(BaseModel):
    username: str
    password: str

class CadastroRequest(BaseModel):
    name: str
    email: str
    condo: str
    password: str

class OrdemServico(BaseModel):
    id: str
    title: str
    location: str
    category: str
    priority: str
    status: Optional[str] = "Pendente"
    date: Optional[str] = "Hoje"
    assignee: Optional[str] = ""
    description: Optional[str] = ""

class Reserva(BaseModel):
    id: str
    espaco: str
    morador: str
    unidade: str
    data: str
    turno: str
    convidados: int
    taxa: str
    status: str

class Visitante(BaseModel):
    id: str
    name: str
    doc: str
    type: str
    plate: Optional[str] = None
    unit: str
    time: str
    status: str

class Activity(BaseModel):
    icon: str
    title: str
    desc: str
    time: str

class CopilotQuery(BaseModel):
    prompt: str
    condo: str

class SocialAuthRequest(BaseModel):
    credential: Optional[str] = None
    access_token: Optional[str] = None
    email: Optional[str] = None
    nome: Optional[str] = None
    name: Optional[str] = None
    foto_url: Optional[str] = None
    picture: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    email: str
    nome: Optional[str] = None
    foto_url: Optional[str] = None
    condominio: Optional[str] = None

class Comunicado(BaseModel):
    id: str
    title: str
    category: str
    priority: str
    date: str
    readRate: str
    content: str

class Ocorrencia(BaseModel):
    id: str
    unit: str
    type: str
    desc: str
    status: str
    time: str

class Encomenda(BaseModel):
    id: str
    unit: str
    recipient: str
    courier: str
    code: str
    status: str
    receivedAt: str

class Manutencao(BaseModel):
    id: str
    system: str
    frequency: str
    nextDate: str
    status: str
    responsible: str

# Default Initial Data (Fallback)
DEFAULT_DATA = {
    "ordensServico": [
        {
            "id": "OS-2026-089",
            "title": "Substituição de Lâmpadas LED do Deck",
            "location": "Área Gourmet / Deck",
            "category": "Elétrica",
            "priority": "Média",
            "status": "Pendente",
            "date": "25/07/2026",
            "assignee": "Eusébio Elétrica Ltda",
            "description": "Três refletores da área gourmet estão piscando."
        },
        {
            "id": "OS-2026-088",
            "title": "Preventiva de Filtros da Piscina",
            "location": "Parque Aquático",
            "category": "Hidráulica",
            "priority": "Alta",
            "status": "Em Andamento",
            "date": "24/07/2026",
            "assignee": "AcquaTech Eusébio",
            "description": "Limpeza periódica de areia e retrolavagem dos filtros."
        },
        {
            "id": "OS-2026-087",
            "title": "Ajuste no Portão Eletrônico Leste",
            "location": "Portaria de Visitantes",
            "category": "Segurança / Portaria",
            "priority": "Urgente",
            "status": "Em Andamento",
            "date": "23/07/2026",
            "assignee": "PortSeg Automações",
            "description": "Sensor antiesmagamento com lentidão no acionamento."
        }
    ],
    "reservas": [
        {
            "id": "RES-102",
            "espaco": "Deck & Churrasqueira Gourmet",
            "morador": "Dr. Roberto Vasconcelos",
            "unidade": "Casa 102 - Al. Flamboyant",
            "data": "2026-07-26",
            "turno": "Noite (18h às 23h)",
            "convidados": 25,
            "taxa": "R$ 150,00",
            "status": "Confirmada"
        },
        {
            "id": "RES-101",
            "espaco": "Quadra de Beach Tennis #1",
            "morador": "Mariana Holanda",
            "unidade": "Casa 45 - Al. Palmeiras",
            "data": "2026-07-25",
            "turno": "Tarde (16h às 18h)",
            "convidados": 8,
            "taxa": "Gratuito",
            "status": "Confirmada"
        }
    ],
    "visitantes": [
        {
            "id": "VIS-901",
            "name": "Carlos Eduardo Silva",
            "doc": "012.345.678-99",
            "type": "Prestador de Serviço",
            "plate": "PNV-8920",
            "unit": "Casa 42 - Al. Ipês",
            "time": "Hoje, 09:15",
            "status": "Liberado"
        },
        {
            "id": "VIS-902",
            "name": "Fernanda Albuquerque",
            "doc": "882.109.334-00",
            "type": "Familiar / Amigo",
            "plate": "RIO-2A19",
            "unit": "Casa 102 - Al. Flamboyant",
            "time": "Aguardado 14:00",
            "status": "Pendente"
        }
    ],
    "comunicados": [
        {
            "id": "COM-101",
            "title": "Limpeza Anual das Caixas D'Água",
            "category": "Manutenção Geral",
            "priority": "Urgente",
            "date": "10/08/2026",
            "readRate": "88% Confirmado",
            "content": "Avisamos que no próximo sábado das 08h às 12h será realizada a higienização dos reservatórios de água. Pedimos aos moradores que armazenem água para consumo."
        },
        {
            "id": "COM-102",
            "title": "Assembléia Geral Ordinária de Condôminos",
            "category": "Comunicado Oficial",
            "priority": "Oficial",
            "date": "08/08/2026",
            "readRate": "94% Confirmado",
            "content": "Convocação oficial para a prestação de contas do semestre e aprovação da melhoria na iluminação de LED do complexo esportivo."
        }
    ],
    "ocorrencias": [
        {
            "id": "OCO-201",
            "unit": "Casa 18 - Al. Flamboyant",
            "type": "Som Alto / Convivência",
            "desc": "Som com volume elevado na área de lazer privativa após as 22:00h no último sábado.",
            "status": "Em Tratativa",
            "time": "Ontem, 22:45"
        },
        {
            "id": "OCO-202",
            "unit": "Casa 42 - Al. Ipês",
            "type": "Vaga de Garagem",
            "desc": "Veículo visitante estacionado ocupando parte do acesso à Alameda.",
            "status": "Resolvido",
            "time": "Há 2 dias"
        }
    ],
    "encomendas": [
        {
            "id": "ENC-301",
            "unit": "Casa 102 - Al. Flamboyant",
            "recipient": "Dr. Roberto Vasconcelos",
            "courier": "Mercado Livre / Express",
            "code": "ML-99201",
            "status": "Aguardando Retirada",
            "receivedAt": "Hoje, 10:30"
        },
        {
            "id": "ENC-302",
            "unit": "Casa 45 - Al. Palmeiras",
            "recipient": "Mariana Holanda",
            "courier": "Amazon Prime Delivery",
            "code": "AMZ-88102",
            "status": "Entregue ao Morador",
            "receivedAt": "Hoje, 08:15"
        }
    ],
    "manutencoes": [
        {
            "id": "MAN-401",
            "system": "Elevadores Sociais & Serviço",
            "frequency": "Mensal",
            "nextDate": "2026-09-02",
            "status": "Em Dia",
            "responsible": "Otis Elevadores Brasil"
        },
        {
            "id": "MAN-402",
            "system": "Estação Elevatória de Esgoto & Bombas",
            "frequency": "Trimestral",
            "nextDate": "2026-08-28",
            "status": "Agendado",
            "responsible": "Bombas & Cia Eusébio"
        },
        {
            "id": "MAN-403",
            "system": "Para-raios (SPDA) & Laudo de Vistoria",
            "frequency": "Anual",
            "nextDate": "2026-08-20",
            "status": "Atenção",
            "responsible": "Engenharia Elétrica CE"
        }
    ],
    "atividades": [
        {
            "icon": "fa-qrcode",
            "title": "Entrada registrada via QR Express",
            "desc": "Carlos Eduardo Silva autorizada na Portaria Leste.",
            "time": "Há 12 min"
        },
        {
            "icon": "fa-calendar-check",
            "title": "Nova reserva efetuada",
            "desc": "Deck Gourmet reservado por Dr. Roberto para 26/07.",
            "time": "Há 45 min"
        },
        {
            "icon": "fa-box-archive",
            "title": "Encomenda recebida na Portaria",
            "desc": "Pacote Mercado Livre registrado para Casa 102.",
            "time": "Há 1 hora"
        },
        {
            "icon": "fa-wrench",
            "title": "O.S. alterada para Em Andamento",
            "desc": "Preventiva de Filtros assumida por AcquaTech.",
            "time": "Há 2 horas"
        }
    ]
}

# DATABASE INITIALIZATION AND HELPER METHODS

USE_DB = False

def get_db_connection():
    if not USE_DB:
        return None
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        database=os.getenv("DB_NAME")
    )

def init_db():
    global USE_DB
    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASS")
    database = os.getenv("DB_NAME")
    
    if not all([host, user, password, database]):
        print("Configurações do banco de dados não encontradas no .env. Utilizando JSON local.")
        return

    try:
        conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database
        )
        if conn.is_connected():
            cursor = conn.cursor()
            
            # Create OS table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS hubitat_os (
                    id VARCHAR(50) PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    location VARCHAR(255) NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    priority VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    date VARCHAR(50) NOT NULL,
                    assignee VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL
                );
            """)
            
            # Create Reservas table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS hubitat_reservas (
                    id VARCHAR(50) PRIMARY KEY,
                    espaco VARCHAR(255) NOT NULL,
                    morador VARCHAR(255) NOT NULL,
                    unidade VARCHAR(255) NOT NULL,
                    data VARCHAR(50) NOT NULL,
                    turno VARCHAR(100) NOT NULL,
                    convidados INT NOT NULL,
                    taxa VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL
                );
            """)
            
            # Create Visitantes table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS hubitat_visitantes (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    doc VARCHAR(50) NOT NULL,
                    type VARCHAR(100) NOT NULL,
                    plate VARCHAR(50),
                    unit VARCHAR(255) NOT NULL,
                    time VARCHAR(100) NOT NULL,
                    status VARCHAR(50) NOT NULL
                );
            """)
            
            # Create Atividades table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS hubitat_atividades (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    icon VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    desc_text VARCHAR(255) NOT NULL,
                    time_text VARCHAR(50) NOT NULL
                );
            """)

            # Create Usuarios table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS hubitat_usuarios (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    senha VARCHAR(255),
                    provedor VARCHAR(50) DEFAULT 'local',
                    foto_url TEXT,
                    condominio VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'Síndico / Morador',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            try:
                cursor.execute("ALTER TABLE hubitat_usuarios ADD COLUMN foto_url TEXT;")
                conn.commit()
            except Exception:
                pass
            
            # Seed default data if empty
            cursor.execute("SELECT COUNT(*) FROM hubitat_os;")
            if cursor.fetchone()[0] == 0:
                for os_item in DEFAULT_DATA["ordensServico"]:
                    cursor.execute("""
                        INSERT INTO hubitat_os (id, title, location, category, priority, status, date, assignee, description)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """, (os_item["id"], os_item["title"], os_item["location"], os_item["category"], os_item["priority"], os_item["status"], os_item["date"], os_item["assignee"], os_item["description"]))
                
                for res_item in DEFAULT_DATA["reservas"]:
                    cursor.execute("""
                        INSERT INTO hubitat_reservas (id, espaco, morador, unidade, data, turno, convidados, taxa, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """, (res_item["id"], res_item["espaco"], res_item["morador"], res_item["unidade"], res_item["data"], res_item["turno"], res_item["convidados"], res_item["taxa"], res_item["status"]))
                    
                for vis_item in DEFAULT_DATA["visitantes"]:
                    cursor.execute("""
                        INSERT INTO hubitat_visitantes (id, name, doc, type, plate, unit, time, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                    """, (vis_item["id"], vis_item["name"], vis_item["doc"], vis_item["type"], vis_item["plate"], vis_item["unit"], vis_item["time"], vis_item["status"]))
                    
                for act_item in DEFAULT_DATA["atividades"]:
                    cursor.execute("""
                        INSERT INTO hubitat_atividades (icon, title, desc_text, time_text)
                        VALUES (%s, %s, %s, %s);
                    """, (act_item["icon"], act_item["title"], act_item["desc"], act_item["time"]))
            
            conn.commit()
            cursor.close()
            conn.close()
            USE_DB = True
            print("SUCESSO: Conectado ao banco de dados MySQL na Hostinger!")
    except Error as e:
        print(f"Alerta de Conexão: Não foi possível conectar à Hostinger ({e}). Utilizando fallback local JSON.")

@app.on_event("startup")
def startup_event():
    init_db()

# JSON File Fallback Helpers
def load_json_data() -> dict:
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_DATA, f, ensure_ascii=False, indent=4)
        return DEFAULT_DATA
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_DATA

def save_json_data(data: dict):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


@app.post("/api/login")
def login(request: LoginRequest):
    if not request.username or not request.password:
        raise HTTPException(status_code=400, detail="Usuário e senha são obrigatórios.")
        
    username_clean = request.username.lower().strip()
    
    if request.username == ADMIN_USER and request.password == ADMIN_PASSWORD:
        return {
            "sucesso": True,
            "access_token": ADMIN_TOKEN,
            "token_type": "bearer",
            "usuario": {
                "nome": "Juliana Costa",
                "email": "juliana.sindica@hubitat.com.br",
                "foto_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
                "provedor": "admin"
            }
        }
    
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM hubitat_usuarios WHERE email = %s OR nome = %s", (username_clean, username_clean))
            user = cursor.fetchone()
            cursor.close()
            conn.close()
            if user:
                return {
                    "sucesso": True,
                    "access_token": ADMIN_TOKEN,
                    "token_type": "bearer",
                    "usuario": {
                        "nome": user.get("nome") or username_clean.split('@')[0].capitalize(),
                        "email": user.get("email") or username_clean,
                        "foto_url": user.get("foto_url") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
                        "provedor": user.get("provedor") or "local"
                    }
                }
        except Exception as e:
            if conn: conn.close()
            print("Erro ao validar login no MySQL:", e)
            
    if request.username and request.password:
        return {
            "sucesso": True,
            "access_token": ADMIN_TOKEN,
            "token_type": "bearer",
            "usuario": {
                "nome": username_clean.split('@')[0].capitalize(),
                "email": username_clean if '@' in username_clean else f"{username_clean}@hubitat.com.br",
                "foto_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
                "provedor": "local"
            }
        }

    raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")

@app.post("/api/cadastro")
def cadastro(request: CadastroRequest):
    if not request.email or not request.password or not request.name:
        raise HTTPException(status_code=400, detail="Por favor preencha todos os campos obrigatórios")
    
    email_clean = request.email.lower().strip()
    name_clean = request.name.strip()
    condo_clean = (request.condo or "Alphaville Eusébio Res. 1").strip()
    foto_default = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
    
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM hubitat_usuarios WHERE email = %s", (email_clean,))
            if cursor.fetchone():
                cursor.close()
                conn.close()
                raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado no sistema.")
                
            cursor.execute("""
                INSERT INTO hubitat_usuarios (nome, email, senha, provedor, foto_url, condominio)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (name_clean, email_clean, request.password, 'local', foto_default, condo_clean))
            conn.commit()
            cursor.close()
            conn.close()
        except HTTPException:
            raise
        except Exception as err:
            if conn: conn.close()
            print("Erro ao registrar novo usuário no MySQL:", err)

    return {
        "sucesso": True,
        "access_token": ADMIN_TOKEN,
        "token_type": "bearer",
        "message": "Conta criada com sucesso!",
        "usuario": {
            "nome": name_clean,
            "email": email_clean,
            "condominio": condo_clean,
            "foto_url": foto_default,
            "provedor": "local"
        }
    }

@app.get("/login")
def login_page():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/cadastro")
def cadastro_page():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/manifest.json")
def get_manifest():
    return FileResponse(os.path.join(STATIC_DIR, "manifest.json"))

@app.get("/sw.js")
def get_sw():
    return FileResponse(os.path.join(STATIC_DIR, "sw.js"))

@app.get("/favicon.ico")
@app.get("/favicon.png")
def get_favicon():
    return FileResponse(os.path.join(STATIC_DIR, "favicon.png"))

@app.get("/icon-192.png")
def get_icon192():
    return FileResponse(os.path.join(STATIC_DIR, "icon-192.png"))

@app.get("/icon-512.png")
def get_icon512():
    return FileResponse(os.path.join(STATIC_DIR, "icon-512.png"))

@app.get("/api/config")
def get_public_config():
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", "71269651978-gp165jo1i5r6mgmb22u8s82g0jsdh5v0.apps.googleusercontent.com"),
        "microsoft_client_id": os.getenv("MICROSOFT_CLIENT_ID", "138269ce-38e6-4c1e-bc6a-b5292e877a24"),
        "facebook_app_id": os.getenv("FACEBOOK_APP_ID", "2263040147842797")
    }

@app.post("/api/auth/google")
def auth_google(req: SocialAuthRequest):
    credential = req.credential or req.access_token
    email = req.email
    nome = req.nome or req.name
    foto_url = req.foto_url or req.picture
    
    if credential and not email:
        try:
            import requests
            res = requests.get(f'https://oauth2.googleapis.com/tokeninfo?id_token={credential}', timeout=5)
            if res.status_code == 200:
                info = res.json()
                email = info.get('email')
                nome = info.get('name', email.split('@')[0] if email else 'Usuário Google')
                if not foto_url:
                    foto_url = info.get('picture')
        except Exception as e:
            print(f"[GOOGLE AUTH WARNING] Token verification error: {e}")
            
    if not email:
        raise HTTPException(status_code=400, detail="E-mail do Google não identificado.")
        
    email = email.lower().strip()
    nome_final = nome if nome else email.split('@')[0].capitalize()
    foto_final = foto_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"

    if USE_DB:
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM hubitat_usuarios WHERE email = %s", (email,))
            usuario = cursor.fetchone()
            if not usuario:
                cursor.execute("""
                    INSERT INTO hubitat_usuarios (nome, email, provedor, foto_url)
                    VALUES (%s, %s, %s, %s)
                """, (nome_final, email, 'google', foto_final))
                conn.commit()
            elif foto_url and usuario.get('foto_url') != foto_url:
                cursor.execute("""
                    UPDATE hubitat_usuarios SET foto_url = %s, nome = %s WHERE email = %s
                """, (foto_final, nome_final, email))
                conn.commit()
            cursor.close()
            conn.close()
        except Exception as err:
            print("Erro ao salvar usuário no MySQL:", err)

    return {
        "sucesso": True,
        "access_token": ADMIN_TOKEN,
        "token_type": "bearer",
        "email": email,
        "nome": nome_final,
        "foto_url": foto_final,
        "usuario": {
            "email": email,
            "nome": nome_final,
            "foto_url": foto_final,
            "provedor": "google"
        },
        "message": "Autenticado com sucesso via Google!"
    }

@app.post("/api/auth/facebook")
def auth_facebook(req: SocialAuthRequest):
    token = req.access_token or req.credential
    email = req.email
    nome = req.nome or req.name
    foto_url = req.foto_url or req.picture
    
    if token and not email:
        try:
            import requests
            res = requests.get(f'https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token={token}', timeout=5)
            if res.status_code == 200:
                info = res.json()
                fb_id = info.get('id')
                email = info.get('email') or f"fb_{fb_id}@facebook.user"
                nome = info.get('name', 'Usuário Facebook')
                if not foto_url and 'picture' in info and 'data' in info['picture'] and 'url' in info['picture']['data']:
                    foto_url = info['picture']['data']['url']
        except Exception as e:
            print(f"[FACEBOOK AUTH WARNING] Token verification error: {e}")

    if not email:
        raise HTTPException(status_code=400, detail="E-mail do Facebook não identificado.")

    email = email.lower().strip()
    nome_final = nome if nome else email.split('@')[0].capitalize()
    foto_final = foto_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"

    if USE_DB:
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM hubitat_usuarios WHERE email = %s", (email,))
            usuario = cursor.fetchone()
            if not usuario:
                cursor.execute("""
                    INSERT INTO hubitat_usuarios (nome, email, provedor, foto_url)
                    VALUES (%s, %s, %s, %s)
                """, (nome_final, email, 'facebook', foto_final))
                conn.commit()
            elif foto_url and usuario.get('foto_url') != foto_url:
                cursor.execute("""
                    UPDATE hubitat_usuarios SET foto_url = %s, nome = %s WHERE email = %s
                """, (foto_final, nome_final, email))
                conn.commit()
            cursor.close()
            conn.close()
        except Exception as err:
            print("Erro ao salvar usuário no MySQL:", err)

    return {
        "sucesso": True,
        "access_token": ADMIN_TOKEN,
        "token_type": "bearer",
        "email": email,
        "nome": nome_final,
        "foto_url": foto_final,
        "usuario": {
            "email": email,
            "nome": nome_final,
            "foto_url": foto_final,
            "provedor": "facebook"
        },
        "message": "Autenticado com sucesso via Facebook!"
    }

@app.post("/api/auth/microsoft")
def auth_microsoft(req: SocialAuthRequest):
    token = req.access_token or req.credential
    email = req.email
    nome = req.nome or req.name
    foto_url = req.foto_url or req.picture
    
    if token and not email:
        try:
            import requests
            headers = {'Authorization': f'Bearer {token}'}
            res = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers, timeout=5)
            if res.status_code == 200:
                info = res.json()
                email = info.get('mail') or info.get('userPrincipalName')
                nome = info.get('displayName') or (email.split('@')[0] if email else 'Usuário Microsoft')
        except Exception as e:
            print(f"[MICROSOFT AUTH WARNING] Graph API error: {e}")

    if not email:
        raise HTTPException(status_code=400, detail="E-mail da Microsoft não identificado.")

    email = email.lower().strip()
    nome_final = nome if nome else email.split('@')[0].capitalize()
    foto_final = foto_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"

    if USE_DB:
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM hubitat_usuarios WHERE email = %s", (email,))
            usuario = cursor.fetchone()
            if not usuario:
                cursor.execute("""
                    INSERT INTO hubitat_usuarios (nome, email, provedor, foto_url)
                    VALUES (%s, %s, %s, %s)
                """, (nome_final, email, 'microsoft', foto_final))
                conn.commit()
            elif foto_url and usuario.get('foto_url') != foto_url:
                cursor.execute("""
                    UPDATE hubitat_usuarios SET foto_url = %s, nome = %s WHERE email = %s
                """, (foto_final, nome_final, email))
                conn.commit()
            cursor.close()
            conn.close()
        except Exception as err:
            print("Erro ao salvar usuário no MySQL:", err)

    return {
        "sucesso": True,
        "access_token": ADMIN_TOKEN,
        "token_type": "bearer",
        "email": email,
        "nome": nome_final,
        "foto_url": foto_final,
        "usuario": {
            "email": email,
            "nome": nome_final,
            "foto_url": foto_final,
            "provedor": "microsoft"
        },
        "message": "Autenticado com sucesso via Microsoft!"
    }

@app.post("/api/usuario/perfil")
def update_user_profile(req: UpdateProfileRequest):
    if not req.email:
        raise HTTPException(status_code=400, detail="E-mail é obrigatório.")
    
    email = req.email.lower().strip()
    nome = req.nome
    foto_url = req.foto_url
    condo = req.condominio
    
    if USE_DB:
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM hubitat_usuarios WHERE email = %s", (email,))
            usuario = cursor.fetchone()
            if usuario:
                cursor.execute("""
                    UPDATE hubitat_usuarios 
                    SET nome = COALESCE(%s, nome), 
                        foto_url = COALESCE(%s, foto_url), 
                        condominio = COALESCE(%s, condominio)
                    WHERE email = %s
                """, (nome, foto_url, condo, email))
                conn.commit()
            else:
                cursor.execute("""
                    INSERT INTO hubitat_usuarios (nome, email, foto_url, condominio, provedor)
                    VALUES (%s, %s, %s, %s, %s)
                """, (nome or email.split('@')[0], email, foto_url, condo, 'custom'))
                conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print("Erro ao atualizar perfil do usuário no MySQL:", e)
            
    return {
        "sucesso": True,
        "message": "Perfil atualizado com sucesso!",
        "usuario": {
            "email": email,
            "nome": nome,
            "foto_url": foto_url,
            "condominio": condo
        }
    }

# PROTECTED API ENDPOINTS

@app.get("/api/os", response_model=List[OrdemServico])
def get_os(token: str = Depends(verify_token)):
    if not USE_DB:
        return load_json_data().get("ordensServico", [])
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM hubitat_os;")
        res = cursor.fetchall()
        cursor.close()
        conn.close()
        return res
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.post("/api/os", response_model=OrdemServico)
def create_os(os_item: OrdemServico, token: str = Depends(verify_token)):
    if not USE_DB:
        data = load_json_data()
        data["ordensServico"].insert(0, os_item.dict())
        data["atividades"].insert(0, {
            "icon": "fa-wrench",
            "title": "Nova O.S. Cadastrada",
            "desc": f"{os_item.title} ({os_item.location})",
            "time": "Agora"
        })
        save_json_data(data)
        return os_item

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Save OS
        cursor.execute("""
            INSERT INTO hubitat_os (id, title, location, category, priority, status, date, assignee, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (os_item.id, os_item.title, os_item.location, os_item.category, os_item.priority, os_item.status, os_item.date, os_item.assignee, os_item.description))
        
        # Add Activity
        cursor.execute("""
            INSERT INTO hubitat_atividades (icon, title, desc_text, time_text)
            VALUES (%s, %s, %s, %s);
        """, ("fa-wrench", "Nova O.S. Cadastrada", f"{os_item.title} ({os_item.location})", "Agora"))
        
        conn.commit()
        cursor.close()
        conn.close()
        return os_item
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.put("/api/os/{os_id}/status", response_model=OrdemServico)
def toggle_os_status(os_id: str, token: str = Depends(verify_token)):
    if not USE_DB:
        data = load_json_data()
        for os_item in data["ordensServico"]:
            if os_item["id"] == os_id:
                current = os_item["status"]
                os_item["status"] = "Em Andamento" if current == "Pendente" else ("Concluída" if current == "Em Andamento" else "Pendente")
                save_json_data(data)
                return os_item
        raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM hubitat_os WHERE id = %s;", (os_id,))
        os_item = cursor.fetchone()
        
        if not os_item:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada")
            
        current = os_item["status"]
        new_status = "Em Andamento" if current == "Pendente" else ("Concluída" if current == "Em Andamento" else "Pendente")
        
        cursor.execute("UPDATE hubitat_os SET status = %s WHERE id = %s;", (new_status, os_id))
        conn.commit()
        cursor.close()
        conn.close()
        os_item["status"] = new_status
        return os_item
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.get("/api/reservas", response_model=List[Reserva])
def get_reservas(token: str = Depends(verify_token)):
    if not USE_DB:
        return load_json_data().get("reservas", [])
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM hubitat_reservas;")
        res = cursor.fetchall()
        cursor.close()
        conn.close()
        return res
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.post("/api/reservas", response_model=Reserva)
def create_reserva(reserva: Reserva, token: str = Depends(verify_token)):
    if not USE_DB:
        data = load_json_data()
        data["reservas"].insert(0, reserva.dict())
        data["atividades"].insert(0, {
            "icon": "fa-calendar-check",
            "title": "Nova reserva efetuada",
            "desc": f"{reserva.espaco} por {reserva.morador}",
            "time": "Agora"
        })
        save_json_data(data)
        return reserva

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO hubitat_reservas (id, espaco, morador, unidade, data, turno, convidados, taxa, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (reserva.id, reserva.espaco, reserva.morador, reserva.unidade, reserva.data, reserva.turno, reserva.convidados, reserva.taxa, reserva.status))
        
        cursor.execute("""
            INSERT INTO hubitat_atividades (icon, title, desc_text, time_text)
            VALUES (%s, %s, %s, %s);
        """, ("fa-calendar-check", "Nova reserva efetuada", f"{reserva.espaco} por {reserva.morador}", "Agora"))
        
        conn.commit()
        cursor.close()
        conn.close()
        return reserva
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.delete("/api/reservas/{res_id}")
def delete_reserva(res_id: str, token: str = Depends(verify_token)):
    if not USE_DB:
        data = load_json_data()
        initial_len = len(data["reservas"])
        data["reservas"] = [r for r in data["reservas"] if r["id"] != res_id]
        if len(data["reservas"]) == initial_len:
            raise HTTPException(status_code=404, detail="Reserva não encontrada")
        data["atividades"].insert(0, {
            "icon": "fa-trash",
            "title": "Reserva cancelada",
            "desc": f"Identificador de reserva: {res_id}",
            "time": "Agora"
        })
        save_json_data(data)
        return {"status": "success", "message": "Reserva cancelada"}

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM hubitat_reservas WHERE id = %s;", (res_id,))
        
        cursor.execute("""
            INSERT INTO hubitat_atividades (icon, title, desc_text, time_text)
            VALUES (%s, %s, %s, %s);
        """, ("fa-trash", "Reserva cancelada", f"Identificador de reserva: {res_id}", "Agora"))
        
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "message": "Reserva cancelada"}
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.get("/api/visitantes", response_model=List[Visitante])
def get_visitantes(token: str = Depends(verify_token)):
    if not USE_DB:
        return load_json_data().get("visitantes", [])
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM hubitat_visitantes;")
        res = cursor.fetchall()
        cursor.close()
        conn.close()
        return res
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.post("/api/visitantes", response_model=Visitante)
def create_visitante(vis: Visitante, token: str = Depends(verify_token)):
    if not USE_DB:
        data = load_json_data()
        data["visitantes"].insert(0, vis.dict())
        data["atividades"].insert(0, {
            "icon": "fa-qrcode",
            "title": "Convite Express Gerado",
            "desc": f"{vis.name} para a unidade {vis.unit}",
            "time": "Agora"
        })
        save_json_data(data)
        return vis

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO hubitat_visitantes (id, name, doc, type, plate, unit, time, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, (vis.id, vis.name, vis.doc, vis.type, vis.plate, vis.unit, vis.time, vis.status))
        
        cursor.execute("""
            INSERT INTO hubitat_atividades (icon, title, desc_text, time_text)
            VALUES (%s, %s, %s, %s);
        """, ("fa-qrcode", "Convite Express Gerado", f"{vis.name} para a unidade {vis.unit}", "Agora"))
        
        conn.commit()
        cursor.close()
        conn.close()
        return vis
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.get("/api/atividades", response_model=List[Activity])
def get_activities(token: str = Depends(verify_token)):
    if not USE_DB:
        return load_json_data().get("atividades", [])
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT icon, title, desc_text as `desc`, time_text as `time` FROM hubitat_atividades ORDER BY id DESC LIMIT 50;")
        res = cursor.fetchall()
        cursor.close()
        conn.close()
        return res
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erro de Banco de Dados: {e}")

@app.post("/api/copilot")
def query_copilot(query: CopilotQuery, token: str = Depends(verify_token)):
    prompt_lower = query.prompt.lower()
    condo_name = query.condo
    if condo_name == "eusebio-alphaville":
        condo_friendly = "Alphaville Eusébio Res. 1"
    elif condo_name == "eusebio-jardins":
        condo_friendly = "Jardins do Eusébio Casas"
    elif condo_name == "fortaleza-meireles":
        condo_friendly = "Meireles Tower Residence"
    else:
        condo_friendly = "Residencial Mansão Guararapes"

    if "comunicado" in prompt_lower or "obras" in prompt_lower or "piscina" in prompt_lower:
        response = (
            f"<strong>📢 Minuta de Comunicado Gerado pela Frame IA:</strong><br><br>"
            f"<em>Prezados Condôminos do {condo_friendly},</em><br><br>"
            f"Informamos que a partir de <strong>segunda-feira (28/07)</strong> serão iniciados os trabalhos de manutenção preventiva no sistema de irrigação automatizada e iluminação LED das áreas comuns.<br>"
            f"- <strong>Período:</strong> 08h às 17h.<br>"
            f"- <strong>Impacto:</strong> Interdição parcial temporária do piso tátil da Alameda Principal.<br><br>"
            f"Contamos com a colaboração de todos.<br>"
            f"<em>Atenciosamente, Administração / Frame IA Hubitat</em>"
        )
    elif "regras" in prompt_lower or "barulho" in prompt_lower or "horário" in prompt_lower:
        response = (
            f"<strong>📜 Regulamento Interno & Legislação (Eusébio & Fortaleza):</strong><br><br>"
            f"1. <strong>Horário de Silêncio:</strong> Das 22:00 às 07:00 (Dias úteis) e das 22:00 às 08:00 (Fins de semana e feriados) no {condo_friendly}.<br>"
            f"2. <strong>Obras em Unidades Privativas:</strong> Permite-se apenas de Segunda a Sexta, das 08h às 17h.<br>"
            f"3. <strong>Áreas de Lazer:</strong> Uso de caixas de som permitidos até 85dB até as 22h, conforme Lei Municipal de Ruídos Urbanos."
        )
    elif "resumo" in prompt_lower or "o.s." in prompt_lower or "ordens" in prompt_lower:
        os_list = get_os(token)
        active_os = [o for o in os_list if o.status != "Concluída"]
        response = (
            f"<strong>📊 Diagnóstico Operacional de Manutenção no {condo_friendly}:</strong><br><br>"
            f"No momento temos <strong>{len(active_os)} ordens de serviço ativas</strong> no sistema:<br>"
        )
        for o in active_os[:3]:
            response += f"- <strong>{o.priority} ({o.status}):</strong> {o.title} em {o.location}.<br>"
        response += f"<br><em>Sugestão Frame IA: Agendar revisão dos geradores antes do próximo ciclo de chuvas no Eusébio/Fortaleza.</em>"
    else:
        response = (
            f"Entendi sua solicitação referente a <strong>\"{query.prompt}\"</strong> no condomínio <strong>{condo_friendly}</strong>.<br><br>"
            f"Como assistente especialista do <strong>Hubitat by Frame [IA]</strong>, posso automatizar o registro de ocorrências, gerar notificações no app dos moradores ou consultar nossa base de conhecimentos de gestão imobiliária da região de Fortaleza e Eusébio."
        )
    return {"response": response}

@app.get("/api/comunicados", response_model=List[Comunicado])
def get_comunicados(token: str = Depends(verify_token)):
    return load_json_data().get("comunicados", [])

@app.post("/api/comunicados", response_model=Comunicado)
def create_comunicado(com: Comunicado, token: str = Depends(verify_token)):
    data = load_json_data()
    data.setdefault("comunicados", []).insert(0, com.dict())
    data.setdefault("atividades", []).insert(0, {
        "icon": "fa-bullhorn",
        "title": "Novo Comunicado Publicado",
        "desc": com.title,
        "time": "Agora"
    })
    save_json_data(data)
    return com

@app.get("/api/ocorrencias", response_model=List[Ocorrencia])
def get_ocorrencias(token: str = Depends(verify_token)):
    return load_json_data().get("ocorrencias", [])

@app.post("/api/ocorrencias", response_model=Ocorrencia)
def create_ocorrencia(oco: Ocorrencia, token: str = Depends(verify_token)):
    data = load_json_data()
    data.setdefault("ocorrencias", []).insert(0, oco.dict())
    data.setdefault("atividades", []).insert(0, {
        "icon": "fa-triangle-exclamation",
        "title": "Ocorrência Registrada",
        "desc": f"{oco.type} ({oco.unit})",
        "time": "Agora"
    })
    save_json_data(data)
    return oco

@app.get("/api/encomendas", response_model=List[Encomenda])
def get_encomendas(token: str = Depends(verify_token)):
    return load_json_data().get("encomendas", [])

@app.post("/api/encomendas", response_model=Encomenda)
def create_encomenda(enc: Encomenda, token: str = Depends(verify_token)):
    data = load_json_data()
    data.setdefault("encomendas", []).insert(0, enc.dict())
    data.setdefault("atividades", []).insert(0, {
        "icon": "fa-box-archive",
        "title": "Encomenda Registrada na Portaria",
        "desc": f"Pacote {enc.courier} para {enc.recipient} ({enc.unit})",
        "time": "Agora"
    })
    save_json_data(data)
    return enc

@app.put("/api/encomendas/{enc_id}/status")
def update_encomenda_status(enc_id: str, token: str = Depends(verify_token)):
    data = load_json_data()
    for item in data.get("encomendas", []):
        if item["id"] == enc_id:
            item["status"] = "Entregue ao Morador"
            save_json_data(data)
            return item
    raise HTTPException(status_code=404, detail="Encomenda não encontrada")

@app.get("/api/manutencoes", response_model=List[Manutencao])
def get_manutencoes(token: str = Depends(verify_token)):
    return load_json_data().get("manutencoes", [])


# Mount static files folder
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)

app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    # Initialize the database on startup
    init_db()
    
    # Read custom port from .env or default to 5002
    port = int(os.getenv("PORT", 5002))
    print(f"Iniciando o servidor seguro do Hubitat by Frame [IA] na porta {port}...")
    print(f"Acesse: http://localhost:{port}")
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
