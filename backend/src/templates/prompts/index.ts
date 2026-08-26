import * as fs from 'fs';
import * as path from 'path';

const TEMPLATES_DIR = path.resolve(__dirname, '.');

const FASES = [
  'fase-1-planejamento',
  'fase-2-viabilidade',
  'fase-3-requisitos',
  'fase-4-design-contratos',
  'fase-5-design-uxui',
  'fase-6-banco-dados',
  'fase-7-implementacao',
  'fase-8-testes',
  'fase-9-devsecops',
  'fase-10-deploy',
  'fase-11-documentacao'
] as const;

type FaseKey = typeof FASES[number];

const PAPEIS_POR_FASE: Record<FaseKey, string[]> = {
  'fase-1-planejamento': ['project-manager', 'product-owner', 'business-analyst', 'stakeholder', 'scrum-master', 'risk-manager', 'technical-lead'],
  'fase-2-viabilidade': ['project-manager', 'software-architect', 'business-analyst', 'financial-analyst', 'legal-consultant', 'technical-lead', 'domain-expert', 'risk-analyst', 'operations-manager'],
  'fase-3-requisitos': ['business-analyst', 'product-owner', 'project-manager', 'technical-lead', 'stakeholder', 'qa-lead', 'ux-designer', 'domain-expert', 'security-analyst'],
  'fase-4-design-contratos': ['software-architect', 'system-architect', 'technical-lead', 'backend-developer', 'frontend-developer', 'database-architect', 'devops-engineer', 'qa-lead', 'security-architect'],
  'fase-5-design-uxui': ['ux-designer', 'ui-designer', 'ux-researcher', 'interaction-designer', 'visual-designer', 'design-systems-engineer', 'accessibility-specialist', 'product-designer'],
  'fase-6-banco-dados': ['database-architect', 'database-administrator', 'data-engineer', 'backend-developer', 'data-analyst', 'qa-engineer', 'devops-engineer', 'data-architect'],
  'fase-7-implementacao': ['software-architect', 'technical-lead', 'full-stack-developer', 'backend-developer', 'frontend-developer', 'mobile-developer', 'devops-engineer', 'qa-engineer'],
  'fase-8-testes': ['qa-lead', 'qa-engineer', 'test-automation-engineer', 'performance-engineer', 'security-engineer', 'uat-specialist', 'release-manager', 'devops-engineer'],
  'fase-9-devsecops': ['devsecops-engineer', 'security-engineer', 'security-analyst', 'penetration-tester', 'compliance-officer', 'risk-manager', 'security-architect', 'application-security-engineer'],
  'fase-10-deploy': ['devops-engineer', 'release-manager', 'sre', 'cloud-engineer', 'infrastructure-engineer', 'operations-manager', 'support-engineer', 'security-engineer'],
  'fase-11-documentacao': ['technical-writer', 'documentation-specialist', 'maintenance-engineer', 'application-support-engineer', 'sre', 'product-owner', 'qa-engineer', 'devops-engineer']
};

export interface PromptTemplate {
  fase: FaseKey;
  papel: string;
  caminho: string;
  conteudo: string;
}

const cache = new Map<string, string>();

function lerTemplate(fase: FaseKey, papel: string): string {
  const chave = `${fase}:${papel}`;
  if (cache.has(chave)) {
    return cache.get(chave)!;
  }
  const caminho = path.join(TEMPLATES_DIR, fase, `${papel}.md`);
  if (!fs.existsSync(caminho)) {
    throw new Error(`Template não encontrado: ${caminho}`);
  }
  const conteudo = fs.readFileSync(caminho, 'utf-8');
  cache.set(chave, conteudo);
  return conteudo;
}

export function obterTemplate(fase: FaseKey, papel: string): string {
  return lerTemplate(fase, papel);
}

export function listarFases(): FaseKey[] {
  return [...FASES];
}

export function listarPapeis(fase: FaseKey): string[] {
  return PAPEIS_POR_FASE[fase] || [];
}

export function listarTodos(): PromptTemplate[] {
  const templates: PromptTemplate[] = [];
  for (const fase of FASES) {
    const papeis = PAPEIS_POR_FASE[fase];
    for (const papel of papeis) {
      templates.push({
        fase,
        papel,
        caminho: path.join(TEMPLATES_DIR, fase, `${papel}.md`),
        conteudo: lerTemplate(fase, papel)
      });
    }
  }
  return templates;
}
