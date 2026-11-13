# Relatório 4 de Computação Gráfica: Cinos the Hedgehog 2

## Evolução em relação às entregas anteriores

Uma vez que todas as requisições solicitadas pela entrega 4 já foram implementadas previamente, esta etapa foi voltada para o desenvolvimento de outras funcionalidades essenciais para o jogo. O código foi refatorado em uma ideia de *mini-engine*, na qual os elementos do jogo foram divididos em lógica e visual.

## Arquitetura refatorada

De forma resumida, os elementos do jogo foram organizados em seção lógica e seção visual. Essa decisão foi feita com o objetivo de permitir um melhor tratamento de interação entre elementos e maior consistência desses componentes. Uma das principais alterações foi a definição de entidades: toda entidade é encapsulada por uma classe `Entity`, a qual armazena lógica e aspectos visuais. 

A parte lógica armazena informações de funcionamento de uma entidade: posição no espaço, dimensões de hitbox, velocidade instantânea e lógica de movimentação. As subclasses de `EntityLogic` são responsáveis por introduzir especificações sobre o comportamento daquela entidade. Seguindo a mesma ideia, `EntityModel` é responsável por traduzir as informações em uma visualização gráfica.

### Geração de chunks

Como parte da refatoração, foi introduzida a mecâncica de geração aleatória de *chunks*. Conforme a ideia introduzida previamente, a lógica é tratada na classe `Terrain`, enquanto `TerrainModel` desenha os *chunks* definidos pela lógica. No momento, existem apenas três tipos de terreno possíveis: reto, subida e descida.

Vale ressaltar que, agora, a espessura do terreno é fixa. Essa decisão visa se aproximar do visual original da referência do projeto.

### Jogabilidade atual

A mesma jogabilidade anterior foi mantida, adaptada para o código refatorado. Somado a isso, foi introduzida uma mecânica de incremento de velocidade do personagem principal. A velocidade máxima atingível por aceleração padrão é 20 unidades por segundo. Entretanto, em descidas, o personagem pode ultrapassar esse limite indefinidamente.

A fim de promover um manuseio estratégico dessa oportunidade de aceleração, o personagem pode manter essa velocidade em retas, mas é capaz de perdê-la em subidas. Isso permite uma *gameplay* com maior cuidado com a movimentação do personagem. Atualmente, a perda de velocidade pode ser totalmente evitada ao pular continuamente em subidas, uma vez que o movimento no ar não reduz velocidade horizontal.

### Modelos de entidades

Os modelos do Sonic e do Buzz Bomber são exemplares encontrados em pesquisa, tendo seus criadores originais referenciados tanto em um arquivo de documentação do projeto na página do Github quanto na própria página do jogo.

Como os modelos possuem animações, esses sprites foram utilizados para tornar a jogabilidade mais responsiva.
