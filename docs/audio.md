# Áudio

O jogo **não usa gravações ou trilhas ripadas dos jogos do Sonic**. Para evitar redistribuir material protegido por direitos autorais, os efeitos e a música são originais e sintetizados em tempo real com a Web Audio API. Não há arquivos de áudio de terceiros no projeto.

## Implementação

O `GameAudio` (`src/game/rendering/GameAudio.js`) mantém um `AudioContext` criado somente depois de uma interação do jogador, com barramentos separados para efeitos e música:

- `sfxBus`: efeitos curtos;
- `musicBus`: trilha de fundo;
- `master`: volume geral e mute.

O contexto é desbloqueado no primeiro `keydown` ou `pointerdown`. Se o navegador bloquear o áudio, o jogo continua normalmente sem erros.

## Efeitos

- Coleta de anel;
- salto;
- derrota de BuzzBomber;
- dano por inimigo/espinho;
- pausa e retomada;
- vitória;
- derrota;
- clique nos botões do menu.

## Música

A trilha é um loop chiptune original de 32 passos a 138 BPM, com linha de baixo e melodia. Ela começa quando a partida inicia, continua durante a pausa e para na vitória ou derrota, quando toca o jingle correspondente.

## Mute

- O botão **Som ligado / Som desligado** fica no menu de pausa.
- A tecla `M` também alterna o som enquanto o jogo está pausado.
- O estado é persistido em `localStorage` na chave `cinos.muted` e restaurado no próximo carregamento.
- O mute usa o ganho mestre, então afeta música e efeitos sem interromper a reprodução.

## Testes

`tests/game-audio.test.js` verifica a alternância e a persistência do estado de mute sem depender de um `AudioContext` real.
