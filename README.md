# Hubitat by Frame [IA] 🏢

> **Plataforma SaaS de Gestão Condominial Inteligente, Controle de Acesso & Portaria Digital**  
> Desenvolvida sob o ecossistema **Frame [IA]** / **MJSV Holding**.

---

## 📌 Visão Geral

O **Hubitat** (ou **Hubitat by Frame [IA]**) é uma plataforma moderna concebida para simplificar a administração de condomínios residenciais e comerciais. A ferramenta conecta síndicos, porteiros e moradores em um ambiente digital unificado, seguro e intuitivo, trazendo automação para autorizações de entrada e governança predial.

---

## ✨ Principais Funcionalidades

- **Módulos Multi-Perfil**:
  - **Modo Síndico**: Painel executivo para controle financeiro de unidades, comunicados, regras e governança do condomínio.
  - **Modo Portaria**: Registro ágil de entradas/saídas, leitura de passes QR Code e controle de encomendas.
  - **Modo Morador**: Emissão de convites digitais, reserva de áreas comuns e consulta de comunicados.
- **Passe de Acesso via QR Code**: Geração dinâmica de passes temporários para visitantes e prestadores de serviço.
- **Gestão de Planos & Assinaturas**: Suporte a planos mensais e anuais (com precificação inteligente e descontos).
- **Compliance LGPD**: Termos de uso e políticas de privacidade integradas para proteção integral dos dados dos condôminos.
- **Interface Otimizada**: Design de alto contraste com suporte a temas e usabilidade fluida em telas mobile.

---

## 🛠️ Stack Tecnológica

- **Backend**: Python 3.10+
- **Frontend**: Jinja2, HTML5 Semântico, CSS3 Moderno, JavaScript
- **Configuração & Segurança**: Gerenciamento de variáveis via `.env` (sanitização de secrets)
- **Infraestrutura**: Linux VPS, Nginx, Gunicorn / Uvicorn

---

## 🚀 Instalação & Execução Local

### Pré-requisitos
- Python 3.10+
- Git

### Passo a Passo

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/jadsonsvieira/hubitat.git
   cd hubitat
   ```

2. **Criar e Ativar Ambiente Virtual:**
   ```bash
   python -m venv venv
   # Linux/macOS
   source venv/bin/activate
   # Windows
   venv\Scripts\activate
   ```

3. **Configurar Variáveis de Ambiente:**
   Copie o arquivo de exemplo e configure suas credenciais:
   ```bash
   cp .env.example .env
   ```

4. **Instalar Dependências & Executar:**
   ```bash
   pip install -r requirements.txt
   python main.py
   ```
   Acesse a aplicação em: `http://localhost:5000`

---

## 📂 Estrutura do Projeto

```text
hubitat/
├── main.py                  # Aplicação central e regras de negócio
├── .env.example             # Modelo documentado de variáveis de ambiente
├── static/                  # Folhas de estilo, scripts e assets
└── .github/workflows/       # Pipeline de CI/CD (GitHub Actions)
```

---

## 🔒 Governança & Propriedade

Copyright © 2026 **Hubitat by Frame [IA]** / **MJSV Holding**. Todos os direitos reservados.
