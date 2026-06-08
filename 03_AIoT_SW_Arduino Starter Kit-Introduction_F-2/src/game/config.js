import Phaser from 'phaser';
import { BASE, COLORS, SCENES } from '../shared/theme.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import SplashScene from './scenes/SplashScene.js';
import TitleScene from './scenes/TitleScene.js';
import LoginScene from './scenes/LoginScene.js';
import ColdOpenScene from './scenes/ColdOpenScene.js';
import ShipScene from './scenes/ShipScene.js';
import MissionHostScene from './scenes/MissionHostScene.js';
import ComingSoonScene from './scenes/ComingSoonScene.js';
import EpisodeScene from './scenes/EpisodeScene.js';

// 해상도 1280×720, FIT + CENTER_BOTH (스펙 §2)
export default {
  type: Phaser.AUTO,            // WebGL 우선, 실패 시 Canvas
  parent: 'game',
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE.w,
    height: BASE.h,
  },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, PreloadScene, SplashScene, TitleScene, LoginScene, ColdOpenScene, ShipScene, MissionHostScene, EpisodeScene, ComingSoonScene],
};

export { SCENES };
