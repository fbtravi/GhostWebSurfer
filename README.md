# Simulador de Usuários com Playwright (Node.js + Docker)

Este projeto simula o acesso de múltiplos usuários a uma URL via navegador automatizado (Playwright). Ele carrega toda a página como um navegador real: executa JavaScript, redirecionamentos, rastreadores, etc. O objetivo é gerar carga ou monitorar como a página responde a múltiplos acessos simultâneos.

---

## O que o script faz

- Acessa a URL desejada (com navegador real)
- Executa o JavaScript da página como o Chrome faria
- Coleta **todas as requisições** feitas durante o acesso
- Salva um log detalhado com tempo de carregamento e URLs acessadas
- Simula múltiplos usuários simultâneos

---

## Variáveis configuráveis

No script abaixo (`simular-usuarios.js`), você pode editar:

```js
const URL = 'https://link-tracker.globo.com/cimed/';
const TOTAL_USUARIOS = 500;
const CONCORRENCIA = 50;
const TEMPO_ESPERA_MS = 2000;
```

## Como rodar no macOS

* Instale o Node.js e NPM (se ainda não tiver)

```bash
brew install node
```

* (Importante) Voltar o NPM pro repositório padrão

```bash
npm config set registry https://registry.npmjs.org/
```

* Instale o Playwright
```bash
npm install playwright
npx playwright install
```

* Rode o script

```bash
node simular-usuarios.js
```
* Veja o log
Após a execução, um arquivo log-saida.txt será gerado com todos os acessos e suas requisições.
