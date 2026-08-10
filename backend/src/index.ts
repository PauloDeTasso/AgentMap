import { createApp } from './app';
import { loadSettings } from './config';

const settings = loadSettings();
const PORTA = settings.portaApi;

const app = createApp();

app.listen(PORTA, () => {
  console.log(`\n========================================`);
  console.log(`  Gerenciador Local de Agentes de IA`);
  console.log(`  Backend: http://localhost:${PORTA}`);
  console.log(`  Frontend: http://localhost:${PORTA}/index.html`);
  console.log(`========================================\n`);
});
