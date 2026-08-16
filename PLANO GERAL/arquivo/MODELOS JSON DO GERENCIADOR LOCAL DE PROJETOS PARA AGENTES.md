# MODELOS JSON DO GERENCIADOR LOCAL DE PROJETOS PARA AGENTES

## 1. ESTRUTURA GERAL

```text
projeto/
│
├── .ia/
│   │
│   ├── configuracao/
│   │   ├── projeto.json
│   │   ├── ambiente.json
│   │   └── gerenciador.json
│   │
│   ├── agentes/
│   │   ├── agentes.json
│   │   ├── planejador.json
│   │   ├── frontend.json
│   │   ├── backend.json
│   │   ├── banco.json
│   │   ├── android.json
│   │   ├── infraestrutura.json
│   │   ├── testes.json
│   │   ├── seguranca.json
│   │   ├── revisor.json
│   │   ├── documentacao.json
│   │   ├── observabilidade.json
│   │   └── desempenho.json
│   │
│   ├── contratos/
│   │   ├── contratos.json
│   │   ├── contrato-projeto.json
│   │   ├── contrato-arquitetura.json
│   │   ├── contrato-api.json
│   │   ├── contrato-banco.json
│   │   ├── contrato-frontend.json
│   │   ├── contrato-android.json
│   │   ├── contrato-seguranca.json
│   │   ├── contrato-infraestrutura.json
│   │   ├── contrato-testes.json
│   │   ├── contrato-documentacao.json
│   │   └── contrato-interface.json
│   │
│   ├── tarefas/
│   │   ├── tarefas.json
│   │   └── modelos/
│   │       └── modelo-tarefa.json
│   │
│   ├── estado/
│   │   ├── estado-atual.json
│   │   ├── progresso.json
│   │   └── bloqueios.json
│   │
│   ├── decisoes/
│   │   └── decisoes.json
│   │
│   ├── riscos/
│   │   └── riscos.json
│   │
│   ├── problemas/
│   │   └── problemas.json
│   │
│   ├── conhecimento/
│   │   └── conhecimento.json
│   │
│   ├── procedimentos/
│   │   └── procedimentos.json
│   │
│   ├── permissoes/
│   │   ├── permissoes.json
│   │   └── ferramentas.json
│   │
│   ├── contexto/
│   │   └── contextos.json
│   │
│   ├── qualidade/
│   │   ├── criterios.json
│   │   ├── testes.json
│   │   └── revisoes.json
│   │
│   ├── git/
│   │   └── estado-git.json
│   │
│   └── auditoria/
│       └── eventos.json
│
├── frontend/
├── backend/
├── android/
├── banco/
├── infraestrutura/
├── implantacao/
├── testes/
└── docs/
```

---

# 2. CONFIGURAÇÃO DO PROJETO

## `projeto.json`

```json
{
	"id": "projeto-principal",
	"nome": "Nome do Projeto",
	"descricao": "Descrição geral do projeto.",
	"versao": "1.0.0",
	"estado": "em_desenvolvimento",
	"idioma": "pt-BR",
	"fusoHorario": "America/Sao_Paulo",
	"proprietario": {
		"tipo": "humano",
		"nome": "Proprietário do Projeto"
	},
	"objetivos": [
		"Objetivo principal do projeto."
	],
	"escopo": {
		"incluso": [],
		"excluido": []
	},
	"tecnologias": {
		"frontend": [],
		"backend": [],
		"android": [],
		"bancoDeDados": [],
		"infraestrutura": [],
		"testes": []
	},
	"arquiteturas": [
		"DDD",
		"Arquitetura Limpa",
		"Arquitetura em Camadas"
	],
	"padroes": [
		"SOLID",
		"GRASP",
		"Padrões de Projeto"
	],
	"diretorios": {
		"frontend": "/frontend",
		"backend": "/backend",
		"android": "/android",
		"banco": "/banco",
		"infraestrutura": "/infraestrutura",
		"implantacao": "/implantacao",
		"testes": "/testes",
		"documentacao": "/docs"
	},
	"configuracaoIa": {
		"diretorio": "/.ia",
		"contratoPrincipal": "/.ia/contratos/contrato-projeto.json",
		"estadoAtual": "/.ia/estado/estado-atual.json"
	},
	"datas": {
		"criacao": null,
		"ultimaAtualizacao": null
	}
}
```

---

# 3. CONFIGURAÇÃO DO GERENCIADOR

## `gerenciador.json`

```json
{
	"nome": "Gerenciador Local de Projetos para Agentes",
	"versao": "1.0.0",
	"modo": "local",
	"idioma": "pt-BR",
	"formatoDados": "json",
	"controleVersao": "git",
	"requerAprovacaoHumana": true,
	"registroAuditoria": true,
	"controlePermissoes": true,
	"controleContexto": true,
	"controleDependencias": true,
	"controleConflitos": true,
	"controleContratos": true,
	"controleQualidade": true,
	"controleSeguranca": true,
	"ambientes": [
		"desenvolvimento",
		"teste",
		"homologacao",
		"producao"
	],
	"estadosTarefa": [
		"rascunho",
		"planejada",
		"pronta",
		"em_execucao",
		"em_teste",
		"em_revisao",
		"aguardando_aprovacao",
		"concluida",
		"bloqueada",
		"cancelada",
		"rejeitada"
	]
}
```

---

# 4. AMBIENTES

## `ambiente.json`

```json
{
	"ambientes": [
		{
			"id": "desenvolvimento",
			"nome": "Desenvolvimento",
			"tipo": "local",
			"permitirAlteracaoCodigo": true,
			"permitirTestes": true,
			"permitirImplantacao": false,
			"permitirAcessoProducao": false
		},
		{
			"id": "teste",
			"nome": "Teste",
			"tipo": "local",
			"permitirAlteracaoCodigo": false,
			"permitirTestes": true,
			"permitirImplantacao": false,
			"permitirAcessoProducao": false
		},
		{
			"id": "homologacao",
			"nome": "Homologação",
			"tipo": "remoto",
			"permitirAlteracaoCodigo": false,
			"permitirTestes": true,
			"permitirImplantacao": true,
			"permitirAcessoProducao": false
		},
		{
			"id": "producao",
			"nome": "Produção",
			"tipo": "remoto",
			"permitirAlteracaoCodigo": false,
			"permitirTestes": false,
			"permitirImplantacao": true,
			"permitirAcessoProducao": true,
			"requerAprovacaoHumana": true
		}
	]
}
```

---

# 5. REGISTRO CENTRAL DE AGENTES

## `agentes.json`

```json
{
	"agentes": [
		{
			"id": "planejador-arquiteto",
			"nome": "Planejador / Arquiteto",
			"funcao": "planejamento",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/planejador.json"
		},
		{
			"id": "frontend",
			"nome": "Frontend",
			"funcao": "desenvolvimento_frontend",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/frontend.json"
		},
		{
			"id": "backend",
			"nome": "Backend",
			"funcao": "desenvolvimento_backend",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/backend.json"
		},
		{
			"id": "banco",
			"nome": "Banco de Dados",
			"funcao": "banco_de_dados",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/banco.json"
		},
		{
			"id": "android",
			"nome": "Android",
			"funcao": "desenvolvimento_android",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/android.json"
		},
		{
			"id": "infraestrutura",
			"nome": "Infraestrutura",
			"funcao": "infraestrutura_implantacao",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/infraestrutura.json"
		},
		{
			"id": "testes",
			"nome": "Qualidade e Testes",
			"funcao": "qualidade_testes",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/testes.json"
		},
		{
			"id": "seguranca",
			"nome": "Segurança",
			"funcao": "seguranca",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/seguranca.json"
		},
		{
			"id": "revisor",
			"nome": "Revisor de Código",
			"funcao": "revisao",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/revisor.json"
		},
		{
			"id": "documentacao",
			"nome": "Documentação",
			"funcao": "documentacao",
			"estado": "ativo",
			"arquivoPerfil": "/.ia/agentes/documentacao.json"
		},
		{
			"id": "observabilidade",
			"nome": "Observabilidade",
			"funcao": "observabilidade",
			"estado": "disponivel",
			"arquivoPerfil": "/.ia/agentes/observabilidade.json"
		},
		{
			"id": "desempenho",
			"nome": "Desempenho",
			"funcao": "desempenho",
			"estado": "disponivel",
			"arquivoPerfil": "/.ia/agentes/desempenho.json"
		}
	]
}
```

---

# 6. MODELO COMPLETO DE PERFIL DE AGENTE

Este é o modelo-base que todos os agentes deverão seguir.

## `modelo-agente.json`

```json
{
	"id": "identificador-do-agente",
	"nome": "Nome do Agente",
	"funcao": "funcao_do_agente",
	"descricao": "Descrição da função.",
	"estado": "ativo",
	"responsabilidades": [],
	"objetivos": [],
	"conhecimentos": [],
	"dominios": [],
	"diretoriosPermitidos": [],
	"diretoriosProibidos": [],
	"contratosObrigatorios": [],
	"procedimentosObrigatorios": [],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": false,
		"executar": true,
		"testar": true,
		"revisar": false,
		"aprovar": false,
		"implantar": false
	},
	"ferramentasPermitidas": [],
	"comandosPermitidos": [],
	"comandosProibidos": [],
	"ambientesPermitidos": [
		"desenvolvimento",
		"teste"
	],
	"requerAprovacaoPara": [],
	"condicoesDeParada": [],
	"criteriosDeQualidade": [],
	"criteriosDeConclusao": [],
	"protocoloDeEntrega": {
		"exigeResumo": true,
		"exigeArquivosAlterados": true,
		"exigeTestes": true,
		"exigeRiscos": true,
		"exigePendencias": true
	},
	"modelo": {
		"provedor": "",
		"nome": "",
		"modo": "",
		"limiteContexto": 0
	},
	"datas": {
		"criacao": null,
		"ultimaAtualizacao": null
	}
}
```

---

# 7. AGENTE PLANEJADOR / ARQUITETO

## `planejador.json`

```json
{
	"id": "planejador-arquiteto",
	"nome": "Planejador / Arquiteto",
	"funcao": "planejamento",
	"descricao": "Responsável por transformar requisitos em planejamento técnico executável.",
	"estado": "ativo",
	"responsabilidades": [
		"Analisar requisitos",
		"Identificar ambiguidades",
		"Definir arquitetura",
		"Decompor funcionalidades",
		"Criar tarefas",
		"Definir dependências",
		"Definir critérios de aceitação",
		"Identificar riscos",
		"Criar decisões arquiteturais",
		"Planejar testes",
		"Planejar segurança",
		"Planejar implantação"
	],
	"diretoriosPermitidos": [
		"/.ia/**",
		"/docs/arquitetura/**"
	],
	"diretoriosProibidos": [
		"/frontend/**",
		"/backend/**",
		"/android/**",
		"/infraestrutura/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-arquitetura"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": false,
		"executar": false,
		"testar": false,
		"revisar": true,
		"aprovar": false,
		"implantar": false
	},
	"requerAprovacaoPara": [
		"alteracao_arquitetural"
	],
	"condicoesDeParada": [
		"requisito_ambiguo",
		"conflito_de_requisitos",
		"decisao_humana_necessaria"
	]
}
```

---

# 8. AGENTE FRONTEND

## `frontend.json`

```json
{
	"id": "frontend",
	"nome": "Frontend",
	"funcao": "desenvolvimento_frontend",
	"descricao": "Responsável pela interface web e integração com a API.",
	"estado": "ativo",
	"responsabilidades": [
		"Implementar interface",
		"Implementar comportamentos do navegador",
		"Integrar com API",
		"Validar entradas",
		"Tratar erros",
		"Implementar responsividade",
		"Implementar acessibilidade",
		"Aplicar segurança no navegador",
		"Executar testes"
	],
	"conhecimentos": [
		"HTML5",
		"CSS3",
		"JavaScript",
		"DOM",
		"Fetch",
		"JSON",
		"Responsividade",
		"Acessibilidade",
		"XSS",
		"Autenticação",
		"Autorização"
	],
	"diretoriosPermitidos": [
		"/frontend/**"
	],
	"diretoriosProibidos": [
		"/backend/**",
		"/android/**",
		"/banco/**",
		"/infraestrutura/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-frontend",
		"contrato-api",
		"contrato-seguranca",
		"contrato-interface"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": true,
		"executar": true,
		"testar": true,
		"revisar": false,
		"aprovar": false,
		"implantar": false
	},
	"ferramentasPermitidas": [
		"editor",
		"terminal",
		"git",
		"testes"
	],
	"condicoesDeParada": [
		"api_incompativel",
		"contrato_conflitante",
		"arquivo_fora_do_dominio",
		"requisito_ambiguo"
	]
}
```

---

# 9. AGENTE BACKEND

## `backend.json`

```json
{
	"id": "backend",
	"nome": "Backend",
	"funcao": "desenvolvimento_backend",
	"descricao": "Responsável pela API, regras de negócio, segurança e integração com banco.",
	"estado": "ativo",
	"responsabilidades": [
		"Implementar regras de negócio",
		"Implementar API REST",
		"Validar dados",
		"Tratar exceções",
		"Integrar banco",
		"Implementar testes",
		"Implementar registros",
		"Aplicar segurança"
	],
	"conhecimentos": [
		"Java",
		"Spring Boot",
		"Spring Data JPA",
		"Hibernate",
		"PostgreSQL",
		"API REST",
		"JSON",
		"DTO",
		"Validação",
		"Testes",
		"DDD",
		"Arquitetura Limpa",
		"SOLID",
		"GRASP",
		"Padrões de Projeto"
	],
	"diretoriosPermitidos": [
		"/backend/**"
	],
	"diretoriosProibidos": [
		"/frontend/**",
		"/android/**",
		"/infraestrutura/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-arquitetura",
		"contrato-api",
		"contrato-banco",
		"contrato-seguranca"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": true,
		"executar": true,
		"testar": true,
		"revisar": false,
		"aprovar": false,
		"implantar": false
	},
	"condicoesDeParada": [
		"mudanca_arquitetural",
		"alteracao_de_contrato",
		"alteracao_destrutiva",
		"risco_de_seguranca",
		"migracao_necessaria"
	]
}
```

---

# 10. AGENTE BANCO DE DADOS

## `banco.json`

```json
{
	"id": "banco",
	"nome": "Banco de Dados",
	"funcao": "banco_de_dados",
	"descricao": "Responsável pela estrutura, integridade e desempenho do banco.",
	"estado": "ativo",
	"responsabilidades": [
		"Modelar dados",
		"Criar migrações",
		"Definir relacionamentos",
		"Definir índices",
		"Preservar integridade",
		"Analisar consultas",
		"Analisar desempenho",
		"Aplicar segurança"
	],
	"conhecimentos": [
		"PostgreSQL",
		"Modelagem",
		"Normalização",
		"Índices",
		"Transações",
		"Concorrência",
		"Integridade",
		"Desempenho",
		"Migrações"
	],
	"diretoriosPermitidos": [
		"/banco/**"
	],
	"diretoriosProibidos": [
		"/frontend/**",
		"/android/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-banco",
		"contrato-seguranca"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": false,
		"executar": true,
		"testar": true,
		"revisar": false,
		"aprovar": false,
		"implantar": false
	},
	"requerAprovacaoPara": [
		"alteracao_destrutiva",
		"alteracao_producao"
	]
}
```

---

# 11. AGENTE ANDROID

## `android.json`

```json
{
	"id": "android",
	"nome": "Android",
	"funcao": "desenvolvimento_android",
	"descricao": "Responsável pelo aplicativo Android.",
	"estado": "ativo",
	"responsabilidades": [
		"Implementar aplicativo",
		"Integrar API",
		"Tratar permissões",
		"Implementar armazenamento seguro",
		"Implementar funcionalidades Android",
		"Executar testes",
		"Validar desempenho"
	],
	"conhecimentos": [
		"Kotlin",
		"Android",
		"Gradle",
		"Componentes Android",
		"Ciclo de Vida",
		"Corrotinas",
		"HTTP",
		"JSON",
		"API REST",
		"Autenticação",
		"Armazenamento Seguro",
		"Testes"
	],
	"diretoriosPermitidos": [
		"/android/**"
	],
	"diretoriosProibidos": [
		"/backend/**",
		"/frontend/**",
		"/banco/**",
		"/infraestrutura/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-android",
		"contrato-api",
		"contrato-seguranca",
		"contrato-interface"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": true,
		"executar": true,
		"testar": true,
		"revisar": false,
		"aprovar": false,
		"implantar": false
	}
}
```

---

# 12. AGENTE DE INFRAESTRUTURA

## `infraestrutura.json`

```json
{
	"id": "infraestrutura",
	"nome": "Infraestrutura",
	"funcao": "infraestrutura_implantacao",
	"descricao": "Responsável pela infraestrutura, contêineres, servidores e implantação.",
	"estado": "ativo",
	"responsabilidades": [
		"Configurar infraestrutura",
		"Configurar contêineres",
		"Configurar servidor",
		"Configurar rede",
		"Configurar HTTPS",
		"Implantar aplicações",
		"Executar cópias de segurança",
		"Executar restauração",
		"Monitorar infraestrutura",
		"Executar reversão"
	],
	"conhecimentos": [
		"Linux",
		"Docker",
		"Docker Compose",
		"Nginx",
		"HTTPS",
		"DNS",
		"Firewall",
		"VPS",
		"Segredos",
		"Cópias de Segurança",
		"Monitoramento"
	],
	"diretoriosPermitidos": [
		"/infraestrutura/**",
		"/implantacao/**"
	],
	"diretoriosProibidos": [
		"/frontend/**",
		"/android/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-infraestrutura",
		"contrato-seguranca"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": false,
		"executar": true,
		"testar": true,
		"revisar": false,
		"aprovar": false,
		"implantar": true
	},
	"requerAprovacaoPara": [
		"implantacao_producao",
		"alteracao_producao",
		"alteracao_rede_critica"
	]
}
```

---

# 13. AGENTE DE TESTES

## `testes.json`

```json
{
	"id": "testes",
	"nome": "Qualidade e Testes",
	"funcao": "qualidade_testes",
	"descricao": "Responsável por verificar se o sistema atende aos requisitos.",
	"estado": "ativo",
	"responsabilidades": [
		"Executar testes",
		"Criar testes",
		"Validar requisitos",
		"Validar critérios de aceitação",
		"Detectar regressões",
		"Validar contratos",
		"Validar segurança"
	],
	"tiposDeTeste": [
		"unitario",
		"integracao",
		"api",
		"contrato",
		"seguranca",
		"interface",
		"ponta_a_ponta",
		"regressao",
		"desempenho"
	],
	"diretoriosPermitidos": [
		"/testes/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-testes",
		"contrato-api",
		"contrato-seguranca"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": false,
		"executar": true,
		"testar": true,
		"revisar": true,
		"aprovar": false,
		"implantar": false
	}
}
```

---

# 14. AGENTE DE SEGURANÇA

## `seguranca.json`

```json
{
	"id": "seguranca",
	"nome": "Segurança",
	"funcao": "seguranca",
	"descricao": "Responsável pela análise transversal de segurança.",
	"estado": "ativo",
	"responsabilidades": [
		"Analisar entrada de dados",
		"Analisar exposição de dados",
		"Analisar dependências",
		"Analisar configuração",
		"Analisar código",
		"Analisar infraestrutura",
		"Registrar riscos"
	],
	"conhecimentos": [
		"XSS",
		"SQL Injection",
		"CORS",
		"Criptografia",
		"Gestão de Segredos",
		"Segurança de Dependências"
	],
	"diretoriosPermitidos": [
		"/.ia/**"
	],
	"diretoriosProibidos": [],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-seguranca"
	],
	"permissoes": {
		"ler": true,
		"criar": false,
		"alterar": false,
		"excluir": false,
		"executar": true,
		"testar": true,
		"revisar": true,
		"aprovar": false,
		"implantar": false
	},
	"requerAprovacaoPara": [
		"aceitacao_de_risco_critico"
	]
}
```

---

# 15. AGENTE REVISOR

## `revisor.json`

```json
{
	"id": "revisor",
	"nome": "Revisor de Código",
	"funcao": "revisao",
	"descricao": "Responsável por revisar alterações antes da integração.",
	"estado": "ativo",
	"responsabilidades": [
		"Revisar código",
		"Verificar arquitetura",
		"Verificar segurança",
		"Verificar testes",
		"Verificar contratos",
		"Detectar duplicação",
		"Detectar complexidade",
		"Registrar recomendações"
	],
	"criterios": [
		"correcao",
		"seguranca",
		"legibilidade",
		"arquitetura",
		"baixo_acoplamento",
		"alta_coesao",
		"testabilidade",
		"desempenho",
		"manutenibilidade"
	],
	"diretoriosPermitidos": [
		"/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-arquitetura",
		"contrato-seguranca",
		"contrato-testes"
	],
	"permissoes": {
		"ler": true,
		"criar": false,
		"alterar": false,
		"excluir": false,
		"executar": true,
		"testar": true,
		"revisar": true,
		"aprovar": false,
		"implantar": false
	}
}
```

---

# 16. AGENTE DE DOCUMENTAÇÃO

## `documentacao.json`

```json
{
	"id": "documentacao",
	"nome": "Documentação",
	"funcao": "documentacao",
	"descricao": "Responsável por manter a documentação sincronizada com o projeto.",
	"estado": "ativo",
	"responsabilidades": [
		"Documentar arquitetura",
		"Documentar API",
		"Documentar instalação",
		"Documentar configuração",
		"Documentar implantação",
		"Documentar decisões",
		"Documentar problemas",
		"Atualizar histórico"
	],
	"diretoriosPermitidos": [
		"/docs/**",
		"/README.md",
		"/CHANGELOG.md"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-documentacao"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": false,
		"executar": false,
		"testar": false,
		"revisar": false,
		"aprovar": false,
		"implantar": false
	}
}
```

---

# 17. AGENTE DE OBSERVABILIDADE

## `observabilidade.json`

```json
{
	"id": "observabilidade",
	"nome": "Observabilidade",
	"funcao": "observabilidade",
	"descricao": "Responsável por registros, métricas, monitoramento e diagnóstico.",
	"estado": "disponivel",
	"responsabilidades": [
		"Definir registros",
		"Definir métricas",
		"Definir verificações de saúde",
		"Definir alertas",
		"Analisar disponibilidade",
		"Analisar falhas",
		"Analisar desempenho"
	],
	"diretoriosPermitidos": [
		"/infraestrutura/**",
		"/docs/observabilidade/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-infraestrutura"
	],
	"permissoes": {
		"ler": true,
		"criar": true,
		"alterar": true,
		"excluir": false,
		"executar": true,
		"testar": true,
		"revisar": true,
		"aprovar": false,
		"implantar": false
	}
}
```

---

# 18. AGENTE DE DESEMPENHO

## `desempenho.json`

```json
{
	"id": "desempenho",
	"nome": "Desempenho",
	"funcao": "desempenho",
	"descricao": "Responsável por identificar e reduzir gargalos.",
	"estado": "disponivel",
	"responsabilidades": [
		"Analisar tempo de resposta",
		"Analisar consumo de memória",
		"Analisar processamento",
		"Analisar consultas",
		"Analisar rede",
		"Analisar carregamento",
		"Identificar gargalos",
		"Propor melhorias"
	],
	"diretoriosPermitidos": [
		"/**"
	],
	"contratosObrigatorios": [
		"contrato-projeto",
		"contrato-arquitetura"
	],
	"permissoes": {
		"ler": true,
		"criar": false,
		"alterar": false,
		"excluir": false,
		"executar": true,
		"testar": true,
		"revisar": true,
		"aprovar": false,
		"implantar": false
	}
}
```

---

# 19. REGISTRO DOS CONTRATOS

## `contratos.json`

```json
{
	"contratos": [
		{
			"id": "contrato-projeto",
			"nome": "Contrato do Projeto",
			"arquivo": "/.ia/contratos/contrato-projeto.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-arquitetura",
			"nome": "Contrato da Arquitetura",
			"arquivo": "/.ia/contratos/contrato-arquitetura.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-api",
			"nome": "Contrato da API",
			"arquivo": "/.ia/contratos/contrato-api.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-banco",
			"nome": "Contrato do Banco",
			"arquivo": "/.ia/contratos/contrato-banco.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-frontend",
			"nome": "Contrato do Frontend",
			"arquivo": "/.ia/contratos/contrato-frontend.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-android",
			"nome": "Contrato do Android",
			"arquivo": "/.ia/contratos/contrato-android.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-seguranca",
			"nome": "Contrato de Segurança",
			"arquivo": "/.ia/contratos/contrato-seguranca.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-infraestrutura",
			"nome": "Contrato de Infraestrutura",
			"arquivo": "/.ia/contratos/contrato-infraestrutura.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-testes",
			"nome": "Contrato de Testes",
			"arquivo": "/.ia/contratos/contrato-testes.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-documentacao",
			"nome": "Contrato de Documentação",
			"arquivo": "/.ia/contratos/contrato-documentacao.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		},
		{
			"id": "contrato-interface",
			"nome": "Contrato da Interface",
			"arquivo": "/.ia/contratos/contrato-interface.json",
			"versao": "1.0.0",
			"estado": "ativo",
			"obrigatorio": true
		}
	]
}
```

---

# 20. MODELO DE CONTRATO

## `modelo-contrato.json`

```json
{
	"id": "contrato-exemplo",
	"nome": "Contrato de Exemplo",
	"descricao": "Define regras para determinado domínio.",
	"versao": "1.0.0",
	"estado": "ativo",
	"obrigatorio": true,
	"aplicavelA": [
		"frontend",
		"backend"
	],
	"objetivo": "",
	"escopo": [],
	"regras": [],
	"restricoes": [],
	"padroesObrigatorios": [],
	"padroesProibidos": [],
	"dependencias": [],
	"criteriosValidacao": [],
	"condicoesDeExcecao": [],
	"requerAprovacaoPara": [],
	"historico": [
		{
			"versao": "1.0.0",
			"data": null,
			"alteracao": "Criação"
		}
	]
}
```

---

# 21. CONTRATO DO PROJETO

## `contrato-projeto.json`

```json
{
	"id": "contrato-projeto",
	"nome": "Contrato do Projeto",
	"versao": "1.0.0",
	"estado": "ativo",
	"objetivo": "Definir as regras gerais que todos os agentes devem obedecer.",
	"regras": [
		"Todo agente deve conhecer sua função.",
		"Todo agente deve respeitar seu domínio.",
		"Todo agente deve respeitar os contratos.",
		"Todo agente deve executar somente tarefas autorizadas.",
		"Todo agente deve respeitar as regras de segurança.",
		"Todo agente deve registrar sua entrega.",
		"Alterações críticas exigem aprovação humana.",
		"Segredos nunca devem ser armazenados no código.",
		"Alterações devem ser rastreáveis.",
		"Uma tarefa somente pode ser concluída após atender seus critérios de conclusão."
	],
	"padroes": [
		"DDD",
		"Arquitetura Limpa",
		"Arquitetura em Camadas",
		"SOLID",
		"GRASP",
		"Padrões de Projeto"
	],
	"politicas": [
		"politica-seguranca",
		"politica-git",
		"politica-qualidade",
		"politica-permissoes",
		"politica-mudancas"
	]
}
```

---

# 22. CONTRATO DA API

## `contrato-api.json`

```json
{
	"id": "contrato-api",
	"nome": "Contrato da API",
	"versao": "1.0.0",
	"estado": "ativo",
	"objetivo": "Definir a comunicação entre os sistemas consumidores e o backend.",
	"padrao": "API REST",
	"formato": "JSON",
	"regras": [
		"Todas as respostas devem possuir formato definido.",
		"Todos os dados recebidos devem ser validados.",
		"Erros devem utilizar códigos HTTP apropriados.",
		"Contratos incompatíveis exigem nova versão.",
		"Dados sensíveis nunca devem ser retornados desnecessariamente."
	],
	"componentes": [
		"enderecos",
		"metodos",
		"cabecalhos",
		"requisicoes",
		"respostas",
		"erros",
		"paginacao",
		"filtros",
		"ordenacao",
		"versionamento",
		"limites"
	],
	"consumidores": [
		"frontend",
		"android"
	],
	"provedor": "backend"
}
```

---

# 23. CONTRATO DE SEGURANÇA

## `contrato-seguranca.json`

```json
{
	"id": "contrato-seguranca",
	"nome": "Contrato de Segurança",
	"versao": "1.0.0",
	"estado": "ativo",
	"objetivo": "Definir requisitos mínimos de segurança.",
	"principios": [
		"Defesa em profundidade",
		"Menor privilégio",
		"Validação de entrada",
		"Segurança desde o início",
		"Não confiar no cliente",
		"Segredos fora do código"
	],
	"controles": [
		"XSS",
		"SQL Injection",
		"CORS",
		"Criptografia",
		"Gestão de segredos",
		"Auditoria"
	],
	"requerAprovacaoPara": [
		"aceitacao_de_risco_critico",
		"alteracao_de_criptografia"
	]
}
```

---

# 24. MODELO DE TAREFA

## `modelo-tarefa.json`

```json
{
	"id": "TAREFA-0001",
	"titulo": "Título da tarefa",
	"descricao": "Descrição detalhada.",
	"objetivo": "Objetivo da tarefa.",
	"tipo": "desenvolvimento",
	"estado": "rascunho",
	"prioridade": "media",
	"agenteResponsavel": "frontend",
	"dominio": "frontend",
	"ambiente": "desenvolvimento",
	"dependencias": [],
	"contratosObrigatorios": [],
	"procedimentosObrigatorios": [],
	"arquivosPermitidos": [],
	"arquivosProibidos": [],
	"contextoNecessario": [],
	"criteriosAceitacao": [],
	"testesObrigatorios": [],
	"riscos": [],
	"restricoes": [],
	"condicoesDeParada": [],
	"criteriosConclusao": [
		"Implementação concluída",
		"Critérios de aceitação atendidos",
		"Testes aprovados",
		"Segurança verificada",
		"Contratos respeitados",
		"Documentação atualizada",
		"Revisão realizada"
	],
	"resultado": {
		"resumo": "",
		"arquivosAlterados": [],
		"testesExecutados": [],
		"testesAprovados": [],
		"riscosEncontrados": [],
		"pendencias": [],
		"observacoes": "",
		"commit": ""
	},
	"aprovacao": {
		"necessaria": false,
		"estado": "nao_solicitada",
		"aprovador": "",
		"data": null,
		"observacao": ""
	},
	"datas": {
		"criacao": null,
		"inicio": null,
		"ultimaAtualizacao": null,
		"conclusao": null
	}
}
```

---

# 25. REGISTRO DAS TAREFAS

## `tarefas.json`

```json
{
	"tarefas": [],
	"estatisticas": {
		"total": 0,
		"rascunho": 0,
		"planejadas": 0,
		"prontas": 0,
		"emExecucao": 0,
		"emTeste": 0,
		"emRevisao": 0,
		"aguardandoAprovacao": 0,
		"concluidas": 0,
		"bloqueadas": 0,
		"canceladas": 0,
		"rejeitadas": 0
	}
}
```

---

# 26. ESTADO ATUAL DO PROJETO

## `estado-atual.json`

```json
{
	"projetoId": "projeto-principal",
	"estado": "em_desenvolvimento",
	"fase": "desenvolvimento",
	"versao": "1.0.0",
	"tarefaAtual": "",
	"agentesAtivos": [],
	"tarefasAtivas": [],
	"tarefasBloqueadas": [],
	"ultimasAlteracoes": [],
	"problemasConhecidos": [],
	"riscosAtivos": [],
	"decisoesRecentes": [],
	"contratosAlterados": [],
	"testes": {
		"total": 0,
		"aprovados": 0,
		"reprovados": 0
	},
	"qualidade": {
		"percentual": 0,
		"pendenciasCriticas": 0
	},
	"seguranca": {
		"estado": "nao_avaliada",
		"riscosCriticos": 0,
		"riscosAltos": 0
	},
	"ultimaAtualizacao": null
}
```

---

# 27. PROGRESSO

## `progresso.json`

```json
{
	"projeto": {
		"percentual": 0,
		"tarefasConcluidas": 0,
		"tarefasTotais": 0
	},
	"areas": {
		"planejamento": {
			"percentual": 0
		},
		"frontend": {
			"percentual": 0
		},
		"backend": {
			"percentual": 0
		},
		"banco": {
			"percentual": 0
		},
		"android": {
			"percentual": 0
		},
		"infraestrutura": {
			"percentual": 0
		},
		"testes": {
			"percentual": 0
		},
		"seguranca": {
			"percentual": 0
		},
		"documentacao": {
			"percentual": 0
		}
	}
}
```

---

# 28. BLOQUEIOS

## `bloqueios.json`

```json
{
	"bloqueios": [
		{
			"id": "BLOQUEIO-0001",
			"tarefaId": "TAREFA-0001",
			"tipo": "dependencia",
			"gravidade": "media",
			"descricao": "Descrição do bloqueio.",
			"origem": "",
			"responsavelResolucao": "",
			"estado": "aberto",
			"criadoEm": null,
			"resolvidoEm": null
		}
	]
}
```

---

# 29. DECISÕES ARQUITETURAIS

## `decisoes.json`

```json
{
	"decisoes": [
		{
			"id": "DECISAO-0001",
			"titulo": "Título da decisão",
			"estado": "aprovada",
			"data": null,
			"problema": "",
			"contexto": "",
			"alternativas": [],
			"decisao": "",
			"justificativa": "",
			"impactos": [],
			"consequencias": [],
			"tarefasRelacionadas": [],
			"contratosAfetados": [],
			"aprovacao": {
				"necessaria": true,
				"aprovadoPor": "",
				"data": null
			}
		}
	]
}
```

---

# 30. RISCOS

## `riscos.json`

```json
{
	"riscos": [
		{
			"id": "RISCO-0001",
			"titulo": "Descrição do risco",
			"descricao": "",
			"categoria": "tecnica",
			"probabilidade": "media",
			"impacto": "alto",
			"gravidade": "alta",
			"causa": "",
			"consequencias": [],
			"mitigacao": [],
			"responsavel": "",
			"tarefasRelacionadas": [],
			"estado": "aberto",
			"criadoEm": null,
			"resolvidoEm": null
		}
	]
}
```

---

# 31. PROBLEMAS CONHECIDOS

## `problemas.json`

```json
{
	"problemas": [
		{
			"id": "PROBLEMA-0001",
			"titulo": "Título do problema",
			"descricao": "",
			"categoria": "tecnica",
			"gravidade": "media",
			"impacto": "medio",
			"estado": "aberto",
			"naoCorrigirAutomaticamente": false,
			"responsavel": "",
			"tarefasRelacionadas": [],
			"solucaoConhecida": "",
			"criadoEm": null,
			"resolvidoEm": null
		}
	]
}
```

---

# 32. BASE DE CONHECIMENTO

## `conhecimento.json`

```json
{
	"itens": [
		{
			"id": "CONHECIMENTO-0001",
			"titulo": "Título",
			"categoria": "arquitetura",
			"descricao": "",
			"conteudo": "",
			"palavrasChave": [],
			"agentesAplicaveis": [],
			"contratosRelacionados": [],
			"tarefasRelacionadas": [],
			"estado": "ativo",
			"versao": "1.0.0",
			"criadoEm": null,
			"atualizadoEm": null
		}
	]
}
```

---

# 33. PROCEDIMENTOS

## `procedimentos.json`

```json
{
	"procedimentos": [
		{
			"id": "PROCEDIMENTO-0001",
			"nome": "Implementar Tarefa",
			"descricao": "Procedimento padrão para implementação.",
			"estado": "ativo",
			"versao": "1.0.0",
			"aplicavelA": [
				"frontend",
				"backend",
				"android"
			],
			"etapas": [
				"Consultar contratos",
				"Consultar estado",
				"Verificar dependências",
				"Inspecionar arquivos",
				"Implementar",
				"Testar",
				"Validar",
				"Entregar"
			],
			"criteriosConclusao": []
		}
	]
}
```

---

# 34. PERMISSÕES

## `permissoes.json`

```json
{
	"permissoes": [
		"ler",
		"criar",
		"alterar",
		"excluir",
		"executar",
		"testar",
		"revisar",
		"aprovar",
		"implantar"
	],
	"perfis": [
		{
			"id": "proprietario",
			"nome": "Proprietário do Projeto",
			"permissoes": [
				"ler",
				"criar",
				"alterar",
				"excluir",
				"executar",
				"testar",
				"revisar",
				"aprovar",
				"implantar"
			]
		},
		{
			"id": "agente",
			"nome": "Agente",
			"permissoes": [
				"ler",
				"criar",
				"alterar",
				"executar",
				"testar"
			]
		},
		{
			"id": "revisor",
			"nome": "Revisor",
			"permissoes": [
				"ler",
				"testar",
				"revisar"
			]
		}
	]
}
```

---

# 35. FERRAMENTAS

## `ferramentas.json`

```json
{
	"ferramentas": [
		{
			"id": "editor",
			"nome": "Editor de Arquivos",
			"tipo": "desenvolvimento",
			"descricao": "Permite ler e alterar arquivos.",
			"permissoes": [
				"ler",
				"criar",
				"alterar"
			]
		},
		{
			"id": "terminal",
			"nome": "Terminal",
			"tipo": "sistema",
			"descricao": "Permite executar comandos autorizados.",
			"permissoes": [
				"executar"
			],
			"requerRestricao": true
		},
		{
			"id": "git",
			"nome": "Git",
			"tipo": "controle_versao",
			"descricao": "Permite consultar e registrar alterações.",
			"permissoes": [
				"ler",
				"criar",
				"alterar"
			]
		},
		{
			"id": "testes",
			"nome": "Executador de Testes",
			"tipo": "qualidade",
			"descricao": "Executa testes autorizados.",
			"permissoes": [
				"executar",
				"testar"
			]
		}
	]
}
```

---

# 36. CONTEXTO DO AGENTE

## `contextos.json`

```json
{
	"contextos": [
		{
			"id": "CONTEXTO-0001",
			"agenteId": "frontend",
			"tarefaId": "TAREFA-0001",
			"versao": "1.0.0",
			"contratos": [
				"contrato-projeto",
				"contrato-frontend",
				"contrato-api",
				"contrato-seguranca"
			],
			"arquivos": [
				"/frontend/**",
				"/docs/api/**"
			],
			"decisoes": [],
			"conhecimento": [],
			"estado": "/.ia/estado/estado-atual.json",
			"restricoes": [],
			"criteriosAceitacao": [],
			"geradoEm": null
		}
	]
}
```

---

# 37. CRITÉRIOS DE QUALIDADE

## `criterios.json`

```json
{
	"criterios": [
		{
			"id": "correcao",
			"nome": "Correção",
			"descricao": "A implementação atende ao comportamento especificado.",
			"obrigatorio": true
		},
		{
			"id": "seguranca",
			"nome": "Segurança",
			"descricao": "A implementação respeita os requisitos de segurança.",
			"obrigatorio": true
		},
		{
			"id": "testabilidade",
			"nome": "Testabilidade",
			"descricao": "A implementação pode ser validada por testes.",
			"obrigatorio": true
		},
		{
			"id": "manutenibilidade",
			"nome": "Manutenibilidade",
			"descricao": "O código pode ser mantido e evoluído.",
			"obrigatorio": true
		},
		{
			"id": "arquitetura",
			"nome": "Arquitetura",
			"descricao": "A implementação respeita a arquitetura definida.",
			"obrigatorio": true
		}
	]
}
```

---

# 38. TESTES

## `testes.json`

```json
{
	"testes": [
		{
			"id": "TESTE-0001",
			"tarefaId": "TAREFA-0001",
			"nome": "Teste de exemplo",
			"tipo": "integracao",
			"descricao": "",
			"comando": "",
			"resultadoEsperado": "",
			"resultadoObtido": "",
			"estado": "nao_executado",
			"obrigatorio": true,
			"executadoEm": null,
			"duracao": 0,
			"mensagemErro": ""
		}
	]
}
```

---

# 39. REVISÕES

## `revisoes.json`

```json
{
	"revisoes": [
		{
			"id": "REVISAO-0001",
			"tarefaId": "TAREFA-0001",
			"agenteRevisor": "revisor",
			"estado": "pendente",
			"arquivosAnalisados": [],
			"pontosPositivos": [],
			"problemas": [],
			"recomendacoes": [],
			"criterios": {
				"correcao": "pendente",
				"seguranca": "pendente",
				"arquitetura": "pendente",
				"testes": "pendente",
				"manutenibilidade": "pendente"
			},
			"resultado": "",
			"criadoEm": null,
			"concluidoEm": null
		}
	]
}
```

---

# 40. ESTADO DO GIT

## `estado-git.json`

```json
{
	"repositorio": {
		"caminho": "",
		"ramoAtual": "",
		"estado": "limpo",
		"ultimoCommit": {
			"identificador": "",
			"mensagem": "",
			"autor": "",
			"data": null
		}
	},
	"alteracoes": {
		"arquivosModificados": [],
		"arquivosCriados": [],
		"arquivosExcluidos": []
	},
	"conflitos": [],
	"tarefasRelacionadas": [],
	"ultimaVerificacao": null
}
```

---

# 41. AUDITORIA

## `eventos.json`

```json
{
	"eventos": [
		{
			"id": "EVENTO-0001",
			"tipo": "tarefa_criada",
			"origem": "gerenciador",
			"agenteId": "",
			"usuarioId": "",
			"tarefaId": "",
			"descricao": "",
			"dados": {},
			"resultado": "sucesso",
			"data": null
		}
	]
}
```

---

# 42. MODELO DE ENTREGA DO AGENTE

## `resultado-tarefa.json`

```json
{
	"tarefaId": "TAREFA-0001",
	"agenteId": "frontend",
	"estado": "concluida",
	"resumo": "Resumo da implementação.",
	"implementacoes": [],
	"arquivosAlterados": [
		{
			"caminho": "/frontend/exemplo.js",
			"operacao": "alterado",
			"descricao": ""
		}
	],
	"testes": {
		"executados": [],
		"aprovados": 0,
		"reprovados": 0
	},
	"seguranca": {
		"verificada": true,
		"problemas": []
	},
	"contratos": {
		"respeitados": true,
		"violacoes": []
	},
	"documentacao": {
		"atualizada": true,
		"arquivos": []
	},
	"riscos": [],
	"pendencias": [],
	"observacoes": [],
	"commit": {
		"identificador": "",
		"mensagem": ""
	},
	"data": null
}
```

---

# 43. APROVAÇÕES

## `aprovacoes.json`

```json
{
	"aprovacoes": [
		{
			"id": "APROVACAO-0001",
			"tipo": "alteracao_arquitetural",
			"tarefaId": "TAREFA-0001",
			"solicitante": "backend",
			"responsavel": "proprietario",
			"estado": "aguardando",
			"motivo": "",
			"impacto": "",
			"riscos": [],
			"alteracoes": [],
			"decisao": "",
			"observacao": "",
			"solicitadaEm": null,
			"respondidaEm": null
		}
	]
}
```

---

# 44. CONFLITOS

## `conflitos.json`

```json
{
	"conflitos": [
		{
			"id": "CONFLITO-0001",
			"tipo": "arquivos_compartilhados",
			"estado": "aberto",
			"agentes": [
				"frontend",
				"backend"
			],
			"tarefas": [
				"TAREFA-0001",
				"TAREFA-0002"
			],
			"arquivos": [],
			"descricao": "",
			"impacto": "medio",
			"resolucao": "",
			"responsavelResolucao": "",
			"criadoEm": null,
			"resolvidoEm": null
		}
	]
}
```

---

# 45. POLÍTICAS

## `politicas.json`

```json
{
	"politicas": [
		{
			"id": "politica-seguranca",
			"nome": "Política de Segurança",
			"versao": "1.0.0",
			"arquivo": "/.ia/politicas/politica-seguranca.json",
			"estado": "ativo"
		},
		{
			"id": "politica-git",
			"nome": "Política do Git",
			"versao": "1.0.0",
			"arquivo": "/.ia/politicas/politica-git.json",
			"estado": "ativo"
		},
		{
			"id": "politica-qualidade",
			"nome": "Política de Qualidade",
			"versao": "1.0.0",
			"arquivo": "/.ia/politicas/politica-qualidade.json",
			"estado": "ativo"
		},
		{
			"id": "politica-permissoes",
			"nome": "Política de Permissões",
			"versao": "1.0.0",
			"arquivo": "/.ia/politicas/politica-permissoes.json",
			"estado": "ativo"
		},
		{
			"id": "politica-mudancas",
			"nome": "Política de Mudanças",
			"versao": "1.0.0",
			"arquivo": "/.ia/politicas/politica-mudancas.json",
			"estado": "ativo"
		}
	]
}
```

---

# 46. MODELO DE POLÍTICA

## `modelo-politica.json`

```json
{
	"id": "politica-exemplo",
	"nome": "Política de Exemplo",
	"descricao": "",
	"versao": "1.0.0",
	"estado": "ativo",
	"objetivo": "",
	"regras": [],
	"proibicoes": [],
	"excecoes": [],
	"requerAprovacaoPara": [],
	"agentesAplicaveis": [],
	"ambientesAplicaveis": [],
	"consequenciasViolacao": [],
	"historico": []
}
```

---

# 47. MODELO DE PROTOCOLO DE EXECUÇÃO

## `protocolo-execucao.json`

```json
{
	"id": "protocolo-execucao",
	"versao": "1.0.0",
	"etapas": [
		{
			"ordem": 1,
			"nome": "Receber tarefa",
			"obrigatorio": true
		},
		{
			"ordem": 2,
			"nome": "Ler contratos",
			"obrigatorio": true
		},
		{
			"ordem": 3,
			"nome": "Ler estado",
			"obrigatorio": true
		},
		{
			"ordem": 4,
			"nome": "Verificar dependências",
			"obrigatorio": true
		},
		{
			"ordem": 5,
			"nome": "Inspecionar arquivos",
			"obrigatorio": true
		},
		{
			"ordem": 6,
			"nome": "Planejar execução",
			"obrigatorio": true
		},
		{
			"ordem": 7,
			"nome": "Implementar",
			"obrigatorio": true
		},
		{
			"ordem": 8,
			"nome": "Executar testes",
			"obrigatorio": true
		},
		{
			"ordem": 9,
			"nome": "Validar segurança",
			"obrigatorio": true
		},
		{
			"ordem": 10,
			"nome": "Validar contratos",
			"obrigatorio": true
		},
		{
			"ordem": 11,
			"nome": "Documentar",
			"obrigatorio": true
		},
		{
			"ordem": 12,
			"nome": "Entregar resultado",
			"obrigatorio": true
		}
	]
}
```

---

# 48. MODELO DE CRITÉRIO DE CONCLUSÃO

## `criterio-conclusao.json`

```json
{
	"id": "criterio-conclusao-padrao",
	"nome": "Critério de Conclusão Padrão",
	"versao": "1.0.0",
	"criterios": [
		{
			"id": "implementacao",
			"descricao": "Implementação concluída.",
			"obrigatorio": true
		},
		{
			"id": "aceitacao",
			"descricao": "Critérios de aceitação atendidos.",
			"obrigatorio": true
		},
		{
			"id": "testes",
			"descricao": "Testes obrigatórios aprovados.",
			"obrigatorio": true
		},
		{
			"id": "seguranca",
			"descricao": "Segurança verificada.",
			"obrigatorio": true
		},
		{
			"id": "contratos",
			"descricao": "Contratos respeitados.",
			"obrigatorio": true
		},
		{
			"id": "documentacao",
			"descricao": "Documentação atualizada.",
			"obrigatorio": true
		},
		{
			"id": "revisao",
			"descricao": "Revisão realizada.",
			"obrigatorio": true
		},
		{
			"id": "pendencias",
			"descricao": "Nenhuma pendência crítica aberta.",
			"obrigatorio": true
		}
	]
}
```

---

# 49. MAPA DE DEPENDÊNCIAS ENTRE ÁREAS

## `dependencias-areas.json`

```json
{
	"dependencias": [
		{
			"origem": "frontend",
			"dependeDe": [
				"backend",
				"contrato-api"
			]
		},
		{
			"origem": "android",
			"dependeDe": [
				"backend",
				"contrato-api"
			]
		},
		{
			"origem": "backend",
			"dependeDe": [
				"banco",
				"contrato-arquitetura",
				"contrato-seguranca"
			]
		},
		{
			"origem": "implantacao",
			"dependeDe": [
				"backend",
				"frontend",
				"testes",
				"seguranca"
			]
		},
		{
			"origem": "documentacao",
			"dependeDe": [
				"todos"
			]
		}
	]
}
```

---

# 50. MAPA DE RESPONSABILIDADES

## `responsabilidades.json`

```json
{
	"areas": [
		{
			"area": "planejamento",
			"agentePrincipal": "planejador-arquiteto",
			"agentesApoio": [
				"seguranca",
				"desempenho"
			]
		},
		{
			"area": "frontend",
			"agentePrincipal": "frontend",
			"agentesApoio": [
				"testes",
				"seguranca",
				"revisor"
			]
		},
		{
			"area": "backend",
			"agentePrincipal": "backend",
			"agentesApoio": [
				"banco",
				"testes",
				"seguranca",
				"revisor"
			]
		},
		{
			"area": "android",
			"agentePrincipal": "android",
			"agentesApoio": [
				"testes",
				"seguranca",
				"revisor"
			]
		},
		{
			"area": "infraestrutura",
			"agentePrincipal": "infraestrutura",
			"agentesApoio": [
				"seguranca",
				"observabilidade"
			]
		},
		{
			"area": "documentacao",
			"agentePrincipal": "documentacao",
			"agentesApoio": [
				"todos"
			]
		}
	]
}
```

---

# 51. MAPA DE FLUXO DE DESENVOLVIMENTO

## `fluxo-desenvolvimento.json`

```json
{
	"fluxo": [
		{
			"ordem": 1,
			"etapa": "necessidade",
			"responsavel": "proprietario"
		},
		{
			"ordem": 2,
			"etapa": "planejamento",
			"responsavel": "planejador-arquiteto"
		},
		{
			"ordem": 3,
			"etapa": "arquitetura",
			"responsavel": "planejador-arquiteto"
		},
		{
			"ordem": 4,
			"etapa": "contratos",
			"responsavel": "planejador-arquiteto"
		},
		{
			"ordem": 5,
			"etapa": "tarefas",
			"responsavel": "planejador-arquiteto"
		},
		{
			"ordem": 6,
			"etapa": "implementacao",
			"responsavel": "agente_especializado"
		},
		{
			"ordem": 7,
			"etapa": "testes",
			"responsavel": "testes"
		},
		{
			"ordem": 8,
			"etapa": "seguranca",
			"responsavel": "seguranca"
		},
		{
			"ordem": 9,
			"etapa": "revisao",
			"responsavel": "revisor"
		},
		{
			"ordem": 10,
			"etapa": "aprovacao",
			"responsavel": "proprietario"
		},
		{
			"ordem": 11,
			"etapa": "integracao",
			"responsavel": "git"
		},
		{
			"ordem": 12,
			"etapa": "documentacao",
			"responsavel": "documentacao"
		},
		{
			"ordem": 13,
			"etapa": "atualizacao_estado",
			"responsavel": "gerenciador"
		}
	]
}
```

---

# 52. MODELO DE APRESENTAÇÃO PARA A INTERFACE

O JSON não deve ser criado apenas pensando nos agentes.

O gerenciador também precisa conseguir montar a interface.

Por isso, os objetos devem possuir:

```text id
nome
descricao
estado
versao
data
responsavel
relacionamentos
```

Esses campos permitem construir telas como:

```text
PAINEL
├── Projetos
├── Agentes
├── Tarefas
├── Contratos
├── Estado
├── Dependências
├── Riscos
├── Problemas
├── Decisões
├── Testes
├── Revisões
├── Git
├── Auditoria
└── Configurações
```

---

# 53. PAINEL DO PROJETO

O gerenciador poderá montar:

```text
Projeto
├── Nome
├── Versão
├── Estado
├── Progresso
├── Tarefas
├── Agentes
├── Riscos
├── Problemas
├── Testes
├── Segurança
├── Git
└── Últimas atividades
```

A fonte de dados será:

```text
projeto.json
estado-atual.json
progresso.json
tarefas.json
agentes.json
riscos.json
problemas.json
estado-git.json
eventos.json
```

---

# 54. PAINEL DE AGENTES

A interface poderá mostrar:

```text
Agente
├── Nome
├── Função
├── Estado
├── Modelo
├── Tarefas
├── Progresso
├── Domínio
├── Permissões
├── Ferramentas
├── Contratos
├── Última atividade
└── Problemas
```

Fonte:

```text
agentes.json
perfil-do-agente.json
tarefas.json
permissoes.json
ferramentas.json
eventos.json
```

---

# 55. PAINEL DE TAREFAS

Mostrar:

```text
Tarefa
├── Identificador
├── Título
├── Estado
├── Prioridade
├── Agente
├── Dependências
├── Progresso
├── Critérios
├── Testes
├── Revisão
├── Aprovação
└── Resultado
```

Fonte:

```text
tarefas.json
resultado-tarefa.json
testes.json
revisoes.json
aprovacoes.json
```

---

# 56. PAINEL DE SEGURANÇA

Mostrar:

```text
Segurança
├── Estado
├── Riscos críticos
├── Riscos altos
├── Problemas
├── Revisões
├── Violações
└── Última análise
```

Fonte:

```text
contrato-seguranca.json
riscos.json
problemas.json
revisoes.json
eventos.json
```

---

# 57. PAINEL DE QUALIDADE

Mostrar:

```text
Qualidade
├── Testes totais
├── Aprovados
├── Reprovados
├── Cobertura
├── Revisões
├── Pendências
└── Estado geral
```

Fonte:

```text
testes.json
revisoes.json
criterios.json
estado-atual.json
```

---

# 58. PAINEL DE AUDITORIA

Mostrar:

```text
Data
Agente
Tarefa
Evento
Arquivo
Resultado
```

Fonte:

```text
eventos.json
```

---

# 59. REGRA IMPORTANTE SOBRE OS JSON

Esses JSON **não devem necessariamente ser a única fonte de verdade do sistema inteiro**.

Na primeira versão local, eles podem funcionar muito bem como arquivos de configuração e estado compartilhado.

Mas, conforme o gerenciador crescer, o ideal será separar:

```text
CONFIGURAÇÃO
      ↓
arquivos JSON

DOCUMENTAÇÃO
      ↓
Markdown

CÓDIGO
      ↓
Git

DADOS OPERACIONAIS
      ↓
banco de dados local

HISTÓRICO
      ↓
Git + auditoria

CONTEXTO TEMPORÁRIO
      ↓
arquivos de execução
```

Isso evita transformar um único conjunto de JSON em um banco de dados improvisado.

---

# 60. PRINCÍPIO FINAL DOS MODELOS

A estrutura inteira passa a obedecer:

```text
PROJETO
│
├── CONFIGURAÇÃO
├── AGENTES
├── CONTRATOS
├── TAREFAS
├── ESTADO
├── DECISÕES
├── RISCOS
├── PROBLEMAS
├── CONHECIMENTO
├── PROCEDIMENTOS
├── PERMISSÕES
├── FERRAMENTAS
├── CONTEXTO
├── QUALIDADE
├── GIT
└── AUDITORIA
```

E cada informação possui:

```text
IDENTIFICADOR
NOME
ESTADO
VERSÃO
RESPONSÁVEL
RELACIONAMENTOS
DATA
```

quando aplicável.

O resultado é uma estrutura que pode ser lida tanto por **agentes de IA** quanto pelo **Gerenciador Local**, permitindo que a interface seja construída sobre esses mesmos dados sem precisar duplicar manualmente as informações.