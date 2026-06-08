import Phaser from 'phaser';
import { NUM, SCENES } from '../../shared/theme.js';
import { placeBg } from '../assets.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { showLogin, hideLogin } from '../../ui/login.js';

export default class LoginScene extends Phaser.Scene {
  constructor() { super(SCENES.LOGIN); }

  create() {
    fadeIn(this);
    placeBg(this, 'login-bg', NUM.bg);
    // 배경 아트에 'SYSTEM ACCESS / 접속 코드 입력' 안내가 포함됨 → 중복 텍스트·비네트 생략.

    // 8자리 클래스 코드 = DOM 오버레이 입력
    showLogin({
      onSubmit: (code) => {
        localStorage.setItem('playino.classCode', code);
        hideLogin();
        goTo(this, SCENES.SHIP, { classCode: code });
      },
    });

    this.events.once('shutdown', hideLogin);
  }
}
