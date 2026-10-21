// Traduções: texto em português -> [inglês, espanhol]. Placeholders {x} devem ser mantidos.
(function (root, dict) {
  if (typeof module === 'object' && module.exports) module.exports = dict;
  else root.RegenteI18n.define(dict);
})(typeof self !== 'undefined' ? self : this, {
  // ---------- comuns ----------
  'OK': ['OK', 'OK'],
  'Cancelar': ['Cancel', 'Cancelar'],
  'Confirmar': ['Confirm', 'Confirmar'],
  'Salvar': ['Save', 'Guardar'],
  'Fechar': ['Close', 'Cerrar'],
  'Excluir': ['Delete', 'Eliminar'],
  'Remover': ['Remove', 'Quitar'],
  'Renomear': ['Rename', 'Renombrar'],
  'Voltar': ['Back', 'Atrás'],
  'Recarregar': ['Reload', 'Recargar'],
  'Reiniciar': ['Restart', 'Reiniciar'],
  'Enviar': ['Send', 'Enviar'],
  'Enviar ⏎': ['Send ⏎', 'Enviar ⏎'],
  'Escolher…': ['Choose…', 'Elegir…'],
  'Cor personalizada…': ['Custom color…', 'Color personalizado…'],
  'Nome': ['Name', 'Nombre'],
  'Comando': ['Command', 'Comando'],
  'Tema': ['Theme', 'Tema'],
  'Idioma': ['Language', 'Idioma'],
  'Claro': ['Light', 'Claro'],
  'Escuro': ['Dark', 'Oscuro'],
  'Sistema': ['System', 'Sistema'],
  'Automático (sistema)': ['Automatic (system)', 'Automático (sistema)'],

  // ---------- status dos agentes ----------
  'starting': ['starting', 'iniciando'],
  'working': ['working', 'trabajando'],
  'waiting': ['waiting', 'esperando'],
  'idle': ['idle', 'inactivo'],
  'exited': ['exited', 'finalizado'],

  // ---------- index.html ----------
  'Novo workspace': ['New workspace', 'Nuevo workspace'],
  'Esconder barra lateral (Ctrl+B)': ['Hide sidebar (Ctrl+B)', 'Ocultar barra lateral (Ctrl+B)'],
  'Mostrar barra lateral (Ctrl+B)': ['Show sidebar (Ctrl+B)', 'Mostrar barra lateral (Ctrl+B)'],
  'Filtrar': ['Filter', 'Filtrar'],
  'Grupo': ['Group', 'Grupo'],
  'Tema claro/escuro': ['Light/dark theme', 'Tema claro/oscuro'],
  'Configurações': ['Settings', 'Configuración'],
  'Selecionar (V)': ['Select (V)', 'Seleccionar (V)'],
  'Novo agente (Ctrl+Shift+T)': ['New agent (Ctrl+Shift+T)', 'Nuevo agente (Ctrl+Shift+T)'],
  'Nova nota (Ctrl+Shift+N)': ['New note (Ctrl+Shift+N)', 'Nueva nota (Ctrl+Shift+N)'],
  'Novo portal (Ctrl+Shift+P)': ['New portal (Ctrl+Shift+P)', 'Nuevo portal (Ctrl+Shift+P)'],
  'Texto (T)': ['Text (T)', 'Texto (T)'],
  'Caneta (P)': ['Pen (P)', 'Lápiz (P)'],
  'Seta (A)': ['Arrow (A)', 'Flecha (A)'],
  'Retângulo (R)': ['Rectangle (R)', 'Rectángulo (R)'],
  'Borracha (E)': ['Eraser (E)', 'Borrador (E)'],
  'Mais fino': ['Thinner', 'Más fino'],
  'Mais grosso': ['Thicker', 'Más grueso'],
  'Batuta: buscar em tudo (Ctrl+P)': ['Baton: search everything (Ctrl+P)', 'Batuta: buscar en todo (Ctrl+P)'],
  'Andares (Ctrl+Shift+F)': ['Floors (Ctrl+Shift+F)', 'Pisos (Ctrl+Shift+F)'],
  'Partituras': ['Scores', 'Partituras'],
  'Papéis': ['Roles', 'Roles'],
  'Rotinas': ['Routines', 'Rutinas'],
  'Mensagens entre agentes (Ctrl+L)': ['Messages between agents (Ctrl+L)', 'Mensajes entre agentes (Ctrl+L)'],
  'Mensagens entre agentes': ['Messages between agents', 'Mensajes entre agentes'],
  'Ver tudo (Ctrl+0)': ['Fit all (Ctrl+0)', 'Ver todo (Ctrl+0)'],
  'Diminuir (Ctrl+-)': ['Zoom out (Ctrl+-)', 'Alejar (Ctrl+-)'],
  'Aumentar (Ctrl+=)': ['Zoom in (Ctrl+=)', 'Acercar (Ctrl+=)'],
  'Comece seu arranjo': ['Start your arrangement', 'Empieza tu arreglo'],
  'Clique em': ['Click', 'Haz clic en'],
  'para criar um agente: Claude Code, Codex, Gemini, OpenCode ou shell.': ['to create an agent: Claude Code, Codex, Gemini, OpenCode or shell.', 'para crear un agente: Claude Code, Codex, Gemini, OpenCode o shell.'],
  'Arraste do': ['Drag from the', 'Arrastra desde el'],
  'na borda de um nó até outro para conectá-los. Agentes conectados conversam via': ['on a node\'s edge to another node to connect them. Connected agents talk through', 'en el borde de un nodo hasta otro para conectarlos. Los agentes conectados conversan mediante'],
  'Ctrl+roda zoom · arrastar o fundo move · duplo clique cria · Ctrl+P busca · Alt+setas navega': ['Ctrl+wheel zooms · drag the background to pan · double-click creates · Ctrl+P searches · Alt+arrows navigate', 'Ctrl+rueda zoom · arrastrar el fondo mueve · doble clic crea · Ctrl+P busca · Alt+flechas navega'],

  // ---------- barra lateral e workspaces ----------
  'Projetos': ['Projects', 'Proyectos'],
  'Renomear grupo': ['Rename group', 'Renombrar grupo'],
  'Novo workspace aqui': ['New workspace here', 'Nuevo workspace aquí'],
  'Renomear workspace': ['Rename workspace', 'Renombrar workspace'],
  'Mover para grupo…': ['Move to group…', 'Mover a grupo…'],
  'Grupo (projeto)': ['Group (project)', 'Grupo (proyecto)'],
  'Trocar cor do ícone': ['Change icon color', 'Cambiar color del ícono'],
  'Pasta do projeto…': ['Project folder…', 'Carpeta del proyecto…'],
  'Criar andar a partir deste': ['Create floor from this one', 'Crear piso a partir de este'],
  'Excluir workspace': ['Delete workspace', 'Eliminar workspace'],
  '"{name}" e todos os seus terminais serão fechados.': ['"{name}" and all its terminals will be closed.', '"{name}" y todas sus terminales se cerrarán.'],
  'Não dá para excluir o último workspace': ['You can\'t delete the last workspace', 'No se puede eliminar el último workspace'],
  'Nome do novo workspace': ['New workspace name', 'Nombre del nuevo workspace'],
  'Novo grupo (projeto)': ['New group (project)', 'Nuevo grupo (proyecto)'],
  'Novo projeto': ['New project', 'Nuevo proyecto'],

  // ---------- andares ----------
  'Novo andar': ['New floor', 'Nuevo piso'],
  'experimento': ['experiment', 'experimento'],
  'Um andar é uma cópia isolada do workspace. Em repositórios git vira um git worktree numa branch própria (regente/<nome>); fora do git, uma cópia da pasta. Os agentes do andar trabalham sem tocar no original.': [
    'A floor is an isolated copy of the workspace. In git repositories it becomes a git worktree on its own branch (regente/<name>); outside git, a copy of the folder. The floor\'s agents work without touching the original.',
    'Un piso es una copia aislada del workspace. En repositorios git se convierte en un git worktree en su propia rama (regente/<nombre>); fuera de git, una copia de la carpeta. Los agentes del piso trabajan sin tocar el original.'],
  'Criando andar…': ['Creating floor…', 'Creando piso…'],
  'Andar criado em {dir}': ['Floor created at {dir}', 'Piso creado en {dir}'],
  'Andar': ['Floor', 'Piso'],
  'Andares': ['Floors', 'Pisos'],
  'branch': ['branch', 'rama'],
  'a partir de': ['from', 'a partir de'],
  'cópia de': ['copy of', 'copia de'],
  'cópia': ['copy', 'copia'],
  'em': ['at', 'en'],
  'Ir para o original': ['Go to original', 'Ir al original'],
  'Pousar (merge)': ['Land (merge)', 'Aterrizar (merge)'],
  'Descartar andar': ['Discard floor', 'Descartar piso'],
  'Pousar andar': ['Land floor', 'Aterrizar piso'],
  'Fazer merge da branch {branch} em {base} no repositório original?': ['Merge branch {branch} into {base} in the original repository?', '¿Hacer merge de la rama {branch} en {base} en el repositorio original?'],
  'Andar pousado': ['Floor landed', 'Piso aterrizado'],
  'O worktree/cópia em {dir} será apagado, junto com a branch. Isso não pode ser desfeito.': ['The worktree/copy at {dir} will be deleted, along with the branch. This can\'t be undone.', 'El worktree/copia en {dir} se eliminará, junto con la rama. Esto no se puede deshacer.'],
  'Novo andar deste workspace': ['New floor from this workspace', 'Nuevo piso de este workspace'],
  'só andares git podem ser pousados automaticamente': ['only git floors can be landed automatically', 'solo los pisos git pueden aterrizarse automáticamente'],
  'o andar tem mudanças não commitadas; peça a um agente para commitar antes de pousar': ['the floor has uncommitted changes; ask an agent to commit before landing', 'el piso tiene cambios sin commit; pide a un agente que haga commit antes de aterrizar'],
  'não é um andar': ['not a floor', 'no es un piso'],
  'o repositório original está em "{cur}", esperado "{base}"': ['the original repository is on "{cur}", expected "{base}"', 'el repositorio original está en "{cur}", se esperaba "{base}"'],

  // ---------- nós ----------
  'Duplo clique para renomear': ['Double-click to rename', 'Doble clic para renombrar'],
  'Focar (Ctrl+Enter)': ['Focus (Ctrl+Enter)', 'Enfocar (Ctrl+Enter)'],
  'Arraste até outro nó para conectar': ['Drag to another node to connect', 'Arrastra hasta otro nodo para conectar'],
  'Já existe um nó com esse nome': ['A node with that name already exists', 'Ya existe un nodo con ese nombre'],
  'nota': ['note', 'nota'],
  'Nota': ['Note', 'Nota'],
  'Portal': ['Portal', 'Portal'],
  'mensagens na fila': ['queued messages', 'mensajes en cola'],
  'Com papel…': ['With role…', 'Con rol…'],
  'Endereço do portal': ['Portal address', 'Dirección del portal'],
  'Agentes conectados podem navegar, ler a árvore de elementos, clicar e digitar: regente portal <nome> snapshot | click <ref> | type <ref> <texto>': [
    'Connected agents can browse, read the element tree, click and type: regente portal <name> snapshot | click <ref> | type <ref> <text>',
    'Los agentes conectados pueden navegar, leer el árbol de elementos, hacer clic y escribir: regente portal <nombre> snapshot | click <ref> | type <ref> <texto>'],
  'Fechar terminal': ['Close terminal', 'Cerrar terminal'],
  '"{name}" ainda está trabalhando. Fechar mesmo assim?': ['"{name}" is still working. Close anyway?', '"{name}" todavía está trabajando. ¿Cerrar de todos modos?'],
  'Remover conexão': ['Remove connection', 'Quitar conexión'],
  '{a} ⇄ {b} conectados': ['{a} ⇄ {b} connected', '{a} ⇄ {b} conectados'],
  'Texto no canvas': ['Text on canvas', 'Texto en el canvas'],

  // ---------- terminal ----------
  'processo encerrado ({code})': ['process exited ({code})', 'proceso finalizado ({code})'],
  'Papel do agente': ['Agent role', 'Rol del agente'],
  'sem papel': ['no role', 'sin rol'],
  '[Regente] A partir de agora seu papel é "{name}":\n{prompt}': ['[Regente] From now on your role is "{name}":\n{prompt}', '[Regente] A partir de ahora tu rol es "{name}":\n{prompt}'],
  'Papel "{name}" enviado ao agente': ['Role "{name}" sent to the agent', 'Rol "{name}" enviado al agente'],
  'Compositor (Ctrl+I)': ['Composer (Ctrl+I)', 'Compositor (Ctrl+I)'],
  'Ponto: resumir e sugerir próximos passos': ['Prompter: summarize and suggest next steps', 'Apuntador: resumir y sugerir próximos pasos'],
  'Reiniciar agente': ['Restart agent', 'Reiniciar agente'],
  'Escreva para o agente…  Enter envia · Shift+Enter quebra linha · @ menciona conectados · cole imagens': [
    'Write to the agent…  Enter sends · Shift+Enter new line · @ mentions connected nodes · paste images',
    'Escribe al agente…  Enter envía · Shift+Enter nueva línea · @ menciona conectados · pega imágenes'],
  'para {name}': ['to {name}', 'para {name}'],
  'Referências no canvas:': ['References on the canvas:', 'Referencias en el canvas:'],

  // ---------- nota ----------
  'Markdown… agentes conectados podem escrever aqui (regente note)': ['Markdown… connected agents can write here (regente note)', 'Markdown… los agentes conectados pueden escribir aquí (regente note)'],
  '_vazia — duplo clique para editar_': ['_empty — double-click to edit_', '_vacía — doble clic para editar_'],
  'Editar / visualizar': ['Edit / preview', 'Editar / ver'],
  'Abrir arquivo .md': ['Open .md file', 'Abrir archivo .md'],

  // ---------- portal ----------
  'Apontar e perguntar: recorte uma área e envie a um agente': ['Point and ask: crop an area and send it to an agent', 'Señalar y preguntar: recorta un área y envíala a un agente'],
  'Certificado não confiável': ['Untrusted certificate', 'Certificado no confiable'],
  'Não foi possível abrir a página': ['Couldn\'t open the page', 'No se pudo abrir la página'],
  'O certificado HTTPS de {host} não é reconhecido ({desc}). É comum em ambientes de desenvolvimento e homologação com certificado próprio.': [
    'The HTTPS certificate of {host} isn\'t recognized ({desc}). This is common in development and staging environments with self-signed certificates.',
    'El certificado HTTPS de {host} no se reconoce ({desc}). Es común en entornos de desarrollo y pruebas con certificado propio.'],
  '{host} marcado como confiável': ['{host} marked as trusted', '{host} marcado como confiable'],
  'Confiar em {host} e abrir': ['Trust {host} and open', 'Confiar en {host} y abrir'],
  'Tentar de novo': ['Try again', 'Intentar de nuevo'],
  'A exceção vale só para este host e pode ser removida em Configurações.': ['The exception applies only to this host and can be removed in Settings.', 'La excepción vale solo para este host y puede quitarse en Configuración.'],
  'Conecte este portal a um agente para enviar recortes': ['Connect this portal to an agent to send crops', 'Conecta este portal a un agente para enviar recortes'],
  'O que o agente deve fazer com esta área? (ex.: "este botão está desalinhado")': ['What should the agent do with this area? (e.g. "this button is misaligned")', '¿Qué debe hacer el agente con esta área? (ej.: "este botón está desalineado")'],
  'Apontar e perguntar': ['Point and ask', 'Señalar y preguntar'],
  '{n} elementos na região · imagem: {file}': ['{n} elements in the region · image: {file}', '{n} elementos en la región · imagen: {file}'],
  'Enviar para': ['Send to', 'Enviar a'],
  '[Regente] Recorte do portal "{name}" ({url}):\n{comment}\n\nImagem do recorte: {file}\nElementos na região (tag#id "texto" [x,y,w,h]):\n{elements}': [
    '[Regente] Crop from portal "{name}" ({url}):\n{comment}\n\nCrop image: {file}\nElements in the region (tag#id "text" [x,y,w,h]):\n{elements}',
    '[Regente] Recorte del portal "{name}" ({url}):\n{comment}\n\nImagen del recorte: {file}\nElementos en la región (tag#id "texto" [x,y,w,h]):\n{elements}'],
  '(sem comentário)': ['(no comment)', '(sin comentario)'],
  'Recorte enviado': ['Crop sent', 'Recorte enviado'],

  // ---------- log ----------
  'msg': ['msg', 'msj'],
  'tarefa': ['task', 'tarea'],
  'resposta': ['reply', 'respuesta'],
  'Nenhuma mensagem ainda. Conecte dois agentes e peça para um delegar ao outro com "regente ask".': ['No messages yet. Connect two agents and ask one to delegate to the other with "regente ask".', 'Aún no hay mensajes. Conecta dos agentes y pide a uno que delegue al otro con "regente ask".'],

  // ---------- papéis ----------
  'Instruções reutilizáveis que definem a responsabilidade de um agente. Entram no system prompt ao iniciar (Claude Code) ou como primeira mensagem (outros CLIs).': [
    'Reusable instructions that define an agent\'s responsibility. They go into the system prompt at startup (Claude Code) or as the first message (other CLIs).',
    'Instrucciones reutilizables que definen la responsabilidad de un agente. Entran en el system prompt al iniciar (Claude Code) o como primer mensaje (otros CLIs).'],
  'Novo papel': ['New role', 'Nuevo rol'],
  'Papel': ['Role', 'Rol'],
  'Papéis salvos': ['Roles saved', 'Roles guardados'],
  'Maestro': ['Conductor', 'Director'],
  'Caçador de Bugs': ['Bug Hunter', 'Cazador de Bugs'],
  'Revisor': ['Reviewer', 'Revisor'],
  'Testador': ['Tester', 'Tester'],
  'Documentador': ['Documenter', 'Documentador'],
  'Refatorador': ['Refactorer', 'Refactorizador'],
  'Mago do Git': ['Git Wizard', 'Mago de Git'],
  'Performance': ['Performance', 'Rendimiento'],
  'Você é o agente coordenador. Quebre a tarefa em partes, delegue aos terminais conectados com `regente ask` / `regente send`, acompanhe o progresso e integre os resultados. Não implemente tudo sozinho quando houver colegas conectados.': [
    'You are the coordinating agent. Break the task into parts, delegate to the connected terminals with `regente ask` / `regente send`, track progress and integrate the results. Don\'t implement everything yourself when there are connected teammates.',
    'Eres el agente coordinador. Divide la tarea en partes, delega a las terminales conectadas con `regente ask` / `regente send`, sigue el progreso e integra los resultados. No implementes todo tú solo cuando haya compañeros conectados.'],
  'Sua responsabilidade é encontrar a causa raiz de bugs. Reproduza antes de corrigir, escreva um teste que falha, corrija o mínimo necessário e explique a causa.': [
    'Your job is to find the root cause of bugs. Reproduce before fixing, write a failing test, fix the minimum necessary and explain the cause.',
    'Tu responsabilidad es encontrar la causa raíz de los bugs. Reprodúcelos antes de corregir, escribe un test que falle, corrige lo mínimo necesario y explica la causa.'],
  'Você revisa código. Procure bugs reais, regressões e riscos de segurança. Seja específico (arquivo:linha) e não reescreva código que está correto.': [
    'You review code. Look for real bugs, regressions and security risks. Be specific (file:line) and don\'t rewrite code that is correct.',
    'Revisas código. Busca bugs reales, regresiones y riesgos de seguridad. Sé específico (archivo:línea) y no reescribas código que está correcto.'],
  'Você escreve e roda testes. Garanta cobertura dos casos de borda e reporte falhas com a saída exata.': [
    'You write and run tests. Ensure edge cases are covered and report failures with the exact output.',
    'Escribes y ejecutas tests. Asegura la cobertura de los casos límite y reporta fallos con la salida exacta.'],
  'Você mantém a documentação (README, comentários de API, changelog) sincronizada com o código.': [
    'You keep the documentation (README, API comments, changelog) in sync with the code.',
    'Mantienes la documentación (README, comentarios de API, changelog) sincronizada con el código.'],
  'Você simplifica código sem mudar comportamento. Faça mudanças pequenas e verificáveis, rodando os testes a cada passo.': [
    'You simplify code without changing behavior. Make small, verifiable changes, running the tests at every step.',
    'Simplificas código sin cambiar su comportamiento. Haz cambios pequeños y verificables, ejecutando los tests en cada paso.'],
  'Você cuida do git: branches, commits atômicos com boas mensagens, rebase e resolução de conflitos. Nunca force push sem pedir.': [
    'You take care of git: branches, atomic commits with good messages, rebase and conflict resolution. Never force push without asking.',
    'Te encargas de git: ramas, commits atómicos con buenos mensajes, rebase y resolución de conflictos. Nunca hagas force push sin preguntar.'],
  'Você mede antes de otimizar. Encontre gargalos com profiling e proponha melhorias com números de antes/depois.': [
    'You measure before optimizing. Find bottlenecks with profiling and propose improvements with before/after numbers.',
    'Mides antes de optimizar. Encuentra cuellos de botella con profiling y propone mejoras con números de antes/después.'],

  // ---------- partituras e modelos ----------
  'Nome da partitura': ['Score name', 'Nombre de la partitura'],
  'Partitura "{name}" salva': ['Score "{name}" saved', 'Partitura "{name}" guardada'],
  '"{name}" aplicada': ['"{name}" applied', '"{name}" aplicada'],
  '{a} agentes · {b} notas/portais': ['{a} agents · {b} notes/portals', '{a} agentes · {b} notas/portales'],
  'Salve o arranjo inteiro (agentes com papéis, notas, portais, desenhos e conexões) e restaure em qualquer workspace ou andar.': [
    'Save the whole arrangement (agents with roles, notes, portals, drawings and connections) and restore it in any workspace or floor.',
    'Guarda el arreglo completo (agentes con roles, notas, portales, dibujos y conexiones) y restáuralo en cualquier workspace o piso.'],
  '{n} nós · {e} conexões': ['{n} nodes · {e} connections', '{n} nodos · {e} conexiones'],
  'Aplicar aqui': ['Apply here', 'Aplicar aquí'],
  'Nenhuma partitura salva ainda.': ['No scores saved yet.', 'Aún no hay partituras guardadas.'],
  'Modelos': ['Templates', 'Plantillas'],
  'Salvar arranjo atual': ['Save current arrangement', 'Guardar arreglo actual'],
  'Canvas vazio': ['Empty canvas', 'Canvas vacío'],
  'Começar do zero.': ['Start from scratch.', 'Empezar desde cero.'],
  'Solo': ['Solo', 'Solo'],
  'Um agente e uma nota de plano conectada. Bom para começar.': ['One agent and a connected plan note. Good for getting started.', 'Un agente y una nota de plan conectada. Ideal para empezar.'],
  'Dev + Revisor': ['Dev + Reviewer', 'Dev + Revisor'],
  'Um agente implementa e pede revisão ao outro com regente ask.': ['One agent implements and asks the other for a review with regente ask.', 'Un agente implementa y pide revisión al otro con regente ask.'],
  'Equipe com Maestro': ['Team with Conductor', 'Equipo con Director'],
  'Um coordenador quebra a tarefa e delega para dois devs e um testador. O progresso vai para a nota.': ['A coordinator breaks down the task and delegates to two devs and a tester. Progress goes into the note.', 'Un coordinador divide la tarea y delega a dos devs y un tester. El progreso va a la nota.'],
  'Frontend com portal': ['Frontend with portal', 'Frontend con portal'],
  'Um dev com um navegador conectado: ele abre o app, lê a tela, clica e testa sozinho.': ['A dev with a connected browser: it opens the app, reads the screen, clicks and tests on its own.', 'Un dev con un navegador conectado: abre la app, lee la pantalla, hace clic y prueba solo.'],
  'Caça ao bug': ['Bug hunt', 'Caza de bugs'],
  'Caçador investiga a causa raiz, Testador escreve o teste que falha, e um shell fica livre para logs.': ['The Hunter investigates the root cause, the Tester writes the failing test, and a shell stays free for logs.', 'El Cazador investiga la causa raíz, el Tester escribe el test que falla y un shell queda libre para logs.'],
  'Dev': ['Dev', 'Dev'],
  'Dev A': ['Dev A', 'Dev A'],
  'Dev B': ['Dev B', 'Dev B'],
  'Plano': ['Plan', 'Plan'],
  'Decisões': ['Decisions', 'Decisiones'],
  'Frontend': ['Frontend', 'Frontend'],
  'App': ['App', 'App'],
  'Caçador': ['Hunter', 'Cazador'],
  'Logs': ['Logs', 'Logs'],
  'Hipóteses': ['Hypotheses', 'Hipótesis'],
  'Par': ['Pair', 'Pareja'],
  'Equipe': ['Team', 'Equipo'],
  '# Plano\n\n- [ ] descrever a tarefa\n': ['# Plan\n\n- [ ] describe the task\n', '# Plan\n\n- [ ] describir la tarea\n'],
  '# Decisões\n': ['# Decisions\n', '# Decisiones\n'],
  '# Plano\n\nO Maestro mantém esta lista atualizada.\n\n- [ ] \n': ['# Plan\n\nThe Conductor keeps this list up to date.\n\n- [ ] \n', '# Plan\n\nEl Director mantiene esta lista actualizada.\n\n- [ ] \n'],
  '# Hipóteses\n\n- \n': ['# Hypotheses\n\n- \n', '# Hipótesis\n\n- \n'],

  // ---------- assistente inicial ----------
  'Boas-vindas': ['Welcome', 'Bienvenida'],
  'Agentes': ['Agents', 'Agentes'],
  'Projeto': ['Project', 'Proyecto'],
  'Arranjo': ['Arrangement', 'Arreglo'],
  'Pronto': ['Done', 'Listo'],
  'Bem-vindo ao Regente': ['Welcome to Regente', 'Bienvenido a Regente'],
  'Bem-vindo ao Regente!': ['Welcome to Regente!', '¡Bienvenido a Regente!'],
  'Um canvas onde seus agentes de IA trabalham lado a lado. Ligue dois agentes com uma linha e eles passam a conversar, delegar tarefas, anotar o progresso e testar no navegador.': [
    'A canvas where your AI agents work side by side. Link two agents with a line and they start talking, delegating tasks, logging progress and testing in the browser.',
    'Un canvas donde tus agentes de IA trabajan lado a lado. Une dos agentes con una línea y empiezan a conversar, delegar tareas, anotar el progreso y probar en el navegador.'],
  'em terminais reais: Claude Code, Codex, Gemini, OpenCode ou shell': ['in real terminals: Claude Code, Codex, Gemini, OpenCode or shell', 'en terminales reales: Claude Code, Codex, Gemini, OpenCode o shell'],
  'Conexões': ['Connections', 'Conexiones'],
  'definem quem conversa com quem': ['define who talks to whom', 'definen quién habla con quién'],
  'Notas e portais': ['Notes and portals', 'Notas y portales'],
  'que os agentes leem, escrevem e controlam': ['that agents read, write and control', 'que los agentes leen, escriben y controlan'],
  'para experimentar numa branch isolada': ['to experiment on an isolated branch', 'para experimentar en una rama aislada'],
  'Vamos configurar em 1 minuto. Tudo pode ser mudado depois em Configurações.': ['Let\'s set things up in 1 minute. Everything can be changed later in Settings.', 'Configurémoslo en 1 minuto. Todo puede cambiarse después en Configuración.'],
  'Escolha o idioma': ['Choose the language', 'Elige el idioma'],
  'Escolha o tema': ['Choose the theme', 'Elige el tema'],
  'Seguir o sistema': ['Follow the system', 'Seguir el sistema'],
  'Seus agentes': ['Your agents', 'Tus agentes'],
  'Detectei os CLIs instalados. Escolha o agente padrão dos modelos e ajuste o comando de inicialização, se quiser.': ['I detected the installed CLIs. Choose the default agent for templates and adjust the startup command if you want.', 'Detecté los CLIs instalados. Elige el agente predeterminado de las plantillas y ajusta el comando de inicio si quieres.'],
  'verificando…': ['checking…', 'verificando…'],
  'instalado': ['installed', 'instalado'],
  'não encontrado': ['not found', 'no encontrado'],
  'Para instalar:': ['To install:', 'Para instalar:'],
  'Comando de inicialização': ['Startup command', 'Comando de inicio'],
  'Seu primeiro projeto': ['Your first project', 'Tu primer proyecto'],
  'Os agentes deste workspace abrem nesta pasta. Se for um repositório git, você poderá criar andares (branches isoladas).': ['This workspace\'s agents open in this folder. If it\'s a git repository, you\'ll be able to create floors (isolated branches).', 'Los agentes de este workspace se abren en esta carpeta. Si es un repositorio git, podrás crear pisos (ramas aisladas).'],
  'Nome do workspace': ['Workspace name', 'Nombre del workspace'],
  'Pasta do projeto': ['Project folder', 'Carpeta del proyecto'],
  'Comece com um arranjo': ['Start with an arrangement', 'Empieza con un arreglo'],
  'Modelos prontos usando {agent}. Ficam também em Partituras → Modelos.': ['Ready-made templates using {agent}. Also available in Scores → Templates.', 'Plantillas listas usando {agent}. También están en Partituras → Plantillas.'],
  'Tudo pronto': ['All set', 'Todo listo'],
  'Arraste o': ['Drag the', 'Arrastra el'],
  'da borda de um nó até outro para conectá-los': ['from a node\'s edge to another to connect them', 'del borde de un nodo hasta otro para conectarlos'],
  'num terminal abre o compositor com @menções e imagens': ['in a terminal opens the composer with @mentions and images', 'en una terminal abre el compositor con @menciones e imágenes'],
  'busca tudo;': ['searches everything;', 'busca todo;'],
  'mostra tudo;': ['shows everything;', 'muestra todo;'],
  'Alt+setas': ['Alt+arrows', 'Alt+flechas'],
  'pula entre agentes': ['jumps between agents', 'salta entre agentes'],
  'Peça a um agente:': ['Ask an agent:', 'Pide a un agente:'],
  '"use regente ask para pedir ao Revisor que revise suas mudanças"': ['"use regente ask to have the Reviewer review your changes"', '"usa regente ask para pedirle al Revisor que revise tus cambios"'],
  'Instalar a skill "regente" em ~/.claude/skills e ~/.agents/skills (ensina qualquer sessão de agente a usar o canvas)': ['Install the "regente" skill in ~/.claude/skills and ~/.agents/skills (teaches any agent session to use the canvas)', 'Instalar la skill "regente" en ~/.claude/skills y ~/.agents/skills (enseña a cualquier sesión de agente a usar el canvas)'],
  'Pular': ['Skip', 'Omitir'],
  'Começar': ['Start', 'Empezar'],
  'Continuar': ['Continue', 'Continuar'],
  'Abrir o canvas': ['Open the canvas', 'Abrir el canvas'],

  // ---------- configurações ----------
  'comando (vazio = só o shell)': ['command (empty = shell only)', 'comando (vacío = solo el shell)'],
  'Agentes — comando de inicialização. $REGENTE_SYSTEM_PROMPT contém o papel + instruções de orquestração.': ['Agents — startup command. $REGENTE_SYSTEM_PROMPT holds the role + orchestration instructions.', 'Agentes — comando de inicio. $REGENTE_SYSTEM_PROMPT contiene el rol + instrucciones de orquestación.'],
  'Id do novo agente (ex.: aider)': ['New agent id (e.g. aider)', 'Id del nuevo agente (ej.: aider)'],
  'Agente personalizado': ['Custom agent', 'Agente personalizado'],
  'Fonte do terminal': ['Terminal font size', 'Fuente de la terminal'],
  'Notificar quando um agente terminar ou pedir permissão (com a janela sem foco)': ['Notify when an agent finishes or asks for permission (when the window is unfocused)', 'Notificar cuando un agente termine o pida permiso (con la ventana sin foco)'],
  'Abrir o assistente de configuração': ['Open the setup wizard', 'Abrir el asistente de configuración'],
  'Sites confiáveis (certificado):': ['Trusted sites (certificate):', 'Sitios confiables (certificado):'],
  'Ponto (assistente)': ['Prompter (assistant)', 'Apuntador (asistente)'],
  'Quando um agente termina um turno, o Ponto resume o que aconteceu e sugere próximos passos clicáveis. Usa um CLI de LLM local ao seu gosto (recebe o prompt no stdin, devolve JSON).': [
    'When an agent finishes a turn, the Prompter summarizes what happened and suggests clickable next steps. It uses a local LLM CLI of your choice (receives the prompt on stdin, returns JSON).',
    'Cuando un agente termina un turno, el Apuntador resume lo que pasó y sugiere próximos pasos clicables. Usa un CLI de LLM local a tu gusto (recibe el prompt por stdin, devuelve JSON).'],
  'Ativar resumos automáticos': ['Enable automatic summaries', 'Activar resúmenes automáticos'],
  'Alternativas:': ['Alternatives:', 'Alternativas:'],
  'Integração com agentes': ['Agent integration', 'Integración con agentes'],
  'Skill instalada em:': ['Skill installed at:', 'Skill instalada en:'],
  'Instalar skill "regente" (~/.claude/skills e ~/.agents/skills)': ['Install "regente" skill (~/.claude/skills and ~/.agents/skills)', 'Instalar skill "regente" (~/.claude/skills y ~/.agents/skills)'],
  'Atualizações': ['Updates', 'Actualizaciones'],
  'Procurar novas versões automaticamente': ['Check for new versions automatically', 'Buscar nuevas versiones automáticamente'],
  'Versão {v}': ['Version {v}', 'Versión {v}'],
  'Atualização automática só funciona no app instalado': ['Automatic updates only work in the installed app', 'La actualización automática solo funciona en la app instalada'],
  'Você já está na versão mais recente': ['You\'re on the latest version', 'Ya tienes la versión más reciente'],
  'Falha ao procurar atualização: {msg}': ['Failed to check for updates: {msg}', 'Error al buscar actualizaciones: {msg}'],
  'Versão {v} disponível': ['Version {v} available', 'Versión {v} disponible'],
  'Verificar agora': ['Check now', 'Verificar ahora'],
  'Backups': ['Backups', 'Copias de seguridad'],
  'Um backup automático por hora (os 48 mais recentes ficam guardados).': ['One automatic backup per hour (the 48 most recent are kept).', 'Una copia automática por hora (se guardan las 48 más recientes).'],
  'Backup criado': ['Backup created', 'Copia creada'],
  'Fazer backup agora': ['Back up now', 'Hacer copia ahora'],
  'Nenhum backup ainda': ['No backups yet', 'Aún no hay copias'],
  'Restaurar backup': ['Restore backup', 'Restaurar copia'],
  'O estado atual é salvo antes de restaurar. Os terminais são reiniciados.': ['The current state is saved before restoring. Terminals are restarted.', 'El estado actual se guarda antes de restaurar. Las terminales se reinician.'],
  'Restaurar': ['Restore', 'Restaurar'],
  'Restaurar…': ['Restore…', 'Restaurar…'],
  'MCP: para dar as ferramentas do Regente como tools nativas a um agente, rode dentro do terminal dele:': ['MCP: to give an agent Regente\'s tools as native tools, run inside its terminal:', 'MCP: para dar las herramientas de Regente como tools nativas a un agente, ejecuta dentro de su terminal:'],
  'Dados locais em': ['Local data at', 'Datos locales en'],
  'Configurações salvas (fonte vale para novos terminais)': ['Settings saved (font applies to new terminals)', 'Configuración guardada (la fuente vale para nuevas terminales)'],

  // ---------- atualização ----------
  'Regente {v} baixado': ['Regente {v} downloaded', 'Regente {v} descargado'],
  'Regente {v} disponível': ['Regente {v} available', 'Regente {v} disponible'],
  'Reiniciar e atualizar': ['Restart and update', 'Reiniciar y actualizar'],
  'Baixar': ['Download', 'Descargar'],
  'Depois': ['Later', 'Después'],

  // ---------- batuta ----------
  'Buscar agentes, notas, portais, workspaces…  (">" busca dentro das notas)': ['Search agents, notes, portals, workspaces…  (">" searches inside notes)', 'Buscar agentes, notas, portales, workspaces…  (">" busca dentro de las notas)'],
  'Nada encontrado.': ['Nothing found.', 'No se encontró nada.'],
  'Tudo': ['All', 'Todo'],
  'Precisam de você': ['Need you', 'Te necesitan'],
  'Trabalhando': ['Working', 'Trabajando'],

  // ---------- rotinas ----------
  'Lembrete (notificação)': ['Reminder (notification)', 'Recordatorio (notificación)'],
  'A cada': ['Every', 'Cada'],
  'Todo dia às': ['Every day at', 'Todos los días a las'],
  'Semanal': ['Weekly', 'Semanal'],
  'Uma vez daqui a': ['Once, in', 'Una vez dentro de'],
  'Prompt entregue ao agente (ex.: "rode os testes e me avise se algo quebrou")': ['Prompt delivered to the agent (e.g. "run the tests and tell me if anything broke")', 'Prompt entregado al agente (ej.: "ejecuta los tests y avísame si algo se rompió")'],
  'Prompts agendados entregues a um agente. Se o agente estiver ocupado, o disparo é pulado. Agentes também criam rotinas com': ['Scheduled prompts delivered to an agent. If the agent is busy, the run is skipped. Agents can also create routines with', 'Prompts programados entregados a un agente. Si el agente está ocupado, la ejecución se omite. Los agentes también crean rutinas con'],
  'Lembrete': ['Reminder', 'Recordatorio'],
  'Lembrete do Regente': ['Regente reminder', 'Recordatorio de Regente'],
  '(terminal removido)': ['(terminal removed)', '(terminal eliminada)'],
  'a cada {n} min': ['every {n} min', 'cada {n} min'],
  'diário {h}': ['daily {h}', 'diario {h}'],
  'uma vez': ['once', 'una vez'],
  'próx. {h}': ['next {h}', 'próx. {h}'],
  'pausada': ['paused', 'pausada'],
  'Pausar': ['Pause', 'Pausar'],
  'Ativar': ['Enable', 'Activar'],
  '{n} execuções · último: {r}': ['{n} runs · last: {r}', '{n} ejecuciones · último: {r}'],
  'ok': ['ok', 'ok'],
  'terminal não está rodando': ['terminal is not running', 'la terminal no está en ejecución'],
  'pulado: terminal ocupado': ['skipped: terminal busy', 'omitido: terminal ocupada'],
  'Nenhuma rotina.': ['No routines.', 'No hay rutinas.'],
  'Nova rotina': ['New routine', 'Nueva rutina'],
  'Escreva o prompt': ['Write the prompt', 'Escribe el prompt'],
  'Rotina criada': ['Routine created', 'Rutina creada'],
  'Criar rotina': ['Create routine', 'Crear rutina'],
  'intervalo inválido (use 45s, 30m, 2h, 1h30m; mínimo 10s)': ['invalid interval (use 45s, 30m, 2h, 1h30m; minimum 10s)', 'intervalo inválido (usa 45s, 30m, 2h, 1h30m; mínimo 10s)'],
  'informe --every, --daily HH:MM, --weekly mon,wed@HH:MM ou --once <atraso>': ['provide --every, --daily HH:MM, --weekly mon,wed@HH:MM or --once <delay>', 'indica --every, --daily HH:MM, --weekly mon,wed@HH:MM o --once <retraso>'],

  // ---------- Ponto ----------
  'Ponto está lendo o terminal…': ['The Prompter is reading the terminal…', 'El Apuntador está leyendo la terminal…'],
  'Enviado para {name}': ['Sent to {name}', 'Enviado a {name}'],
  'Ir para o agente →': ['Go to the agent →', 'Ir al agente →'],
  'assistente: tempo esgotado': ['assistant: timed out', 'asistente: tiempo agotado'],

  // ---------- notificações e prompt dos agentes (processo principal) ----------
  '{name} precisa de você': ['{name} needs you', '{name} te necesita'],
  '{name} terminou': ['{name} finished', '{name} terminó'],
  '# Seu papel: {name}': ['# Your role: {name}', '# Tu rol: {name}'],
  [`# Regente
Você está rodando dentro do Regente, um canvas onde vários agentes de IA trabalham juntos. Seu nome no canvas é "{title}" (workspace "{ws}").
Você conversa com os nós conectados a você (outros agentes, notas e portais de navegador) pela CLI \`regente\` no shell:
- \`regente peers\` lista quem está conectado; \`regente --help\` mostra tudo.
- \`regente ask <nome> "<tarefa>"\` delega e espera a resposta; \`regente send <nome> "<msg>"\` só avisa.
- \`regente note <nota> append "<texto>"\` registra progresso/decisões numa nota conectada.
- \`regente portal <portal> snapshot|click <ref>|type <ref> <texto>|goto <url>\` controla um navegador conectado.
- \`regente spawn claude --name <nome> --task "<tarefa>"\` cria um novo ajudante conectado a você.
Quando chegar uma mensagem "[Regente] Tarefa de ... (id m-...)", faça a tarefa e SEMPRE finalize com \`regente reply <id> "<resultado>"\`.
Se não houver nada conectado, apenas trabalhe normalmente e aguarde instruções do usuário.`]: [
    `# Regente
You are running inside Regente, a canvas where several AI agents work together. Your name on the canvas is "{title}" (workspace "{ws}").
You talk to the nodes connected to you (other agents, notes and browser portals) through the \`regente\` CLI in the shell:
- \`regente peers\` lists who is connected; \`regente --help\` shows everything.
- \`regente ask <name> "<task>"\` delegates and waits for the answer; \`regente send <name> "<msg>"\` just notifies.
- \`regente note <note> append "<text>"\` records progress/decisions in a connected note.
- \`regente portal <portal> snapshot|click <ref>|type <ref> <text>|goto <url>\` controls a connected browser.
- \`regente spawn claude --name <name> --task "<task>"\` creates a new helper connected to you.
When a message "[Regente] Task from ... (id m-...)" arrives, do the task and ALWAYS finish with \`regente reply <id> "<result>"\`.
If nothing is connected, just work normally and wait for the user's instructions.`,
    `# Regente
Estás ejecutándote dentro de Regente, un canvas donde varios agentes de IA trabajan juntos. Tu nombre en el canvas es "{title}" (workspace "{ws}").
Conversas con los nodos conectados a ti (otros agentes, notas y portales de navegador) mediante la CLI \`regente\` en el shell:
- \`regente peers\` lista quién está conectado; \`regente --help\` muestra todo.
- \`regente ask <nombre> "<tarea>"\` delega y espera la respuesta; \`regente send <nombre> "<msg>"\` solo avisa.
- \`regente note <nota> append "<texto>"\` registra progreso/decisiones en una nota conectada.
- \`regente portal <portal> snapshot|click <ref>|type <ref> <texto>|goto <url>\` controla un navegador conectado.
- \`regente spawn claude --name <nombre> --task "<tarea>"\` crea un nuevo ayudante conectado a ti.
Cuando llegue un mensaje "[Regente] Tarea de ... (id m-...)", haz la tarea y SIEMPRE termina con \`regente reply <id> "<resultado>"\`.
Si no hay nada conectado, simplemente trabaja con normalidad y espera instrucciones del usuario.`],
  // ---------- mensagens entre agentes (barramento) ----------
  '[Regente] Mensagem de "{from}":\n{text}\n\n(Se precisar responder: regente send "{from}" "<mensagem>")': [
    '[Regente] Message from "{from}":\n{text}\n\n(If you need to reply: regente send "{from}" "<message>")',
    '[Regente] Mensaje de "{from}":\n{text}\n\n(Si necesitas responder: regente send "{from}" "<mensaje>")'],
  '[Regente] Mensagem de "{from}" para todos:\n{text}': ['[Regente] Message from "{from}" to everyone:\n{text}', '[Regente] Mensaje de "{from}" para todos:\n{text}'],
  '[Regente] Tarefa de "{from}" (id {id}):\n{text}\n\nIMPORTANTE: quando terminar, entregue o resultado rodando no shell:\nregente reply {id} "<resultado resumido>"   (ou: echo "<resultado longo>" | regente reply {id} -)': [
    '[Regente] Task from "{from}" (id {id}):\n{text}\n\nIMPORTANT: when you finish, deliver the result by running in the shell:\nregente reply {id} "<short result>"   (or: echo "<long result>" | regente reply {id} -)',
    '[Regente] Tarea de "{from}" (id {id}):\n{text}\n\nIMPORTANTE: cuando termines, entrega el resultado ejecutando en el shell:\nregente reply {id} "<resultado resumido>"   (o: echo "<resultado largo>" | regente reply {id} -)'],
  '[Regente] Tarefa de "{from}":\n{text}': ['[Regente] Task from "{from}":\n{text}', '[Regente] Tarea de "{from}":\n{text}'],
  '[Regente] Rotina agendada:\n{prompt}': ['[Regente] Scheduled routine:\n{prompt}', '[Regente] Rutina programada:\n{prompt}'],
  'entregue': ['delivered', 'entregado'],
  'na fila (destino está {status}); será entregue quando ficar ocioso': ['queued (target is {status}); it will be delivered when it becomes idle', 'en cola (el destino está {status}); se entregará cuando quede inactivo'],
  'resposta entregue': ['reply delivered', 'respuesta entregada'],
  'token inválido: este terminal não pertence ao Regente aberto': ['invalid token: this terminal doesn\'t belong to the running Regente', 'token inválido: esta terminal no pertenece al Regente abierto'],
  'comando desconhecido: {cmd}': ['unknown command: {cmd}', 'comando desconocido: {cmd}'],
  'nó removido do canvas': ['node removed from the canvas', 'nodo eliminado del canvas'],
  'informe o destino (nome do nó conectado)': ['provide the target (name of the connected node)', 'indica el destino (nombre del nodo conectado)'],
  'nenhum': ['none', 'ninguno'],
  '"{ref}" não está conectado a você. Conectados: {names}': ['"{ref}" is not connected to you. Connected: {names}', '"{ref}" no está conectado a ti. Conectados: {names}'],
  '"{name}" é {type}, não {want}': ['"{name}" is a {type}, not a {want}', '"{name}" es {type}, no {want}'],
  'o terminal "{name}" não está rodando': ['terminal "{name}" is not running', 'la terminal "{name}" no está en ejecución'],
  'nenhuma tarefa pendente com id {id} (talvez tenha expirado). Use: regente send <nome> "<texto>"': ['no pending task with id {id} (it may have expired). Use: regente send <name> "<text>"', 'ninguna tarea pendiente con id {id} (quizá expiró). Usa: regente send <nombre> "<texto>"'],
  'op de nota: read | write | append': ['note op: read | write | append', 'op de nota: read | write | append'],
  'nota "{name}" atualizada ({n} caracteres)': ['note "{name}" updated ({n} characters)', 'nota "{name}" actualizada ({n} caracteres)'],
  'lembrete': ['reminder', 'recordatorio'],
  'rotina removida': ['routine removed', 'rutina eliminada'],
  'rotina não encontrada': ['routine not found', 'rutina no encontrada'],
  'rotina {id} criada; próxima execução: {next}': ['routine {id} created; next run: {next}', 'rutina {id} creada; próxima ejecución: {next}'],
  'uso: regente routine list | add ... | rm <id>': ['usage: regente routine list | add ... | rm <id>', 'uso: regente routine list | add ... | rm <id>'],
  'agente desconhecido: {agent}. Disponíveis: {list}': ['unknown agent: {agent}. Available: {list}', 'agente desconocido: {agent}. Disponibles: {list}'],
  'papel desconhecido: {role}': ['unknown role: {role}', 'rol desconocido: {role}'],
  'portal não está aberto na tela (abra o workspace dele)': ['portal is not open on screen (open its workspace)', 'el portal no está abierto en pantalla (abre su workspace)'],
  'ref {ref} não encontrada; rode "portal snapshot" de novo': ['ref {ref} not found; run "portal snapshot" again', 'ref {ref} no encontrada; ejecuta "portal snapshot" de nuevo'],
  'certificado HTTPS inválido em {url}. Peça ao usuário para clicar em "Confiar" no portal.': ['invalid HTTPS certificate at {url}. Ask the user to click "Trust" in the portal.', 'certificado HTTPS inválido en {url}. Pide al usuario que haga clic en "Confiar" en el portal.'],
  'ação de portal desconhecida: {action}': ['unknown portal action: {action}', 'acción de portal desconocida: {action}'],

  // ---------- CLI regente ----------
  'fora de um terminal do Regente (REGENTE_SOCK/REGENTE_TOKEN ausentes)': ['outside a Regente terminal (REGENTE_SOCK/REGENTE_TOKEN missing)', 'fuera de una terminal de Regente (faltan REGENTE_SOCK/REGENTE_TOKEN)'],
  'não consegui falar com o Regente: {msg}': ['couldn\'t reach Regente: {msg}', 'no pude comunicarme con Regente: {msg}'],
  '(nenhum nó conectado)': ['(no connected nodes)', '(ningún nodo conectado)'],
  'papel: {role}': ['role: {role}', 'rol: {role}'],
  '{from} terminou o turno sem "regente reply". Fim da tela dele:': ['{from} ended its turn without "regente reply". End of its screen:', '{from} terminó su turno sin "regente reply". Final de su pantalla:'],
  'Resposta de {from}:': ['Reply from {from}:', 'Respuesta de {from}:'],
  'Sem resposta dentro do tempo (status: {status}). Fim da tela do destino:': ['No reply in time (status: {status}). End of the target\'s screen:', 'Sin respuesta a tiempo (estado: {status}). Final de la pantalla del destino:'],
  'método não suportado': ['method not supported', 'método no soportado'],
  'erro:': ['error:', 'error:'],
  'Lista os nós conectados a você no canvas (terminais/agentes, notas, portais) e seus estados.': ['Lists the nodes connected to you on the canvas (terminals/agents, notes, portals) and their states.', 'Lista los nodos conectados a ti en el canvas (terminales/agentes, notas, portales) y sus estados.'],
  'Envia uma mensagem a um agente conectado (não espera resposta).': ['Sends a message to a connected agent (doesn\'t wait for a reply).', 'Envía un mensaje a un agente conectado (no espera respuesta).'],
  'Delega uma tarefa a um agente conectado e espera a resposta dele.': ['Delegates a task to a connected agent and waits for its reply.', 'Delega una tarea a un agente conectado y espera su respuesta.'],
  'Responde a uma tarefa recebida (id m-...).': ['Replies to a received task (id m-...).', 'Responde a una tarea recibida (id m-...).'],
  'Lê a tela de um terminal, o conteúdo de uma nota ou o texto de um portal conectado.': ['Reads a terminal\'s screen, a note\'s content or a connected portal\'s text.', 'Lee la pantalla de una terminal, el contenido de una nota o el texto de un portal conectado.'],
  'Espera um terminal conectado ficar ocioso.': ['Waits for a connected terminal to become idle.', 'Espera a que una terminal conectada quede inactiva.'],
  'Lê/escreve/anexa numa nota conectada.': ['Reads/writes/appends to a connected note.', 'Lee/escribe/agrega en una nota conectada.'],
  'Controla um portal (navegador) conectado. Ações: goto, snapshot, text, click, type, key, scroll, eval, screenshot, back, reload, url.': ['Controls a connected portal (browser). Actions: goto, snapshot, text, click, type, key, scroll, eval, screenshot, back, reload, url.', 'Controla un portal (navegador) conectado. Acciones: goto, snapshot, text, click, type, key, scroll, eval, screenshot, back, reload, url.'],
  'Agenda prompts recorrentes. op=add (prompt + every|daily|weekly|once, terminal opcional), list ou rm (id).': ['Schedules recurring prompts. op=add (prompt + every|daily|weekly|once, optional terminal), list or rm (id).', 'Programa prompts recurrentes. op=add (prompt + every|daily|weekly|once, terminal opcional), list o rm (id).'],
  'Mostra um status curto no seu nó do canvas.': ['Shows a short status on your canvas node.', 'Muestra un estado corto en tu nodo del canvas.'],
  'Cria um novo agente conectado a você, opcionalmente com uma tarefa.': ['Creates a new agent connected to you, optionally with a task.', 'Crea un nuevo agente conectado a ti, opcionalmente con una tarea.'],
  [`regente — orquestração entre agentes no canvas do Regente

Você só enxerga nós conectados a você por uma linha no canvas.

  regente whoami                         quem sou eu, workspace, conectados
  regente peers                          lista nós conectados (terminais, notas, portais) e estado
  regente send <nome> <texto|->          manda mensagem (enfileira se o destino estiver ocupado)
  regente ask <nome> <texto|-> [--timeout s]
                                         delega uma tarefa e ESPERA a resposta (regente reply)
  regente reply <id> <texto|->           responde uma tarefa recebida via ask
  regente broadcast <texto|->            manda para todos os terminais conectados
  regente read <nome> [--lines N]        lê a tela de um terminal / conteúdo de nota / texto de portal
  regente wait <nome> [--timeout s]      espera o terminal ficar ocioso e mostra o fim da tela
  regente keys <nome> <tecla...>         teclas cruas (enter, esc, tab, up, down, ctrl-c, "1"...)
  regente note <nome> read|write|append [texto|-]
  regente portal <nome> <ação> ...       goto <url> | snapshot | text | click <ref> |
                                         type <ref> <texto> [--submit] [--clear] | key <Tecla> |
                                         scroll [dy] | eval <js> | screenshot [arquivo] | back | reload | url
  regente status <texto>                 mostra um status curto no seu nó do canvas
  regente spawn <agente> [--name N] [--role R] [--cwd D] [--task T]
                                         cria um novo agente conectado a você (claude, codex, gemini, opencode, shell)
  regente routine add "<prompt>" (--every 30m | --daily 09:00 | --weekly mon,fri@18:00 | --once 10m)
                  [--terminal <nome>] [--reminder] [--count N] [--until 2026-12-31] [--no-skip-if-busy]
  regente routine list | rm <id>         prompts agendados (padrão: entregues no seu próprio terminal)
  regente mcp                            servidor MCP (stdio) com as mesmas ferramentas

Use "-" no lugar do texto para ler do stdin.`]: [`regente — orchestration between agents on the Regente canvas

You only see nodes connected to you by a line on the canvas.

  regente whoami                         who am I, workspace, connected nodes
  regente peers                          lists connected nodes (terminals, notes, portals) and their state
  regente send <name> <text|->           sends a message (queued if the target is busy)
  regente ask <name> <text|-> [--timeout s]
                                         delegates a task and WAITS for the reply (regente reply)
  regente reply <id> <text|->            replies to a task received via ask
  regente broadcast <text|->             sends to every connected terminal
  regente read <name> [--lines N]        reads a terminal's screen / note content / portal text
  regente wait <name> [--timeout s]      waits for the terminal to go idle and shows the end of its screen
  regente keys <name> <key...>           raw keys (enter, esc, tab, up, down, ctrl-c, "1"...)
  regente note <name> read|write|append [text|-]
  regente portal <name> <action> ...     goto <url> | snapshot | text | click <ref> |
                                         type <ref> <text> [--submit] [--clear] | key <Key> |
                                         scroll [dy] | eval <js> | screenshot [file] | back | reload | url
  regente status <text>                  shows a short status on your canvas node
  regente spawn <agent> [--name N] [--role R] [--cwd D] [--task T]
                                         creates a new agent connected to you (claude, codex, gemini, opencode, shell)
  regente routine add "<prompt>" (--every 30m | --daily 09:00 | --weekly mon,fri@18:00 | --once 10m)
                  [--terminal <name>] [--reminder] [--count N] [--until 2026-12-31] [--no-skip-if-busy]
  regente routine list | rm <id>         scheduled prompts (default: delivered to your own terminal)
  regente mcp                            MCP server (stdio) with the same tools

Use "-" instead of the text to read from stdin.`, `regente — orquestación entre agentes en el canvas de Regente

Solo ves los nodos conectados a ti por una línea en el canvas.

  regente whoami                         quién soy, workspace, conectados
  regente peers                          lista nodos conectados (terminales, notas, portales) y su estado
  regente send <nombre> <texto|->        envía un mensaje (en cola si el destino está ocupado)
  regente ask <nombre> <texto|-> [--timeout s]
                                         delega una tarea y ESPERA la respuesta (regente reply)
  regente reply <id> <texto|->           responde una tarea recibida vía ask
  regente broadcast <texto|->            envía a todas las terminales conectadas
  regente read <nombre> [--lines N]      lee la pantalla de una terminal / contenido de nota / texto de portal
  regente wait <nombre> [--timeout s]    espera a que la terminal quede inactiva y muestra el final de la pantalla
  regente keys <nombre> <tecla...>       teclas crudas (enter, esc, tab, up, down, ctrl-c, "1"...)
  regente note <nombre> read|write|append [texto|-]
  regente portal <nombre> <acción> ...   goto <url> | snapshot | text | click <ref> |
                                         type <ref> <texto> [--submit] [--clear] | key <Tecla> |
                                         scroll [dy] | eval <js> | screenshot [archivo] | back | reload | url
  regente status <texto>                 muestra un estado corto en tu nodo del canvas
  regente spawn <agente> [--name N] [--role R] [--cwd D] [--task T]
                                         crea un nuevo agente conectado a ti (claude, codex, gemini, opencode, shell)
  regente routine add "<prompt>" (--every 30m | --daily 09:00 | --weekly mon,fri@18:00 | --once 10m)
                  [--terminal <nombre>] [--reminder] [--count N] [--until 2026-12-31] [--no-skip-if-busy]
  regente routine list | rm <id>         prompts programados (por defecto: entregados en tu propia terminal)
  regente mcp                            servidor MCP (stdio) con las mismas herramientas

Usa "-" en lugar del texto para leer de stdin.`],
});
