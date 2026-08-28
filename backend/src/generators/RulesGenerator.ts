/**
 * RulesGenerator — gera .kilo/rules/agentmap/*.md a partir de .ia/policies/
 *
 * Se .ia/policies/ não existir, gera regras padrão mínimas.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { GeneratorResult, CliContext } from '../cli/types';

export class RulesGenerator {
  constructor(private ctx: CliContext) {}

  generate(): GeneratorResult[] {
    const results: GeneratorResult[] = [];
    const policiesSource = path.join(this.ctx.agentMapRoot, '.ia', 'policies');
    const rulesTarget = path.join(this.ctx.cwd, '.kilo', 'rules', 'agentmap');

    fs.mkdirSync(rulesTarget, { recursive: true });

    const defaultRules = this.getDefaultRules();

    if (!fs.existsSync(policiesSource)) {
      // Gera regras padrão
      for (const [name, content] of Object.entries(defaultRules)) {
        const targetPath = path.join(rulesTarget, `${name}.md`);
        if (fs.existsSync(targetPath) && !this.ctx.force) {
          results.push({ success: true, path: targetPath, action: 'unchanged' });
          continue;
        }
        if (this.ctx.dryRun) {
          results.push({ success: true, path: targetPath, action: 'created', message: '[dry-run]' });
          continue;
        }
        fs.writeFileSync(targetPath, content, 'utf-8');
        results.push({ success: true, path: targetPath, action: 'created' });
      }
      return results;
    }

    const files = fs.readdirSync(policiesSource).filter((f) => f.endsWith('.md'));
    if (files.length === 0) {
      for (const [name, content] of Object.entries(defaultRules)) {
        const targetPath = path.join(rulesTarget, `${name}.md`);
        if (fs.existsSync(targetPath) && !this.ctx.force) {
          results.push({ success: true, path: targetPath, action: 'unchanged' });
          continue;
        }
        if (this.ctx.dryRun) {
          results.push({ success: true, path: targetPath, action: 'created', message: '[dry-run]' });
          continue;
        }
        fs.writeFileSync(targetPath, content, 'utf-8');
        results.push({ success: true, path: targetPath, action: 'created' });
      }
      return results;
    }

    for (const file of files) {
      const sourcePath = path.join(policiesSource, file);
      const targetPath = path.join(rulesTarget, file);
      const content = fs.readFileSync(sourcePath, 'utf-8');

      if (fs.existsSync(targetPath) && !this.ctx.force) {
        results.push({ success: true, path: targetPath, action: 'unchanged' });
        continue;
      }

      if (this.ctx.dryRun) {
        results.push({ success: true, path: targetPath, action: 'updated', message: '[dry-run]' });
        continue;
      }

      fs.writeFileSync(targetPath, content, 'utf-8');
      results.push({ success: true, path: targetPath, action: 'updated' });
    }

    return results;
  }

  private getDefaultRules(): Record<string, string> {
    return {
      'operating-rules': `# Regras de Operação — AgentMap

> Gerado automaticamente. Não edite manualmente.

## Princípios

1. O AgentMap **não executa agentes** — ele entrega contexto e registra o que acontece.
2. Git é somente leitura (consulta).
3. Proteção contra path traversal em todos os caminhos de arquivo.
4. Validação de JSON em todas as escritas.
5. Backups automáticos antes de operações destrutivas.

## Comportamento

- Sempre use caminhos relativos ao worktree.
- Nunca exponha segredos em logs ou mensagens.
- Documente toda decisão em \`.ia/decisoes/\`.
- Siga o fluxo de trabalho definido em \`.ia/fluxo-trabalho.md\`.
`,

      'security-rules': `# Regras de Segurança — AgentMap

> Gerado automaticamente. Não edite manualmente.

## Controles Obrigatórios

1. **Validação de entrada** — Toda entrada de usuário deve ser validada e sanitizada.
2. **Princípio do menor privilégio** — Conceda apenas permissões estritamente necessárias.
3. **Defesa em profundidade** — Implemente múltiplas camadas de segurança.
4. **Segurança by design** — Considere segurança desde o início.
5. **Conformidade** — Verifique requisitos regulatórios antes de implementar.

## Proibições

- Nunca armazene chaves, senhas ou tokens em código ou Git.
- Nunca exponha dados sensíveis em mensagens de erro.
- Nunca desative controles de segurança sem aprovacao formal.
`,

      'communication-rules': `# Regras de Comunicação — AgentMap

> Gerado automaticamente. Não edite manualmente.

## Padrões

1. Agentes filhos usam **HTTP direto** para escrever no monitoramento.
2. Agentes filhos leem respostas via HTTP ou tool MCP.
3. O pai envia instruções diretamente pelo prompt do Agent Manager.

## Formato de mensagens

- Sempre prefixar: \`[<agenteId>][<tarefaId>] <mensagem>\`
- Usar tipos corretos: \`KILO_CHAT\`, \`KILO_REPLY\`, \`KILO_RESULT\`.

## Handoffs

- Sempre criar handoff antes de transferir trabalho.
- Sempre confirmar recebimento do handoff.
`,

      'quality-rules': `# Regras de Qualidade — AgentMap

> Gerado automaticamente. Não edite manualmente.

## Política

1. Toda tarefa deve ter critérios de aceitação testáveis.
2. Toda alteração deve ter revisão antes do merge.
3. Cobertura de testes mínima: 70%.
4. Nenhum bug crítico pode ser adiado.

## Definition of Done

- [ ] Código implementado
- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Documentação atualizada
- [ ] Revisão de código aprovada
`,

      'git-rules': `# Regras de Git — AgentMap

> Gerado automaticamente. Não edite manualmente.

## Convenções

1. Commits semânticos: \`feat:\`, \`fix:\`, \`docs:\`, \`test:\`, \`chore:\`.
2. Nunca commitar segredos.
3. Nunca fazer force-push em branches compartilhados.
4. Sempre abra PR antes de merge.
5. Proteja branches principais.
`,

      'dependency-rules': `# Regras de Dependências — AgentMap

> Gerado automaticamente. Não edite manualmente.

## Diretrizes

1. Evite dependências circulares entre módulos.
2. Versões de dependências devem ser fixas (sem ^ ou ~ em produção).
3. Dependências desnecessárias devem ser removidas.
4. Bibliotecas sem manutenção devem ser evitadas.
`,
    };
  }
}
