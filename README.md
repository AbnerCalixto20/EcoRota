# EcoRota USP

Sistema web de caronas universitárias solidárias para a comunidade USP (`@usp.br` e NUSP), feito para a disciplina **PMR3304 — Sistemas de Informação** (Escola Politécnica da USP).

- **Site no ar:** https://ecorota-usp.onrender.com
- **Grupo O:** Ábner Calixto Miranda Santos, Mikael Oliveira Carneiro, Pedro Tomasini e Yuri Leonardo Soares Ribeiro.

## Tecnologias

- **Backend:** Django + Django REST Framework + Channels (WebSocket)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Banco de Dados:** SQLite

## Pastas do projeto

- `backend/` — API REST, autenticação e chat em tempo real em Django
- `frontend/` — interface web em React
- `database/` — `schema.sql`, `seed.sql` e script `reset_db.py` do banco SQLite
- `docs/` — proposta, casos de uso e diagramas ER do trabalho

## Como rodar no computador

Você vai precisar de **Python 3.11+** e **Node.js 18+**.

1. Instale as dependências (só na primeira vez):

```powershell
py -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd --prefix frontend install
npm.cmd run db:reset
```

*(No Linux ou macOS, use `python3` no lugar de `py`, `backend/.venv/bin/python` e `npm` no lugar de `npm.cmd`.)*

2. Inicie o backend e o frontend juntos:

```powershell
npm.cmd run dev
```

Depois é só abrir **http://localhost:5173** no navegador.
A API fica em `http://127.0.0.1:8000/api/health` e o painel admin em `http://127.0.0.1:8000/admin/` (`admin` / `EcoRota@2026`).

## Comandos úteis

- `npm.cmd run db:reset` — recria o banco local com os dados de teste
- `npm.cmd run build` — gera o build de produção do frontend

## Contas de teste (apenas no ambiente local)

Senha padrão: `EcoRota@2026`

- **Motoristas:** `ana.lima@usp.br`, `bruno.silva@usp.br`
- **Passageiros:** `carla.mendes@usp.br`, `diego.ferreira@usp.br`, `elisa.nogueira@usp.br`

*(Na versão publicada no Render o banco começa limpo, sem contas fictícias — basta criar uma conta nova em `/cadastro`.)*
