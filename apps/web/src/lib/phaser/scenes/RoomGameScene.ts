import Phaser from "phaser";
import {
  MAP_CENTER_X,
  MAP_CENTER_Y,
  MAP_RADIUS,
  PLAYER_RADIUS,
  type GamePlayerSnapshot,
  type GameStateSnapshot
} from "@mundo/shared";

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  hpBar: Phaser.GameObjects.Rectangle;
}

export class RoomGameScene extends Phaser.Scene {
  private players = new Map<string, PlayerVisual>();
  private statusText?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
  private onMoveCommand: ((x: number, y: number) => void) | null = null;

  constructor() {
    super("room-game-scene");
  }

  setMoveHandler(handler: (x: number, y: number) => void) {
    this.onMoveCommand = handler;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#07111b");
    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown()) {
        return;
      }

      this.onMoveCommand?.(pointer.worldX, pointer.worldY);
    });

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
    graphics.slice(
      MAP_CENTER_X,
      MAP_CENTER_Y,
      MAP_RADIUS - 10,
      Phaser.Math.DegToRad(90),
      Phaser.Math.DegToRad(270),
      false
    );
    graphics.fillPath();

    graphics.fillStyle(0xff6d5e, 0.12);
    graphics.slice(
      MAP_CENTER_X,
      MAP_CENTER_Y,
      MAP_RADIUS - 10,
      Phaser.Math.DegToRad(-90),
      Phaser.Math.DegToRad(90),
      false
    );
    graphics.fillPath();

    const title = this.add.text(width / 2, 88, "문도피구 전장 프리뷰", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "34px",
      color: "#f4f7fb"
    });
    title.setOrigin(0.5);

    this.countdownText = this.add.text(width / 2, 136, "", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "26px",
      color: "#b9ff66"
    });
    this.countdownText.setOrigin(0.5);

    this.statusText = this.add.text(width / 2, height - 56, "게임 상태를 기다리는 중입니다.", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "14px",
      color: "#9fb2c8"
    });
    this.statusText.setOrigin(0.5);
  }

  updateSnapshot(snapshot: GameStateSnapshot) {
    if (!this.statusText || !this.countdownText) {
      return;
    }

    const nextPlayerIds = new Set(snapshot.players.map((player) => player.playerId));

    for (const [playerId, visual] of this.players.entries()) {
      if (nextPlayerIds.has(playerId)) {
        continue;
      }

      visual.container.destroy(true);
      this.players.delete(playerId);
    }

    snapshot.players.forEach((player) => {
      const visual = this.ensurePlayerVisual(player);
      this.updatePlayerVisual(visual, player);
    });

    if (snapshot.status === "countdown") {
      this.countdownText.setText(`시작까지 ${Math.ceil(snapshot.countdownRemaining)}초`);
    } else {
      this.countdownText.setText("");
    }

    this.statusText.setText(
      `상태 ${snapshot.status} · 남은 시간 ${snapshot.remainingTime.toFixed(1)}초 · 우클릭으로 이동`
    );
  }

  private ensurePlayerVisual(player: GamePlayerSnapshot) {
    const existing = this.players.get(player.playerId);

    if (existing) {
      return existing;
    }

    const body = this.add.circle(0, 0, PLAYER_RADIUS, player.team === "blue" ? 0x47b8ff : 0xff6d5e, 0.94);
    body.setStrokeStyle(4, 0xf4f7fb, 0.65);

    const hpBar = this.add.rectangle(0, PLAYER_RADIUS + 16, 52, 8, 0xb9ff66, 1);
    hpBar.setStrokeStyle(2, 0xffffff, 0.18);

    const label = this.add.text(0, -PLAYER_RADIUS - 22, player.nickname, {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "15px",
      color: "#f4f7fb",
      fontStyle: "700"
    });
    label.setOrigin(0.5);

    const container = this.add.container(player.x, player.y, [body, hpBar, label]);
    const visual = { container, label, hpBar };

    this.players.set(player.playerId, visual);
    return visual;
  }

  private updatePlayerVisual(visual: PlayerVisual, player: GamePlayerSnapshot) {
    visual.label.setText(player.nickname);
    visual.hpBar.width = Math.max(0, (player.hp / 4) * 52);
    visual.hpBar.fillColor = player.hp > 1 ? 0xb9ff66 : 0xffd166;
    visual.container.alpha = player.alive ? 1 : 0.4;

    visual.container.setPosition(player.x, player.y);
  }
}
