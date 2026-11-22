# EcoRota — versão final adaptada para um site público no Render (Free)

## Objetivo e limitações

Este pacote contém a **versão final unificada** do EcoRota para execução local e publicação na internet. No Render Free, o acesso é público pelo link HTTPS, mas a operação com dados é uma **demonstração** baseada em contas fictícias.
Não é um ambiente de produção nem deve ser utilizado com dados reais.
O SQLite do serviço Free **não é persistente**: o banco pode ser recriado
após inatividade, reinício ou novo deploy. Cadastro de novos usuários e
recuperação de senha estão desativados nessa versão, pois não há envio real de
emails de confirmação. Não há conta administrativa criada na versão pública.

## Usar no VS Code com o repositório atual

1. Atualize sua cópia no VS Code com `git fetch origin`.
2. Crie uma branch: `git switch -c deploy/render origin/main` (se já existir,
   utilize `git switch deploy/render`). Faça isso com alterações locais salvas.
3. Copie os arquivos deste pacote de **mesmo caminho relativo** para dentro
   da raiz `EcoRota/`, sobrescrevendo somente os arquivos indicados.
4. Confirme `git status` e execute:

   ```powershell
   git add Dockerfile .dockerignore deploy/ backend/ecorota/settings.py backend/ecorota/urls.py backend/ecorota/asgi.py backend/ecorota/spa.py backend/api/views.py frontend/vite.config.ts frontend/src/pages/LoginPage.tsx frontend/src/components/Navbar.tsx frontend/src/pages/HomePage.tsx frontend/src/pages/CadastroPage.tsx frontend/src/pages/RecuperarSenhaPage.tsx
   git commit -m "deploy: prepara demo publica do EcoRota no Render"
   git push -u origin deploy/render
   ```

5. No Render, em **New > Web Service**, escolha o repositório do EcoRota.
   Se a conta de colaborador não conseguir autorizá-lo, peça ao proprietário
   para aprovar o acesso do GitHub App do Render ao repositório privado.
6. Configuração do Web Service:
   - **Name:** ecorota-usp ou outro disponível.
   - **Language/Runtime:** Docker.
   - **Branch:** deploy/render.
   - **Root Directory:** vazio (raiz do repositório).
   - **Dockerfile Path:** Dockerfile.
   - **Instance Type:** Free.
   - **Health Check Path:** /api/health.
   - **Environment > Add Environment Variable:** DJANGO_SECRET_KEY;
     clique em **Generate** para criar valor secreto seguro (no mínimo 40 caracteres).
   - Não defina `DATABASE_URL`; esta demonstração usa SQLite temporário.
   - `RENDER_EXTERNAL_HOSTNAME` é configurado automaticamente pelo Render.
7. Clique em **Deploy Web Service**. Aguarde o log indicar que Daphne iniciou
   e que o deploy está **Live**. Abra o endereço HTTPS gerado (não presumir o nome).
8. Teste `/`, `/login`, `/caronas`, `/api/health`, `/impacto` e o chat.
   Login de teste: `ana.lima@usp.br` / `EcoRota@2026`.
9. Abra o endereço em aba anônima e no celular. Se houver falha, consulte
   os **Logs** do serviço no Render.

### O que esta preparação altera

- Compila o React com arquivos em `/static/frontend/` e configura WhiteNoise.
- Adiciona rota de fallback React Router na versão pública.
- Servidor único Daphne (ASGI) atende API Django, React e `/ws/chat`.
- Usa `RENDER_EXTERNAL_HOSTNAME` para aceitar o domínio correto.
- Requer `DJANGO_SECRET_KEY` forte, usa `DEBUG=False` e proteção HTTPS no Render.
- Desabilita cadastro e recuperação que dependem de e-mail não configurado.
- Cria SQLite e carrega seed apenas quando o banco não existe, sem superusuário.
- Mantém comandos e modo local do trabalho acadêmico inalterados.

### Problemas comuns

- **Repository not found**: conferir autorização do GitHub App com o proprietário.
- **Missing DJANGO_SECRET_KEY**: definir em Environment no Render.
- **DisallowedHost**: conferir se Render informa `RENDER_EXTERNAL_HOSTNAME`.
- **CSS/JS não carregam**: confirmar Dockerfile e collectstatic em logs.
- **Erros 403 no cadastro**: comportamento intencional desta demo.
- **Desaparecimento dos dados**: comportamento do SQLite efêmero em plano Free.
- **Primeiro acesso lento**: instância gratuita desperta após período inativo.
- **WebSocket/chat**: usar somente URL HTTPS do site; o frontend abre WSS.

Documentação Render: https://render.com/docs/docker e https://render.com/docs/free
