
# EcoRota USP

**Plataforma de Caronas Universitárias Solidárias**

Projeto acadêmico desenvolvido para a disciplina **PMR3304 - Sistemas de Informação**, da Escola Politécnica da Universidade de São Paulo (Poli-USP).

## 1. Integrantes

**Grupo O**

- Ábner Calixto Miranda Santos
- Mikael Oliveira Carneiro
- Pedro Tomasini
- Yuri Leonardo Soares Ribeiro

## 2. Sobre o projeto

O EcoRota é uma plataforma web de caronas solidárias voltada à comunidade da Universidade de São Paulo.

O sistema conecta motoristas e passageiros interessados em compartilhar trajetos, promovendo mobilidade sustentável, redução de custos e utilização mais eficiente dos veículos.

A aplicação possui interface web, API REST, autenticação de usuários e banco de dados relacional.

### Funcionalidades

- Cadastro e autenticação de usuários com e-mail institucional da USP.
- Gerenciamento de perfis e veículos.
- Publicação e pesquisa de ofertas de caronas.
- Solicitação, confirmação e cancelamento de reservas.
- Gerenciamento de viagens como motorista ou passageiro.
- Chat entre participantes de uma viagem.
- Avaliação de participantes.
- Histórico de viagens.
- Notificações e suporte.
- Dashboard sustentável com indicadores e totalizações.

## 3. Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Frontend | React, TypeScript, Vite e Tailwind CSS |
| Backend | Python, Django e Django REST Framework |
| API | REST |
| Comunicação em tempo real | Django Channels e WebSocket |
| Autenticação | JWT |
| Banco de dados | SQLite |
| Versionamento | Git e GitHub |

O banco de dados utiliza tabelas relacionais, chaves primárias e estrangeiras, índices, views e triggers.

## 4. Estrutura do projeto

```text
EcoRota/
|
|-- backend/
|   |-- api/
|   |-- ecorota/
|   |-- manage.py
|   |-- requirements.txt
|
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- App.tsx
|   |-- package.json
|
|-- database/
|   |-- schema.sql
|   |-- seed.sql
|   |-- reset_db.py
|
|-- docs/
|   |-- Proposta Grupo O.pdf
|   |-- Casos-de-Usos-EcoRota.pdf
|   |-- Entrega Entidade Relação/
|       |-- EcoRota_DER.pdf
|       |-- EcoRotaDER_DiretoDB_Browser.pdf
|
|-- dev.mjs
|-- package.json
|-- README.md
```

A pasta `docs` reúne a documentação acadêmica do projeto.

## 5. Pré-requisitos

Para executar o projeto localmente, é necessário instalar:

- Python 3.12 ou superior.
- Node.js 20 ou superior, preferencialmente uma versão LTS.
- npm (incluído na instalação do Node.js).
- Git.
- Visual Studio Code ou outro editor de código.

O procedimento principal abaixo foi verificado em ambiente Windows com PowerShell.

## 6. Instalação no Windows

### 6.1. Clonar o repositório

Abra o terminal do VS Code ou o PowerShell e execute:

```powershell
git clone https://github.com/AbnerCalixto20/EcoRota.git
cd EcoRota
```

O repositório pode exigir autorização de acesso no GitHub.

Caso o projeto já esteja clonado, basta abrir sua pasta no VS Code.

### 6.2. Criar o ambiente virtual Python

Na raiz do projeto:

```powershell
py -m venv backend\.venv
```

Instale as dependências do backend:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Não é necessário ativar o ambiente virtual manualmente. Os scripts utilizam o executável Python instalado em `backend\.venv`.

### 6.3. Instalar as dependências do frontend

```powershell
npm.cmd --prefix frontend ci
```

Esse comando instala as dependências definidas no arquivo `frontend/package-lock.json`.

### 6.4. Inicializar o banco de dados

**Na primeira execução após clonar o projeto, é necessário criar o banco SQLite.**

Execute:

```powershell
npm.cmd run db:reset
```

O script:

1. Cria o banco `database/ecorota.sqlite`.
2. Executa as instruções de `schema.sql`.
3. Insere os dados de demonstração de `seed.sql`.
4. Aplica as migrações necessárias do Django.
5. Cria uma conta administrativa de demonstração.
6. Verifica a integridade do banco de dados.

**Atenção:** esse comando recria o banco e apaga os dados locais anteriores. Utilize-o apenas quando desejar reinicializar os dados.

## 7. Executar a aplicação

Na raiz do projeto, execute:

```powershell
npm.cmd run dev
```

O comando inicia os servidores do frontend e do backend.

Acesse os seguintes endereços:

| Serviço | Endereço |
|---|---|
| Aplicação web | http://localhost:5173 |
| API - Health Check | http://127.0.0.1:8000/api/health |
| Administração Django | http://127.0.0.1:8000/admin/ |

Mantenha o terminal aberto enquanto estiver utilizando a aplicação.

Para encerrar os servidores, pressione `Ctrl + C` no terminal.

## 8. Contas de demonstração

O sistema possui usuários de exemplo para facilitar a apresentação e os testes.

**Senha padrão das contas de demonstração:**

`EcoRota@2026`

| Perfil | E-mail |
|---|---|
| Motorista | ana.lima@usp.br |
| Motorista | bruno.silva@usp.br |
| Passageiro | carla.mendes@usp.br |
| Passageiro | diego.ferreira@usp.br |
| Passageiro | elisa.nogueira@usp.br |

### Administração Django

- Endereço: http://127.0.0.1:8000/admin/
- Usuário: `admin`
- Senha: `EcoRota@2026`

Essas credenciais são destinadas exclusivamente ao ambiente acadêmico de demonstração e não devem ser utilizadas em produção.

## 10. Build do frontend

Para verificar a compilação do frontend React:

```powershell
npm.cmd run build
```

Esse comando executa a verificação do TypeScript e gera os arquivos compilados pelo Vite na pasta `frontend/dist`.

O build foi executado com sucesso na verificação local do projeto.

## 11. Execução em Linux ou macOS

Para esses sistemas, utilize os seguintes comandos a partir da raiz do repositório:

```bash
python3 -m venv backend/.venv

backend/.venv/bin/python -m pip install -r backend/requirements.txt

npm --prefix frontend ci

backend/.venv/bin/python database/reset_db.py

npm run dev
```

O script `db:reset` do `package.json` principal utiliza caminhos específicos do Windows. Por esse motivo, em Linux ou macOS, execute os comandos Python diretamente, como mostrado acima.

## 12. Solução de problemas

### O comando npm não é reconhecido

Verifique se o Node.js está instalado:

```powershell
node -v
npm.cmd -v
```

Caso o comando não seja encontrado, instale o Node.js e reinicie o VS Code.

### Erro de política de execução do PowerShell

Não é necessário modificar a política de execução nem ativar o ambiente virtual Python.

Utilize diretamente os comandos indicados na seção de instalação.

### Problemas ao acessar o site

Verifique se o comando `npm.cmd run dev` continua em execução e se os servidores foram iniciados nas portas 5173 e 8000.

### Problemas com o banco de dados

Para reinicializar o banco com os dados de demonstração:

```powershell
npm.cmd run db:reset
```

Esse procedimento apaga os dados locais existentes.

## 13. Documentação acadêmica

A pasta `docs` contém os materiais produzidos durante o desenvolvimento:

- Proposta do projeto EcoRota.
- Documento de casos de uso.
- Diagrama entidade-relacionamento.
- Documentação das tabelas e relacionamentos do banco de dados.

Esses documentos complementam o código-fonte e descrevem os requisitos e a modelagem do sistema.

## 14. Observações

Este projeto foi desenvolvido para fins acadêmicos e de demonstração local.

O ambiente de desenvolvimento utiliza dados e credenciais fictícios. Para disponibilização pública em produção, seriam necessários ajustes adicionais de segurança, configuração dos serviços e tratamento de credenciais.

## 15. Repositório

GitHub: https://github.com/AbnerCalixto20/EcoRota

**Universidade de São Paulo - Escola Politécnica**

**PMR3304 - Sistemas de Informação - 2026**
