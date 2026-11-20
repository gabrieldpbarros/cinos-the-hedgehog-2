# Cinos the Hedgehog 2

> *Projeto acadêmico de Computação Gráfica inspirado na série Sonic the Hedgehog.*

### Integrantes

- [Davi Santos](https://github.com/davi-ssantos);
- [Felipe Estevanatto](https://github.com/FelipeEstevanatto);
- [Gabriel Delgado](https://github.com/gabrieldpbarros);
- [Guilherme Seyfart](https://github.com/gui247);
- [João Vitor Gomes](https://github.com/jvmgomes).

### Link público

https://gabrieldpbarros.github.io/cinos-the-hedgehog-2/

### Estado atual

O projeto é um jogo 3D de corrida com câmera em perspectiva, terreno procedural, Sonic animado em GLB, BuzzBombers, anéis e obstáculos.

- Movimento acelerado, frenagem, salto, giro, agachar e olhar para cima (parado) e duas câmeras.
- Coleta de anéis com HUD, saldo, espalhamento, recoleta e invulnerabilidade.
- Inimigos que podem ser derrotados ao pular/girar e espinhos que causam dano.
- Perda de anéis ao encostar em um perigo; sem saldo, a corrida termina.
- Vitória ao alcançar 1000 m, tela de resultados com tempo, anéis e nota.
- Pausa com lista de controles, botões para continuar/reiniciar e mute de som.
- Reinício por teclado ou botão após vitória, derrota ou pausa.
- HUD com distância, velocidade, anéis e cronômetro da fase.
- Efeitos e trilha chiptune originais sintetizados via Web Audio, sem samples de terceiros.
- Terreno com oito chunks ativos; o jogador pode voltar alguns trechos sem o mapa sumir.
- Hazards gerados longe da segunda câmera para não aparecerem “nascendo” na tela.

### Controles

| Ação | Teclas |
| --- | --- |
| Mover para a esquerda/direita | `A` / `D` ou `←` / `→` |
| Pular e girar | `Espaço` |
| Agachar (trava o movimento; a pose começa quando o Sonic para) | `S` ou `↓` |
| Olhar para cima (trava o movimento da mesma forma) | `W` ou `↑` |
| Trocar de câmera | `C` |
| Pausar/continuar | `P` ou `Esc` |
| Reiniciar na pausa | `R` |
| Reiniciar após vitória/derrota | `Espaço` ou `R` |
| Ligar/desligar som (na pausa) | `M` |

O menu de pausa repete esses atalhos em formato de teclas e oferece os botões **Continuar**, **Reiniciar** e **Som ligado/desligado**.

### Regras principais

- Cada anel coletado aumenta o saldo e o total de anéis da partida.
- Com saldo, o contato com BuzzBomber ou espinhos consome todos os anéis, espalha-os pelo cenário e concede 2 segundos de invulnerabilidade.
- Sem saldo, o contato com um perigo encerra a corrida.
- Pular sobre um BuzzBomber derrota o inimigo e dá um pequeno impulso vertical.
- As telas de vitória e derrota mostram **tempo**, **anéis carregados / total coletado** e calculam a nota de A a F por anéis por minuto.

### Instalação

Requisitos: Node.js 22 ou superior e npm.

```bash
git clone -b main git@github.com:gabrieldpbarros/cinos-the-hedgehog-2.git
cd cinos-the-hedgehog-2
npm ci
npm run dev
```

O Vite abre em `http://localhost:3001`.

### Verificações

```bash
npm test                  # 68 testes
npx eslint src tests      # análise estática
npm run build             # build de produção
```

O build usa a base `/cinos-the-hedgehog-2/` para o GitHub Pages. O deploy é feito pelo workflow `.github/workflows/deploy.yml` a cada push na `main`.

### Estrutura

```text
index.html                    canvas, HUD, overlay, fontes e créditos
src/main.js                   bootstrap, loop, HUD, pausa e menus
src/game/
  Game.js, Level.js           partida, estados, anéis, hazards e pontuação
  constants.js                parâmetros de movimento e tempo
  entities/Entity.js          ponte entre lógica e modelo
  logic/                      entrada, controladores, entidades e terreno
  rendering/                  cena, luzes, fundo procedural, modelos, anéis, obstáculos e áudio
public/fonts/                 fontes Bungee e Chakra Petch + licenças OFL
public/model-imports/         modelos e texturas
tests/                        testes Node da lógica e da apresentação
docs/                         arquitetura, relatórios, guias e créditos
```

### Recursos, créditos e licenças

- Modelo do Sonic: [lucasvicentedesilva2009](https://sketchfab.com/lucasvicentedesilva2009silva), sob CC BY 4.0.
- Modelo do BuzzBomber: [slider](https://sketchfab.com/sliderm).
- Modelo do anel: [A Burnt Piece Of Chicken](https://sketchfab.com/That_guy_in_your_walls), sob CC BY 4.0.
- Fontes **Bungee** e **Chakra Petch**: SIL Open Font License 1.1.
- Áudio: efeitos e trilha originais sintetizados no projeto; nenhuma gravação de Sonic é redistribuída.

Os detalhes e os textos integrais das licenças estão em [`docs/model-credits.md`](docs/model-credits.md) e [`docs/font-credits.md`](docs/font-credits.md). A implementação de áudio está em [`docs/audio.md`](docs/audio.md).

### Documentação

- [Arquitetura da engine](docs/arquitetura-engine.md)
- [Diretrizes do projeto](docs/guidelines.md)
- [Sistema de anéis](docs/rings.md)
- [Inimigos e obstáculos](docs/obstacles.md)
- [Áudio](docs/audio.md)
- [Créditos das fontes](docs/font-credits.md)
- [Montagem dos chunks](docs/montagem-chunks.md)
- [Fundo procedural, água e shaders](docs/fundo-procedural.md)
- [Guia de Three.js](docs/threejs-guide.md)

### Demonstração

O jogo está jogável no link público acima. O vídeo de demonstração da entrega deve ser vinculado nesta seção antes da submissão.
