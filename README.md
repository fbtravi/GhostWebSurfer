# User Simulator with Playwright (Node.js)

This project simulates multiple users accessing a URL via an automated browser (Playwright). It loads the entire page like a real browser: executing JavaScript, handling redirects, trackers, etc. The goal is to generate load or monitor how the page responds to multiple concurrent accesses.

This version has been refactored to be more modular, extensible, and maintainable.

---

## What it does

- Accesses the target URL with a real browser engine.
- Executes the page's JavaScript just like Chrome would.
- Collects **all requests** made during the session.
- Saves a detailed log with load times and accessed URLs.
- Simulates multiple concurrent users with concurrency control.
- Displays a progress bar or an interactive dashboard in the terminal.
- Identifies and ranks the slowest domains based on average resource load time.

---

## Configuration

Variables are configured in the `config.js` file or through environment variables (e.g., `TARGET_URL=https://... make run`).

## How to Run (macOS)

This project uses a `Makefile` to automate the setup and execution process.

1.  **Prerequisite:** Ensure you have Homebrew installed on your Mac.

2.  **Run the Simulation:**
    Use one of the commands below. The `make` command will automatically check for and install all necessary dependencies (Node.js, npm packages, Playwright browsers) before running the script.

    - **To run and save to a log file:**

```bash
make run
```

* Instale o Playwright

```bash
npm install playwright
npx playwright install
```

* Instale o cli-progress

```bash
npm install playwright cli-progress
npx playwright install
```



* Rode o script

```bash
node simular-usuarios.js
```

* Veja o log
Após a execução, um arquivo log-saida.txt será gerado com todos os acessos e suas requisições.
