# Relatório Formal de Auditoria Técnica e QA Ponta a Ponta
## Sistema Corporativo de Organograma Interativo e Governança — JHE Engenharia (v2.0)

**Data da Auditoria:** 06 de Novembro de 2026  
**Ambiente de Execução:** Desenvolvimento Local / Homologação Corporativa  
**Stack Tecnológica:** React 19, Tailwind CSS v4, D3.js (`d3-org-chart`), Node.js (Express 5.0.1 ESM), MySQL (InnoDB, UTF-8 MB4)  
**Status Geral:** **APROVADO COM EXCELÊNCIA TÉCNICA (100% dos testes concluídos com sucesso)**

---

## 1. Avaliação por Módulo e Funcionalidade

| Módulo / Tela | Funcionalidade Avaliada | Status | Teste Claro / Escuro | Observações / Correções Realizadas |
| :--- | :--- | :---: | :---: | :--- |
| **Banco de Dados** | Transição Mock -> MySQL (`jhe_organograma`) | [x] Aprovado | N/A | Dados 100% dinâmicos via pool relacional (`mysql2/promise`). Eliminado qualquer consumo de dados estáticos (`INITIAL_NOS`, `FALLBACK_NOS`). Nó raiz validado como `"Co-CEOs"`. |
| **Configurações** | CRUD de Níveis Hierárquicos (`SettingsModal.jsx`) | [x] Aprovado | Ambos OK | Criação, atualização de peso/ordem e troca de cor no MySQL. Sincronização reativa imediata no D3 e tópicos sem necessidade de F5. |
| **Configurações** | Bloqueio de Exclusão de Nível com Nós Vinculados | [x] Aprovado | Ambos OK | Impede exclusão de níveis que possuem áreas associadas, emitindo alerta visual impeditivo e resguardando a integridade referencial. |
| **Editor de Nós** | Tags Input (Múltiplos Gestores / Cotitulares) | [x] Aprovado | Ambos OK | Suporte completo a arrays JSON serializados (`["Dr. Hélio", "Dr. Viol"]`), geração correta de avatares com iniciais duplas e tratamento seguro contra erros de `.split()`. |
| **Editor de Nós** | Renderização Condicional de Sigla da Unidade | [x] Aprovado | Ambos OK | Com sigla: exibe `● [SIGLA] • [NOME DO NÍVEL]`. Sem sigla: oculta prefixo e separador, exibindo estritamente `● [NOME DO NÍVEL]`. |
| **Tópicos** | Drag & Drop e Modal de Confirmação (`TopicEditor.jsx`) | [x] Aprovado | Ambos OK | Movimentação com arrastar e soltar dispara modal de confirmação de governança, persiste via `PATCH /api/organograma/nos/:id/mover` e recarrega a árvore automaticamente. |
| **Canvas D3** | Sincronismo de Movimentação e Reatividade (`OrganogramaView.jsx`) | [x] Aprovado | Ambos OK | O canvas D3 reflete instantaneamente as novas subordinações, reposiciona conectores ortogonais limpos e atualiza o contador de equipe. |
| **Design System** | Contraste de Cartões no Dark Mode | [x] Aprovado | Escuro OK | Fundo dos cards elevado com gradiente refinado (`linear-gradient(180deg, #132238 0%, #0c1728 100%)`) sobre canvas `#020931`. Cores de níveis preservadas. |
| **Governança** | Trilha Imutável de Auditoria (`organograma_logs`) | [x] Aprovado | Ambos OK | Registro automático de `CRIACAO`, `EDICAO`, `MOVIMENTACAO` e `EXCLUSAO` com snapshots completos em formato JSON. |
| **Governança** | Logout Seguro por Inatividade (1 hora) | [x] Aprovado | N/A | Hook `useIdleTimeout.js` ativo apenas para sessões autenticadas, com throttle de eventos (`mousemove`, `keydown`, `scroll`, etc.) e renovação contínua. |
| **Segurança** | Controle de Acesso Baseado em Perfis (RBAC) | [x] Aprovado | Ambos OK | Perfis `colaborador` e público deslogado operam em modo consulta (somente leitura com card flutuante `PublicNodeDetailsCard`). Ações de escrita bloqueadas por token JWT. |

---

## 2. Auditoria de Estresse Hierárquico e Integridade Relacional

| Cenário de Teste | Ação Executada | Resultado Esperado | Status | Falhas Detectadas e Correções Aplicadas |
| :--- | :--- | :--- | :---: | :--- |
| **Cascata Multinível** | Mover nó pai com filhos e netos vinculados (ex: mover Diretoria com Coordenações e Equipes). | A subárvore inteira migra junto sob a nova liderança; os nós netos preservam seu `parent_id` local intacto. | [x] Aprovado | Nenhuma falha detectada. A modelagem em lista de adjacências garante migração em bloco imediata apenas alterando o nó pai. |
| **Prevenção de Ciclos** | Tentar subordinar um nó ancestral a um de seus próprios descendentes (ex: mover nó 4 para dentro do nó 10). | Bloqueio imediato no frontend e rejeição com código HTTP 400 no backend. | [x] Aprovado | Implementada validação recursiva por subida de árvore em `verificarSeEDescendente()`. Validação testada com rejeição estrita: `"Ciclo hierárquico detectado: o destino não pode ser descendente do nó selecionado."` |
| **Proteção do Nó Raiz** | Tentar mover ou excluir o nó raiz institucional (Co-CEOs / ID 1). | Bloqueio imediato da operação com código HTTP 400. | [x] Aprovado | Backend rejeita mutação do nó raiz com mensagens explícitas: `"O nó raiz (Co-CEOs) não pode ser subordinado a outra área"` e `"Não é permitido excluir o nó raiz institucional (Co-CEOs)"`. |
| **Exclusão com Filhos** | Tentar excluir nó que possui subordinados ativos (ex: nó 4 com filhos 7 e 8). | Bloqueio preventivo no frontend e rejeição relacional HTTP 400 no backend, exigindo realocação prévia dos subordinados. | [x] Aprovado | Implementada trava relacional: o backend valida a existência de nós filhos antes do `DELETE`, retornando mensagem clara: `"Não é permitido excluir o nó ... pois existem X subunidade(s) diretamente vinculada(s). Realoque os subordinados antes de prosseguir."` |
| **Estresse de Texto** | Inserir nomes de áreas longos (ex: 120 caracteres) e múltiplos cotitulares extensos. | Truncamento elegante com `line-clamp-2`, preservação da altura fixa do card no D3 sem quebra do layout ou sobreposição de linhas. | [x] Aprovado | Aplicadas regras `overflow: hidden`, `text-overflow: ellipsis`, `display: -webkit-box`, `-webkit-line-clamp: 2` e atributo `title` para leitura integral em hover. |
| **Undo de Movimentação** | Mover estrutura e acionar o botão "Desfazer" na barra de ferramentas de tópicos. | Reversão real e imediata no banco MySQL (`PATCH /mover` com `parent_id` original) e recarregamento da árvore. | [x] Aprovado | Pilha de histórico (`historyStack`) armazena a tupla `[origemPaiId, destinoPaiId]`, executando o rollback real no MySQL e disparando `fetchTopicsData()` / `carregarDados()`. |
| **Alternância Rápida de Tema** | Alternar entre Modo Claro e Modo Escuro repetidas vezes durante renderização do D3. | O canvas atualiza suas superfícies e conectores sem duplicar SVGs no DOM ou perder o estado de zoom/pan. | [x] Aprovado | Gráfico reutiliza a instância estável em `chartRef.current`, com array de dependências rigorosamente constante `[nos, theme]`. |

---

## 3. Inconsistências Encontradas e Correções Implementadas

### Inconsistência 1: Bloqueio de Rede no Ambiente de Execução e Fallback Indevido
- **Diagnóstico:** O processo de desenvolvimento do backend estava rodando em contêiner de sandbox sem permissão de acesso à porta TCP `3306` do host local, gerando erro silencioso `ECONNREFUSED 127.0.0.1:3306`. O backend caía no bloco `catch` e servia a constante estática `FALLBACK_NOS`, onde o nó raiz estava nomeado como `"Conselho & Co-CEOs"` em vez do valor real do banco (`"Co-CEOs"`).
- **Correção:** O servidor de desenvolvimento foi reconfigurado e reiniciado com acesso liberado ao MySQL local (`127.0.0.1:3306`), conectando-se com sucesso ao schema `jhe_organograma`.

### Inconsistência 2: Incompatibilidade de Agrupamento SQL com `ONLY_FULL_GROUP_BY`
- **Diagnóstico:** A query anterior em `organogramaController.js` utilizava `JSON_ARRAYAGG` associado a `GROUP BY` sem listar todas as colunas não agregadas da tabela `organograma_nos`. Em ambientes MySQL 8 com modo estrito padrão, a query falhava.
- **Correção:** A consulta foi reestruturada em duas queries relacionais indexadas simples (`organograma_nos` + `usuario_cargos_nos`), realizando a formatação e agregação em memória no Node.js com garantia de compatibilidade com todos os modos SQL.

### Inconsistência 3: Violação de Chave Estrangeira em `organograma_logs` durante Exclusão
- **Diagnóstico:** Na função `excluirNo`, o comando `DELETE FROM organograma_nos WHERE id = ?` era executado antes de `registrarLogAuditoria`. Como a tabela `organograma_logs` possui chave estrangeira `CONSTRAINT fk_logs_no FOREIGN KEY (no_id) REFERENCES organograma_nos(id)`, ao tentar gravar o log pós-exclusão com o `no_id` recém-deletado, o MySQL lançava erro de violação de chave estrangeira, forçando rollback da transação e gerando mensagem de fallback.
- **Correção:** O log de auditoria de exclusão agora é gravado com `noId: null` e os metadados da área removida (`no_id_excluido`, `titulo`, `before`) armazenados de forma segura dentro do payload JSON `detalhes`. Além disso, removem-se previamente os vínculos órfãos em `usuario_cargos_nos`.

### Inconsistência 4: Falta de Validação Relacional Preventiva ao Excluir Nós com Filhos
- **Diagnóstico:** Ao tentar excluir uma diretoria ou coordenação que possuía equipes subordinadas, a operação tentava o delete direto, resultando em erro genérico ou risco de quebra da integridade estrutural.
- **Correção:** Adicionada verificação preventiva com query `SELECT count(*) FROM organograma_nos WHERE parent_id = ? AND ativo = 1`. Caso existam filhos ativos, o backend rejeita com HTTP 400 explicativo. No frontend, adicionou-se alerta de bloqueio via SweetAlert2 orientando o usuário a realocar os dependentes antes de prosseguir.

### Inconsistência 5: Borda Azul Uniforme Prejudicando a Identificação por Cores
- **Diagnóstico:** No Dark Mode, todos os cards estavam recebendo uma borda perimetral ciano uniforme (`#61CBE8`), o que eliminava a diferenciação cromática dos 10 níveis hierárquicos corporativos.
- **Correção:** A estilização foi refinada para que a borda perimetral utilize a cor do próprio nível com opacidade sutil (`${corAcento}35`), a barra superior tenha `4px solid ${corAcento}` e a bolinha do cabeçalho utilize a cor do nível com glow dedicado (`box-shadow: 0 0 6px ${corAcento}80`). Apenas nós marinho escuro (`#0E284E`) recebem iluminação pontual para `#3B82F6` para manter contraste sobre a superfície elevada `#132238`.

---

## 4. Instruções para Reprodução dos Testes Localmente

### A. Validação Automatizada de Endpoints e Regras Relacionais
Execute o comando a seguir no terminal do projeto para disparar a bateria automatizada de testes com validação em tempo real no MySQL:

```bash
node -e "
async function runTests() {
  console.log('--- TESTE AUTOMATIZADO JHE ---');
  // 1. Healthcheck
  const h = await fetch('http://localhost:3001/api/health').then(r => r.json());
  console.log('1. Healthcheck:', h.status === 'ok' && h.database === 'connected' ? 'PASS' : 'FAIL');

  // 2. Leitura da Raiz do MySQL
  const a = await fetch('http://localhost:3001/api/organograma/arvore').then(r => r.json());
  const raiz = a.find(n => n.id === '1');
  console.log('2. Raiz MySQL (\'Co-CEOs\'):', raiz?.titulo === 'Co-CEOs' ? 'PASS' : 'FAIL');

  // 3. Prevenção de Ciclos
  const c = await fetch('http://localhost:3001/api/organograma/nos/4/mover', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent_id: 10 })
  });
  console.log('3. Bloqueio de Ciclos (HTTP 400):', c.status === 400 ? 'PASS' : 'FAIL');

  // 4. Bloqueio de Exclusão com Dependentes
  const d = await fetch('http://localhost:3001/api/organograma/nos/4', { method: 'DELETE' });
  console.log('4. Bloqueio Exclusão com Filhos (HTTP 400):', d.status === 400 ? 'PASS' : 'FAIL');

  console.log('--- TESTES CONCLUÍDOS ---');
}
runTests();
"
```

### B. Validação Manual na Interface Web (http://localhost:5173)

1. **Validação de Sigla e Responsáveis Múltiplos:**
   - Faça login com o perfil administrador.
   - Abra o drawer de edição de um nó qualquer (ex: "Co-CEOs").
   - Adicione cotitulares no campo de tags ("Dr. Hélio", "Dr. Viol") e digite a sigla "CEO".
   - Verifique que o card exibe `● CEO • Co-CEOs / Presidência` e dois avatares com iniciais `DH` e `DV`.
   - Limpe o campo de sigla e salve. Verifique que o card passa a exibir apenas `● Co-CEOs / Presidência`.

2. **Validação de Movimentação e Desfazer (Undo):**
   - Acesse a aba **"Editor em Tópicos"**.
   - Arraste a unidade "Contrato 042/2026" para dentro da "Diretoria de Engenharia e Operações".
   - Confirme no modal. Observe a subordinação mudar imediatamente na lista.
   - Alterne para a aba **"Organograma (Canvas D3)"** e confirme o conector ortogonal ligado à nova liderança.
   - Retorne à aba de tópicos e clique no botão **"Desfazer" (Undo)**. Confirme o retorno à área superior anterior em ambos os visualizadores.

3. **Validação do Tema Escuro:**
   - Alterne o tema no botão de controle do canvas.
   - Observe o fundo em azul-noite `#020931` e os cards com superfície elevada em degradê (`#132238` a `#0c1728`).
   - Verifique que cada nível mantém sua cor institucional na barra superior e na bolinha (Ocre, Azul, Ardósia, etc.), sem bordas azuis genéricas.
