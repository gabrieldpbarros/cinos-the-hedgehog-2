# Relatório 3 de Computação Gráfica: Cinos the Hedgehog 2

## Evolução em relação à entrega 2

Na segunda entrega, o projeto apresentava o modelo tridimensional do Sonic, uma cena inicial com terreno em blocos e texturas procedurais. Desde então, a cena passou a acompanhar o deslocamento do personagem e a oferecer uma segunda perspectiva de jogo.

## Câmeras

Além da câmera lateral, foi adicionada uma câmera oblíqua posicionada atrás e ao lado do Sonic, considerando o sentido de avanço do personagem. A tecla **C** alterna entre as duas perspectivas. Ambas usam projeção perspectiva e seguem a posição horizontal e a altura do terreno, mantendo o personagem enquadrado durante a subida das rampas.

## Iluminação e sombras

A iluminação passou de uma luz ambiente e uma luz direcional para **três fontes**: uma luz ambiente, uma luz direcional principal de tom quente e uma segunda luz direcional azulada para preenchimento. A luz principal projeta sombras sobre o personagem, o obstáculo e o terreno. Sua posição e seu alvo acompanham a altura do chão; os novos blocos gerados também são configurados para receber sombras. Esses ajustes preservam a iluminação ao longo das rampas e da expansão do percurso.

## Jogabilidade atual

O Sonic já pode se deslocar, acelerar, frear, agachar e pular. A altura do personagem acompanha o relevo quando ele está no chão, e novos blocos são acrescentados à frente conforme avança. Um obstáculo temporário permite testar a colisão e a tela de derrota, com reinício pela tecla **Espaço**. O HUD exibe distância percorrida, velocidade e estado da partida. O objetivo de conclusão do modo básico e os elementos definitivos de cenário e obstáculos ainda não estão implementados.
