# Relatório de Computação Gráfica: Cinos the Hedgehog 2

**Integrantes:** Davi Santos, Felipe Estevanatto, Gabriel Delgado, Guilherme Seyfart e João Vitor Gomes.  
**Ferramentas:** Bun, Vite, Three.js, ESLint e GitHub Actions.

---

### Descrever como o personagem foi modelado
* **Estrutura de Hitbox e Gráfico de Cena:** O personagem não foi modelado manualmente por primitivas. Em vez disso, a sua modelagem visual utiliza um modelo tridimensional completo importado diretamente para o motor gráfico. Para a interação com o ambiente, foi desenvolvida uma caixa de colisão (*hitbox*) lógica e invisível. O modelo tridimensional do personagem fica inserido e acoplado dentro dessa hitbox, respeitando rigorosamente o conceito de Gráfico de Cena (*Scene Graph*) da Three.js (onde as transformações geométricas e a posição da malha seguem o nó pai da caixa de colisão).
* **Carregamento:** O carregamento do arquivo tridimensional do personagem é centralizado e instanciado na cena através do arquivo `SceneView.js`.

### Explicar quais primitivas geométricas, malhas ou modelos externos foram utilizados
* **Modelo Externo (Jogador):** Utilização de uma malha poligonal externa completa e importada do personagem Sonic (baseado no modelo 3D do Sketchfab e correspondente à imagem de referência).
* **Obstáculos Temporários:** Primitiva geométrica cúbica básica (`THREE.BoxGeometry`) na cor vermelha para atuar como marcadores de perigo.
* **Malhas do Terreno (Chunks):** Malhas customizadas geradas manualmente do zero via código através de `THREE.BufferGeometry`, calculando matrizes de vértices e triângulos para formar as seções do mapa.
* **Sorteio do Cenário:** O terreno usa um dicionário global e uma função lambda dentro de `ground.js` para escolher de forma aleatória e combinada quais blocos de cenário (*chunks* planos ou rampas lineares) vão aparecer em sequência, criando um percurso randomizado.
* **Texturas procedurais e Iluminação:** Geração de texturas xadrez e listradas estilizadas desenhadas via Canvas HTML 2D (`THREE.CanvasTexture`), iluminadas por fontes de luz `AmbientLight` e `DirectionalLight`.

### Descrever as principais dificuldades encontradas
* **Alinhamento no Gráfico de Cena:** Ajustar a escala, rotação e o ponto pivô do modelo tridimensional externo do Sonic para que ele fique perfeitamente posicionado e centralizado dentro da caixa da hitbox de movimentação.
* **Junção de Malhas Manuais:** Calcular os vértices da malha procedural do chão para que os blocos planos se conectem perfeitamente aos blocos de rampa inclinada, evitando lacunas, frestas ou problemas de renderização de faces (*backface culling*).
* **Otimização de Memória e Janela:** Controlar os eventos de redimensionamento da janela usando `CanvasResizer` com a interface `handleEvent` para evitar travamentos de desempenho, além de liberar explicitamente os dados de buffers da GPU ao deletar blocos antigos com o método `.dispose()`.

### Informar o que ainda falta implementar
* **Geração Procedural de Terreno:** Mudar a lógica de sorteio aleatório atual por uma geração procedural contínua e inteligente de relevos diretamente no arquivo `ground.js`.
* **Simulação de Física Avançada:** Criar a estrutura final de física do jogo, definindo se as forças de gravidade e velocidade serão processadas por um gerenciador central (*Handler*) ou aplicadas de forma distribuída dentro das próprias entidades.
* **Física por Parametrização Dupla:** Implementar a lógica que checa a posição do personagem em relação ao chão a cada quadro. Caso ele mude de bloco ou toque no solo, a sua altura $Y$ é atualizada de forma instantânea para o topo exato daquele bloco de chão.
* **Rotação por Vetor Normal:** Configurar o alinhamento de rotação do Sonic nas subidas e descidas, fazendo com que o corpo do personagem se incline de forma correta utilizando o vetor normal da superfície da rampa atual.
* **Interface do Usuário (HUD):** Programar o contador de anéis e o painel de distância percorrida conectando as variáveis à estrutura `<div id="hud">` do HTML.
