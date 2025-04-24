const { chromium } = require('playwright');
const fs = require('fs');
const cliProgress = require('cli-progress');

const URL = 'https://link-tracker.globo.com/cimed/';
const TOTAL_USUARIOS = 500;
const CONCORRENCIA = 50;
const TEMPO_ESPERA_MS = 2000;

let contadorGlobal = 0;
const logFile = 'log-saida.txt';

fs.writeFileSync(logFile, '');

let totalRequisicoes = 0;
const estatisticas = new Map();

// Barra de progresso
const progressBar = new cliProgress.SingleBar({
  format: '🚀 Simulando |{bar}| {value}/{total} usuários',
  barCompleteChar: '█',
  barIncompleteChar: '░',
  hideCursor: true
}, cliProgress.Presets.shades_classic);

async function acessarPagina(numeroUsuario) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let logRequisicoes = [];

  page.on('requestfinished', async (request) => {
    try {
      const response = await request.response();
      const status = response.status();
      const metodo = request.method();
      const url = request.url().split('?')[0];

      const chave = `${metodo} ${status} ${url}`;
      estatisticas.set(chave, (estatisticas.get(chave) || 0) + 1);

      totalRequisicoes++;
      logRequisicoes.push(`${metodo} ${url} [${status}]`);
    } catch (err) {
      logRequisicoes.push(`(Erro ao capturar resposta: ${request.url()})`);
    }
  });

  try {
    const inicio = Date.now();
    await page.goto(URL, { timeout: 15000 });
    await page.waitForTimeout(TEMPO_ESPERA_MS);
    const fim = Date.now();

    const logFinal = `\n--- Acesso ${numeroUsuario} ---\nTempo: ${fim - inicio} ms\nRequisições:\n` +
      logRequisicoes.join('\n') + '\n';

    fs.appendFileSync(logFile, logFinal);
  } catch (err) {
    const erro = `\n--- Acesso ${numeroUsuario} (ERRO) ---\n${err.message}\n`;
    fs.appendFileSync(logFile, erro);
  } finally {
    progressBar.increment();
    await browser.close();
  }
}

(async () => {
  progressBar.start(TOTAL_USUARIOS, 0);

  for (let i = 0; i < TOTAL_USUARIOS; i += CONCORRENCIA) {
    const promessas = [];
    for (let j = 0; j < CONCORRENCIA && (i + j) < TOTAL_USUARIOS; j++) {
      contadorGlobal++;
      promessas.push(acessarPagina(contadorGlobal));
    }
    await Promise.all(promessas);
  }

  progressBar.stop();

  // Relatório final
  console.log('\n\n📊 RELATÓRIO FINAL');
  console.log('===================');
  console.log(`Total de acessos simulados: ${TOTAL_USUARIOS}`);
  console.log(`Total de requisições feitas: ${totalRequisicoes}`);

  console.log('\nResumo por Método, Status e URL:');
  console.log('---------------------------------');

  const estatisticasOrdenadas = [...estatisticas.entries()].sort((a, b) => b[1] - a[1]);
  estatisticasOrdenadas.forEach(([chave, count]) => {
    console.log(`${chave.padEnd(80)} → ${count}`);
  });
})();
