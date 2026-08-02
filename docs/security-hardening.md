# Hardening de seguranca do repositorio

Este projeto e um site estatico. As protecoes aplicadas no codigo reduzem risco no navegador e criam checagens automatizadas. As configuracoes abaixo devem ser habilitadas no GitHub para completar a postura de seguranca do repositorio.

## Configuracoes recomendadas no GitHub

- Habilitar branch protection para `main`.
- Exigir pull request antes de merge em `main`.
- Exigir status check `Security checks` antes do merge.
- Exigir revisao por CODEOWNERS.
- Bloquear force push em `main`.
- Habilitar Dependabot alerts.
- Habilitar Dependabot security updates.
- Habilitar secret scanning e push protection.
- Habilitar GitHub Pages apenas a partir da branch e pasta esperadas.
- Manter HTTPS enforced no dominio publicado.

## Superficie de ataque atual

- Nao ha backend nem banco de dados.
- Nao ha formulario coletando dados sensiveis.
- Links externos abrem WhatsApp com `noopener`, `noreferrer` e politica de referrer.
- JavaScript local nao usa `innerHTML`, `eval`, `document.write` nem handlers inline.
- CSP restringe scripts, fontes, imagens, frames, formularios e objetos.

## Pontos que exigem atencao ao mudar conteudo

- Se o JSON-LD inline do `index.html` for editado, recalcular o hash `sha256-...` da CSP.
- Se novas fontes, imagens remotas ou scripts externos forem adicionados, atualizar a CSP de forma minima.
- Nao versionar arquivos `.env`, credenciais, chaves privadas, backups ou exports contendo dados pessoais.
- Revisar qualquer novo PDF antes de publicar para evitar metadados ou dados pessoais indevidos.
