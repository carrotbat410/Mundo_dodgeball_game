import Phaser from "phaser";
import {
  MAP_CENTER_X,
  MAP_CENTER_Y,
  MAP_RADIUS,
  PLAYER_RADIUS,
  PROJECTILE_RADIUS,
  type GamePlayerSnapshot,
  type GameStateSnapshot
} from "@mundo/shared";

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  hpSegments: Phaser.GameObjects.Rectangle[];
}

export class RoomGameScene extends Phaser.Scene {
  private players = new Map<string, PlayerVisual>();
  private projectiles = new Map<string, Phaser.GameObjects.Arc>();
  private previousHp = new Map<string, number>();
  private statusText?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
  private onMoveCommand: ((x: number, y: number) => void) | null = null;
  private onCastCommand: ((x: number, y: number) => void) | null = null;

  constructor() {
    super("room-game-scene");
  }

  setMoveHandler(handler: (x: number, y: number) => void) {
    this.onMoveCommand = handler;
  }

  setCastHandler(handler: (x: number, y: number) => void) {
    this.onCastCommand = handler;
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

    this.input.keyboard?.on("keydown-Q", () => {
      const pointer = this.input.activePointer;
      this.onCastCommand?.(pointer.worldX, pointer.worldY);
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

    const title = this.add.text(width / 2, 88, "문도피구 전장", {
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
      this.maybePlayHitEffect(player, visual);
      this.updatePlayerVisual(visual, player);
      this.previousHp.set(player.playerId, player.hp);
    });

    const nextProjectileIds = new Set(snapshot.projectiles.map((projectile) => projectile.projectileId));

    for (const [projectileId, visual] of this.projectiles.entries()) {
      if (nextProjectileIds.has(projectileId)) {
        continue;
      }

      visual.destroy();
      this.projectiles.delete(projectileId);
    }

    snapshot.projectiles.forEach((projectile) => {
      let visual = this.projectiles.get(projectile.projectileId);

      if (!visual) {
        this.playCastEffect(projectile.x, projectile.y, projectile.team === "blue" ? 0x9fe6ff : 0xffc2bb);
        visual = this.add.circle(
          projectile.x,
          projectile.y,
          PROJECTILE_RADIUS,
          projectile.team === "blue" ? 0x9fe6ff : 0xffc2bb,
          1
        );
        visual.setStrokeStyle(2, 0xffffff, 0.35);
        this.projectiles.set(projectile.projectileId, visual);
      }

      visual.setPosition(projectile.x, projectile.y);
    });

    if (snapshot.status === "countdown") {
      this.countdownText.setText(`시작까지 ${Math.ceil(snapshot.countdownRemaining)}초`);
    } else if (snapshot.status === "finished") {
      this.countdownText.setText("");
    } else {
      this.countdownText.setText("");
    }

    this.statusText.setText(
      `상태 ${snapshot.status} · 남은 시간 ${snapshot.remainingTime.toFixed(1)}초 · 우클릭 이동 / Q 발사`
    );
  }

  private ensurePlayerVisual(player: GamePlayerSnapshot) {
    const existing = this.players.get(player.playerId);

    if (existing) {
      return existing;
    }

    const body = this.add.circle(0, 0, PLAYER_RADIUS, player.team === "blue" ? 0x47b8ff : 0xff6d5e, 0.94);
    body.setStrokeStyle(4, 0xf4f7fb, 0.65);

    const hpSegments = [-18, -6, 6, 18].map((offset) => {
      const segment = this.add.rectangle(offset, PLAYER_RADIUS + 16, 10, 8, 0xb9ff66, 1);
      segment.setStrokeStyle(1, 0xffffff, 0.22);
      return segment;
    });

    const label = this.add.text(0, -PLAYER_RADIUS - 22, player.nickname, {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "15px",
      color: "#f4f7fb",
      fontStyle: "700"
    });
    label.setOrigin(0.5);

    const container = this.add.container(player.x, player.y, [body, ...hpSegments, label]);
    const visual = { container, label, hpSegments };

    this.players.set(player.playerId, visual);
    return visual;
  }

  private updatePlayerVisual(visual: PlayerVisual, player: GamePlayerSnapshot) {
    visual.label.setText(player.nickname);
    visual.hpSegments.forEach((segment, index) => {
      segment.setFillStyle(index < player.hp ? 0xb9ff66 : 0x415064, index < player.hp ? 1 : 0.55);
    });
    visual.container.alpha = player.alive ? 1 : 0.4;
    visual.container.setPosition(player.x, player.y);
  }

  private maybePlayHitEffect(player: GamePlayerSnapshot, visual: PlayerVisual) {
    const prevHp = this.previousHp.get(player.playerId);

    if (prevHp == null || prevHp <= player.hp) {
      return;
    }

    this.tweens.add({
      targets: visual.container,
      alpha: player.alive ? 0.35 : 0.2,
      duration: 70,
      yoyo: true,
      repeat: 1
    });

    const burst = this.add.circle(player.x, player.y, PLAYER_RADIUS + 6, 0xffd166, 0.38);
    burst.setStrokeStyle(3, 0xffffff, 0.25);
    this.tweens.add({
      targets: burst,
      scale: 1.9,
      alpha: 0,
      duration: 240,
      onComplete: () => burst.destroy()
    });
  }

  private playCastEffect(x: number, y: number, color: number) {
    const ring = this.add.circle(x, y, PLAYER_RADIUS + 2, color, 0.2);
    ring.setStrokeStyle(2, 0xffffff, 0.18);
    this.tweens.add({
      targets: ring,
      scale: 1.7,
      alpha: 0,
      duration: 180,
      onComplete: () => ring.destroy()
    });
  }
}
