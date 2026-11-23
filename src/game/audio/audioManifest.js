// Caminhos relativos a public/. Enquanto o valor for null, o AudioManager usa o
// sintetizador existente (GameAudio). Para usar MP3, coloque o arquivo em
// public/audio/... e troque null pelo caminho, por exemplo:
//
//   level1: 'audio/music/level1.mp3',
//   ring: 'audio/sfx/ring.mp3',
//
// O carregamento só começa depois da primeira interação do jogador.
export const AUDIO_MANIFEST = {
  music: {
    menu: null,
    level1: null,
    level2: null,
    boss: null,
    win: null,
    lose: null,
  },
  sfx: {
    ring: null,
    jump: null,
    land: null,
    brake: null,
    stomp: null,
    hit: null,
    camera: null,
    pause: null,
    resume: null,
    win: null,
    lose: null,
    click: null,
  },
};
