# Título

feat: completa ciclo de coleta, dano e recoleta de anéis

# Corpo da PR

O contato com BuzzBomber agora consome o saldo de anéis e aplica impulso com invulnerabilidade de dois segundos. Sem saldo, mantém a derrota existente. Anéis perdidos se espalham, quicam, podem ser recoletados após 64/60 s e expiram em 256/60 s.

## Resumo

- Integra o GLTF fornecido e creditado, com instâncias por chunk, grupos antes do inimigo e grupos para salto.
- Usa AABB independente do visual e colisão contínua, brilho em quatro etapas e som sintetizado com alternância estéreo.
- Limita o saldo a 999 e os espalhados ativos a 32; preserva o total de coletas no resultado, incluindo recoletas.
- Mantém pausa, controles, câmeras, terreno, chegada e reinício. Sem novas dependências.
- Documenta escala, conversões de física e adaptação angular em [docs/rings.md](https://github.com/gabrieldpbarros/cinos-the-hedgehog-2/blob/feat/Aneis/docs/rings.md).

## Testes

- `npm test`: 42 testes passaram.
- `npx eslint src` e `git diff --check`: passaram.
- `npm run build`: passou; aviso de bundle acima de 500 kB.
- Navegador: coleta, dano com/sem saldo, impulso/pouso, recoleta, expiração, pausa, reinício, salto, duas câmeras, resize, chunks e chegada. Console sem erros/avisos. Partida terminou com saldo 120 e total 123, nota A.
- A avaliação auditiva do timbre permanece manual; o Web Audio funcionou sem erros de console.

## Evidência visual

![Anéis na fase](https://github.com/gabrieldpbarros/cinos-the-hedgehog-2/raw/refs/heads/feat/Aneis/docs/evidence/rings-quarter.jpg)
![Recoleta](https://github.com/gabrieldpbarros/cinos-the-hedgehog-2/raw/refs/heads/feat/Aneis/docs/evidence/rings-recollection.jpg)
![Saldo e total independentes](https://github.com/gabrieldpbarros/cinos-the-hedgehog-2/raw/refs/heads/feat/Aneis/docs/evidence/rings-results.jpg)
![Derrota sem saldo](https://github.com/gabrieldpbarros/cinos-the-hedgehog-2/raw/refs/heads/feat/Aneis/docs/evidence/rings-defeat.jpg)

Capturas e relatório completo estão em `docs/evidence/` e `docs/rings.md`. Os links acima ficam disponíveis após o envio da branch `feat/Aneis`.
