import os
import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn

app = FastAPI(title="Hubitat by Frame IA - Backend")

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

class OrdemServico(BaseModel):
    id: str
    title: str
    location: str
    category: str
    priority: str
    status: str
    date: str
    assignee: str
    description: str

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

# Default Initial Data (LGPD-compliant mocks or clean defaults)
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
            "icon": "fa-wrench",
            "title": "O.S. alterada para Em Andamento",
            "desc": "Preventiva de Filtros assumida por AcquaTech.",
            "time": "Há 2 horas"
        }
    ]
}

def load_data() -> dict:
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_DATA, f, ensure_ascii=False, indent=4)
        return DEFAULT_DATA
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_DATA

def save_data(data: dict):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


# AUTHENTICATION ROUTE (Public)

@app.post("/api/login")
def login(request: LoginRequest):
    if request.username == ADMIN_USER and request.password == ADMIN_PASSWORD:
        return {"access_token": ADMIN_TOKEN, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")


# PROTECTED API ENDPOINTS (Require verify_token)

@app.get("/api/os", response_model=List[OrdemServico])
def get_os(token: str = Depends(verify_token)):
    data = load_data()
    return data.get("ordensServico", [])

@app.post("/api/os", response_model=OrdemServico)
def create_os(os_item: OrdemServico, token: str = Depends(verify_token)):
    data = load_data()
    data["ordensServico"].insert(0, os_item.dict())
    
    # Adicionar atividade
    activity = {
        "icon": "fa-wrench",
        "title": "Nova O.S. Cadastrada",
        "desc": f"{os_item.title} ({os_item.location})",
        "time": "Agora"
    }
    data["atividades"].insert(0, activity)
    save_data(data)
    return os_item

@app.put("/api/os/{os_id}/status", response_model=OrdemServico)
def toggle_os_status(os_id: str, token: str = Depends(verify_token)):
    data = load_data()
    for os_item in data["ordensServico"]:
        if os_item["id"] == os_id:
            current = os_item["status"]
            if current == "Pendente":
                os_item["status"] = "Em Andamento"
            elif current == "Em Andamento":
                os_item["status"] = "Concluída"
            else:
                os_item["status"] = "Pendente"
                
            save_data(data)
            return os_item
    raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada")

@app.get("/api/reservas", response_model=List[Reserva])
def get_reservas(token: str = Depends(verify_token)):
    data = load_data()
    return data.get("reservas", [])

@app.post("/api/reservas", response_model=Reserva)
def create_reserva(reserva: Reserva, token: str = Depends(verify_token)):
    data = load_data()
    data["reservas"].insert(0, reserva.dict())
    activity = {
        "icon": "fa-calendar-check",
        "title": "Nova reserva efetuada",
        "desc": f"{reserva.espaco} por {reserva.morador}",
        "time": "Agora"
    }
    data["atividades"].insert(0, activity)
    save_data(data)
    return reserva

@app.delete("/api/reservas/{res_id}")
def delete_reserva(res_id: str, token: str = Depends(verify_token)):
    data = load_data()
    initial_len = len(data["reservas"])
    data["reservas"] = [r for r in data["reservas"] if r["id"] != res_id]
    if len(data["reservas"]) == initial_len:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
    
    activity = {
        "icon": "fa-trash",
        "title": "Reserva cancelada",
        "desc": f"Identificador de reserva: {res_id}",
        "time": "Agora"
    }
    data["atividades"].insert(0, activity)
    save_data(data)
    return {"status": "success", "message": "Reserva cancelada"}

@app.get("/api/visitantes", response_model=List[Visitante])
def get_visitantes(token: str = Depends(verify_token)):
    data = load_data()
    return data.get("visitantes", [])

@app.post("/api/visitantes", response_model=Visitante)
def create_visitante(vis: Visitante, token: str = Depends(verify_token)):
    data = load_data()
    data["visitantes"].insert(0, vis.dict())
    activity = {
        "icon": "fa-qrcode",
        "title": "Convite Express Gerado",
        "desc": f"{vis.name} para a unidade {vis.unit}",
        "time": "Agora"
    }
    data["atividades"].insert(0, activity)
    save_data(data)
    return vis

@app.get("/api/atividades", response_model=List[Activity])
def get_activities(token: str = Depends(verify_token)):
    data = load_data()
    return data.get("atividades", [])

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
        data = load_data()
        os_list = data.get("ordensServico", [])
        active_os = [o for o in os_list if o["status"] != "Concluída"]
        response = (
            f"<strong>📊 Diagnóstico Operacional de Manutenção no {condo_friendly}:</strong><br><br>"
            f"No momento temos <strong>{len(active_os)} ordens de serviço ativas</strong> no sistema:<br>"
        )
        for o in active_os[:3]:
            response += f"- <strong>{o['priority']} ({o['status']}):</strong> {o['title']} em {o['location']}.<br>"
        response += f"<br><em>Sugestão Frame IA: Agendar revisão dos geradores antes do próximo ciclo de chuvas no Eusébio/Fortaleza.</em>"
    else:
        response = (
            f"Entendi sua solicitação referente a <strong>\"{query.prompt}\"</strong> no condomínio <strong>{condo_friendly}</strong>.<br><br>"
            f"Como assistente especialista do <strong>Hubitat by Frame IA</strong>, posso automatizar o registro de ocorrências, gerar notificações no app dos moradores ou consultar nossa base de conhecimentos de gestão imobiliária da região de Fortaleza e Eusébio."
        )
    return {"response": response}


# Mount ONLY the static directory, protecting main.py and data.json
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)

app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    print("Iniciando o servidor seguro do Hubitat by Frame IA na porta 5002...")
    print("Acesse: http://localhost:5002")
    uvicorn.run("main:app", host="127.0.0.1", port=5002, reload=True)
