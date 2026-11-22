# EcoRota USP (PMR3304 — Sistemas de Informação)

Plataforma de caronas universitárias solidárias para a comunidade USP (`@usp.br` + NUSP), desenvolvida em **Django + Django REST Framework + React (Vite)** com banco **SQLite** (15 tabelas, 12 índices, 6 views e 18 triggers).

**Grupo O:** Ábner Calixto Miranda Santos, Mikael Oliveira Carneiro, Pedro Tomasini e Yuri Leonardo Soares Ribeiro.

## Estrutura do Projeto

```text
Ecorotas/
├── database/          # Banco SQLite oficial (schema.sql, seed.sql, ecorota.sqlite, reset_db.py)
├── backend/           # API REST + WebSocket em Django (manage.py, ecorota/, api/)
└── frontend/          # Interface web em React + TypeScript + Tailwind (src/components/, src/pages/)
```

## Primeira Execução (após descompactar ou clonar)

Pré-requisitos: **Python 3.11+** e **Node.js 18+**.

```powershell
# 1. Entre na pasta do projeto
cd Ecorotas

# 2. Crie o ambiente virtual Python e instale as dependências do backend
py -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# 3. Instale as dependências do frontend React
npm.cmd --prefix frontend install

# 4. (Opcional) Recrie o banco SQLite com os dados de demonstração
npm.cmd run db:reset
```

*(No Linux/macOS, use `python3 -m venv backend/.venv`, `backend/.venv/bin/python -m pip install -r backend/requirements.txt` e `npm` no lugar de `npm.cmd`.)*

## Como Rodar Localmente

```powershell
cd Ecorotas
npm.cmd run dev
```

- **Site (React):** `http://localhost:5173`
- **API (Django):** `http://127.0.0.1:8000/api/health`
- **Django Admin:** `http://127.0.0.1:8000/admin/` (`admin` / `EcoRota@2026`)

## Comandos Úteis

- `npm.cmd run test` — executa a bateria de 15 testes automatizados do Django
- `npm.cmd run db:reset` — recria o banco SQLite com os dados iniciais (124 locais: 34 unidades/museus USP, 4 bandejões e 86 estações do Metrô de SP)
- `npm.cmd run build` — valida o build de produção do React

## Contas de Demonstração (senha: `EcoRota@2026`)

- **Motoristas:** `ana.lima@usp.br`, `bruno.silva@usp.br`
- **Passageiros:** `carla.mendes@usp.br`, `diego.ferreira@usp.br`, `elisa.nogueira@usp.br`
