const { chromium } = require('playwright');
const fs = require('fs');

const URL = 'https://link-tracker.globo.com/cimed/';
const TOTAL_USUARIOS = 500;
const CONCORRENCIA = 50;
const TEMPO_ESPERA_MS = 2000;

let contadorGlobal = 0;
const logFile = 'log-saida.txt';

fs.writeFileSync(logFile, '');

async function acessarPagina(numeroUsuario) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let logRequisicoes = [];

  page.on('requestfinished', request => {
    const url = request.url();
    const metodo = request.method();
    logRequisicoes.push(`${metodo} ${url}`);
  });

  try {
    const inicio = Date.now();
    await page.goto(URL, { timeout: 15000 });
    await page.waitForTimeout(TEMPO_ESPERA_MS);
    const fim = Date.now();

    const logFinal = `\n--- Acesso ${numeroUsuario} ---\nTempo: ${fim - inicio} ms\nRequisições:\n` +
      logRequisicoes.join('\n') + '\n';

    fs.appendFileSync(logFile, logFinal);
    console.log(`✔️ Usuário ${numeroUsuario} concluído`);
  } catch (err) {
    const erro = `\n--- Acesso ${numeroUsuario} (ERRO) ---\n${err.message}\n`;
    fs.appendFileSync(logFile, erro);
    console.error(`Usuário ${numeroUsuario} erro:`, err.message);
  } finally {
    await browser.close();
  }
}

(async () => {
  for (let i = 0; i < TOTAL_USUARIOS; i += CONCORRENCIA) {
    const promessas = [];
    for (let j = 0; j < CONCORRENCIA && (i + j) < TOTAL_USUARIOS; j++) {
      contadorGlobal++;
      promessas.push(acessarPagina(contadorGlobal));
    }
    console.log(`Executando acessos ${i + 1} a ${i + promessas.length}`);
    await Promise.all(promessas);
  }

  console.log(' Simulação finalizada!');
})();
