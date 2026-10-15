# Diretrizes e trilha do jogo

## Objetivo e escopo

Criar um *endless runner* 3D inspirado no jogo feito em Scratch: o personagem corre automaticamente, salta para evitar espinhos e robôs, acumula distância e perde ao colidir. O projeto deve ser demonstrável a cada entrega semanal e cumprir explicitamente os requisitos da disciplina: dois personagens 3D complexos, câmeras em posições diferentes, projeção perspectiva, múltiplas luzes e texturas, jogabilidade, pontuação e conclusão.

O escopo mínimo é uma pista, um comando de salto, dois tipos de obstáculo, um protagonista e um robô inimigo. Deslizar, trocar de faixa, poderes, fases adicionais, áudio e efeitos especiais ficam para depois da versão completa. Evitar depender de recursos extras para satisfazer um requisito obrigatório.

## Decisões de projeto

| Tema | Diretriz |
| --- | --- |
| Tecnologia | Preferir Three.js, permitido pela especificação, para concentrar o trabalho no jogo e nos conceitos gráficos. Confirmar com o professor apenas se houver expectativa específica de WebGL puro. O protótipo atual inicializa WebGL2, mas ainda não contém mecânicas a preservar. |
| Primeira versão | Começar com uma cena 3D simples. A movimentação pode ficar restrita a avanço e salto, mantendo a lógica enxuta sem criar uma implementação 2D separada. |
| Mundo | Adotar uma convenção única: X representa o avanço, Y a altura e Z a profundidade. Registrar unidades e velocidades em um só lugar. |
| Personagens | Criar um protagonista e um robô com silhuetas reconhecíveis, múltiplas partes e ao menos animações essenciais. Espinhos são obstáculos, não contam como personagem complexo. |
| Câmeras | Usar uma câmera lateral em perspectiva durante o jogo e oferecer outra posição, por exemplo em três quartos, selecionável pelo jogador. Ambas precisam mostrar profundidade de forma perceptível. |
| Iluminação e materiais | Usar ao menos duas fontes de luz com funções visuais distintas e mais de uma textura aplicada a objetos da cena. Testar a legibilidade dos obstáculos sob ambas as câmeras. |
| Recursos | Guardar modelos, texturas e sons em `assets/`. Registrar autoria e licença de recursos externos; preferir arte própria ou com permissão clara, especialmente para personagens inspirados em franquias existentes. |

## Modos e regras compartilhadas

Os modos **distância** e **infinito** devem usar os mesmos controles, movimento, obstáculos, colisões e cálculo de pontuação. Apenas a condição de vitória e, se necessário, a curva de dificuldade mudam. Escolher o modo antes da partida e permitir reiniciar no mesmo modo ou voltar ao menu.

- **Distância:** definir uma meta configurável de percurso. Vencer ao alcançá-la sem colidir; mostrar a distância final e uma tela de vitória. Uma colisão antes da meta encerra a tentativa como derrota.
- **Infinito:** não há vitória nem distância máxima. A partida termina somente por colisão; mostrar a distância alcançada e o recorde da sessão. A dificuldade pode crescer gradualmente, mas deve ter limites para preservar obstáculos evitáveis.
- **Pontuação:** usar a distância percorrida como métrica principal, exibida continuamente nos dois modos. Contar apenas o avanço durante a partida ativa; pausar, perder ou vencer congela o resultado. Bônus são opcionais.

Definir estados explícitos de menu, partida, pausa, vitória e derrota. Uma transição de estado deve ocorrer uma única vez, para evitar pontuação após o fim ou colisões repetidas. O gerador de obstáculos deve manter espaçamento compatível com o tempo de reação e a duração do salto.

## Organização sugerida

```text
src/
  main.js          inicialização e ligação entre sistemas
  game/            estado, modos, pontuação, dificuldade e colisões
  entities/        jogador, robô e obstáculos
  input/           comandos do jogador
  rendering/       cena, câmeras, luzes, modelos e animação visual
  ui/              menu, placar e telas de fim
assets/
  models/          personagens e objetos 3D
  textures/        texturas da pista, cenário e personagens
  audio/           sons opcionais
docs/             decisões, planejamento e evidências das entregas
```

Separar as **regras** da **apresentação**: posição, velocidade, salto, colisão e pontuação pertencem ao jogo; malhas, materiais, luzes e câmeras representam esse estado. Classes são úteis para entidades com comportamento próprio, mas evitar heranças profundas ou uma classe para cada detalhe. Manter `main.js` pequeno e evitar que regras dependam de elementos HTML ou objetos da biblioteca gráfica.

## Trilha de oito semanas

| Semana | Entrega verificável |
| --- | --- |
| 1 | Cena 3D em perspectiva, pista, personagem provisório, movimento automático e salto. Definir tecnologia e convenção de coordenadas. |
| 2 | Obstáculo provisório, colisão, derrota e reinício. Demonstrar um ciclo de jogo completo. |
| 3 | Placar por distância, menu e dois modos funcionais, incluindo vitória no modo distância. |
| 4 | Modelo e animação essenciais do protagonista; ajuste das colisões ao visual. |
| 5 | Robô 3D complexo e segundo obstáculo; geração com espaçamento justo. |
| 6 | Segunda câmera, múltiplas luzes e texturas; conferir cada requisito visual em execução. |
| 7 | Ajuste de dificuldade, interface final, recursos visuais e correções observadas nos testes. |
| 8 | Testes completos, documentação, apresentação e margem para imprevistos. |

Ao fim de cada semana, manter uma versão executável e registrar o que foi concluído, o que falta e uma captura ou vídeo curto da demonstração. Se houver atraso, reduzir variedade e acabamento antes de remover os requisitos obrigatórios.

## Critérios de verificação

Antes de considerar uma entrega pronta, executar o jogo no navegador e verificar o console. Testar salto e colisão em velocidades diferentes; derrota e reinício; vitória exatamente ao atingir a meta; ausência de vitória no infinito; placar congelado ao encerrar ou pausar; troca de câmeras; redimensionamento da janela; carregamento de modelos e texturas. Quando a lógica estiver separada da renderização, adicionar testes automatizados para transições de estado, pontuação, meta e geração de obstáculos. Não há ferramenta de testes configurada atualmente.

## Próximas decisões do grupo

Definir a meta inicial de distância por teste de jogabilidade, escolher como os modelos serão produzidos e combinar quem responde por regras, arte 3D, apresentação gráfica e integração. Registrar mudanças de escopo neste documento. A prioridade de toda decisão é manter os dois modos jogáveis e todos os requisitos da disciplina demonstráveis dentro do prazo.
