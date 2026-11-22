# Verificação da publicação pública do EcoRota

- [ ] A branch `deploy/render` contém o código final, documentação e `Dockerfile`.
- [ ] A conta Render possui acesso ao repositório privado `AbnerCalixto20/EcoRota`.
- [ ] Serviço Web: `Docker`, branch `deploy/render`, plano `Free`.
- [ ] `DJANGO_SECRET_KEY` definida no Render com valor aleatório de 40+ caracteres.
- [ ] `DATABASE_URL` não configurada para esta implantação com SQLite temporário.
- [ ] Logs do deploy mostram o servidor Daphne iniciado e status `Live`.
- [ ] `/api/health` retorna uma resposta válida.
- [ ] Página inicial, login demo, pesquisa, dashboard e chat testados.
- [ ] Teste em aba anônima e celular confirma acesso por HTTPS.
- [ ] Aviso aos visitantes de que os dados são fictícios e temporários.
- [ ] Nenhum dado pessoal real nem segredo incluído no Git.

**Limite do Render Free:** o SQLite local é perdido em suspensões, reinícios e
redeploys. Esta implantação não oferece armazenamento permanente nem cadastro
público real. Para uso efetivo com usuários, implemente banco persistente,
validação de e-mail, recuperação de senha e controles de privacidade adicionais.
