import Phaser from "phaser";
import { MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS } from "@mundo/shared";

export class RoomGameScene extends Phaser.Scene {
  constructor() {
    super("room-game-scene");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#07111b");

    const graphics = this.add.graphics();
    graphics.fillStyle(0x0b1930, 0.92);
    graphics.lineStyle(6, 0x7cd8ff, 0.22);
    graphics.fillCircle(MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS);
    graphics.strokeCircle(MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS);

    graphics.lineStyle(4, 0xffffff, 0.18);
    graphics.beginPath();
    graphics.moveTo(MAP_CENTER_X, MAP_CENTER_Y - MAP_RADIUS);
    graphics.lineTo(MAP_CENTER_X, MAP_CENTER_Y + MAP_RADIUS);
    graphics.strokePath();

    graphics.fillStyle(0x47b8ff, 0.12);
    graphics.slice(MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS - 10, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(270), false);
    graphics.fillPath();

    graphics.fillStyle(0xff6d5e, 0.12);
    graphics.slice(MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS - 10, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(90), false);
    graphics.fillPath();

    const title = this.add.text(width / 2, 88, "문도피구 전장 프리뷰", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "34px",
      color: "#f4f7fb"
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(width / 2, 130, "스프린트 2에서 카운트다운, 이동, 플레이어 렌더링이 여기에 붙습니다.", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "16px",
      color: "#9fb2c8",
      align: "center"
    });
    subtitle.setOrigin(0.5);

    const blueLabel = this.add.text(MAP_CENTER_X - 150, MAP_CENTER_Y, "BLUE TEAM", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "22px",
      color: "#86dbff"
    });
    blueLabel.setOrigin(0.5);

    const redLabel = this.add.text(MAP_CENTER_X + 150, MAP_CENTER_Y, "RED TEAM", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "22px",
      color: "#ffb2aa"
    });
    redLabel.setOrigin(0.5);

    const footer = this.add.text(width / 2, height - 56, "우측 패널 참가자 정보는 React가, 전장 캔버스는 Phaser가 담당합니다.", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "14px",
      color: "#9fb2c8"
    });
    footer.setOrigin(0.5);
  }
}
