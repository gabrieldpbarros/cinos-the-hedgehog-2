# Áudio

O jogo **não usa gravações ou trilhas ripadas dos jogos do Sonic**. Para evitar redistribuir material protegido por direitos autorais, os efeitos e a música padrão são originais e sintetizados em tempo real com a Web Audio API. O `AudioManager` já aceita arquivos MP3 próprios ou licenciados, mas nenhum arquivo de terceiros está versionado no projeto.

## Implementação

O `AudioManager` (`src/game/audio/AudioManager.js`) estende o `GameAudio` e compartilha o mesmo `AudioContext`, criado somente depois de uma interação do jogador. Os barramentos continuam separados:

- `sfxBus`: efeitos curtos;
- `musicBus`: trilha de fundo;
- `master`: volume geral e mute.

O contexto é desbloqueado no primeiro `keydown` ou `pointerdown`. Se o navegador bloquear o áudio, o jogo continua normalmente sem erros.

## Arquivos e fallback

O manifesto fica em `src/game/audio/audioManifest.js`. Cada entrada começa como `null`; nesse caso o som sintetizado correspondente é usado. Para ativar um arquivo, coloque-o em `public/audio/` e informe o caminho relativo:

```js
export const AUDIO_MANIFEST = {
  music: { level1: 'audio/music/level1.mp3' },
  sfx: { ring: 'audio/sfx/ring.mp3' },
};
```

O carregamento começa após o primeiro gesto do jogador. Um arquivo ausente ou inválido não bloqueia a partida: o `AudioManager` mantém o sintetizador para aquele som. Músicas são tocadas em loop com `AudioBufferSourceNode`; efeitos usam buffers decodificados no mesmo contexto.

## Efeitos

- Coleta de anel;
- salto, pouso e frenagem;
- derrota de BuzzBomber;
- dano por inimigo/espinho;
- pausa e retomada;
- vitória;
- derrota;
- troca de câmera;
- clique nos botões do menu.

## Música

A trilha é um loop chiptune original de 32 passos a 138 BPM, com linha de baixo e melodia. Ela começa quando a partida inicia, continua durante a pausa e para na vitória ou derrota, quando toca o jingle correspondente.

## Volume e mute

- O slider **Volume** e o botão **Som ligado / Som desligado** ficam no menu de pausa.
- A tecla `M` também alterna o mute enquanto o jogo está pausado.
- O volume geral é persistido em `localStorage` na chave `cinos.volume` (0 a 1); o mute usa `cinos.muted`.
- O mute e o volume usam o ganho mestre, então afetam música e efeitos sem interromper a reprodução.
- `Esc` abre e fecha a pausa. Enquanto o slider está focado, as setas ajustam o volume e não movem o Sonic.

## Testes

`tests/game-audio.test.js` verifica mute e persistência sem um `AudioContext` real. `tests/audio-manager.test.js` cobre volume, mute, fallback sintetizado e ciclo básico de música sem depender de arquivos MP3.
