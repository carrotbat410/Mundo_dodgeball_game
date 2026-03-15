import Phaser from "phaser";
import { MAP_CENTER_X, MAP_CENTER_Y, MAP_RADIUS, PLAYER_RADIUS, TEAM_SIZE_BY_MODE, type GameMode, type RoomPlayer } from "@mundo/shared";

interface PreviewPlayer {
  playerId: string;
  nickname: string;
  team: RoomPlayer["team"];
  isHost: boolean;
}

interface PreviewSnapshot {
  mode: GameMode;
  players: PreviewPlayer[];
}

const BLUE_POSITIONS = [
  { x: MAP_CENTER_X - 120, y: MAP_CENTER_Y },
  { x: MAP_CENTER_X - 160, y: MAP_CENTER_Y - 88 },
  { x: MAP_CENTER_X - 160, y: MAP_CENTER_Y + 88 }
] as const;

const RED_POSITIONS = [
  { x: MAP_CENTER_X + 120, y: MAP_CENTER_Y },
  { x: MAP_CENTER_X + 160, y: MAP_CENTER_Y - 88 },
  { x: MAP_CENTER_X + 160, y: MAP_CENTER_Y + 88 }
] as const;

export class RoomGameScene extends Phaser.Scene {
  private previewLayer?: Phaser.GameObjects.Container;
  private previewPlayers = new Map<string, Phaser.GameObjects.Container>();
  private statusText?: Phaser.GameObjects.Text;

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

    const subtitle = this.add.text(width / 2, 130, "다음 단계에서 카운트다운, 우클릭 이동, 식칼 투사체를 붙입니다.", {
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

    this.statusText = this.add.text(width / 2, height - 56, "참가자 정보를 기다리는 중입니다.", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "14px",
      color: "#9fb2c8"
    });
    this.statusText.setOrigin(0.5);

    this.previewLayer = this.add.container(0, 0);
  }

  updatePreview(snapshot: PreviewSnapshot) {
    if (!this.previewLayer || !this.statusText) {
      return;
    }

    const nextIds = new Set(snapshot.players.map((player) => player.playerId));

    for (const [playerId, container] of this.previewPlayers.entries()) {
      if (nextIds.has(playerId)) {
        continue;
      }

      container.destroy(true);
      this.previewPlayers.delete(playerId);
    }

    const bluePlayers = snapshot.players.filter((player) => player.team === "blue");
    const redPlayers = snapshot.players.filter((player) => player.team === "red");

    bluePlayers.forEach((player, index) => {
      const target = BLUE_POSITIONS[index] ?? BLUE_POSITIONS[BLUE_POSITIONS.length - 1];
      this.renderPreviewPlayer(player, target.x, target.y, 0x47b8ff);
    });

    redPlayers.forEach((player, index) => {
      const target = RED_POSITIONS[index] ?? RED_POSITIONS[RED_POSITIONS.length - 1];
      this.renderPreviewPlayer(player, target.x, target.y, 0xff6d5e);
    });

    this.statusText.setText(
      `현재 모드 ${snapshot.mode} · 블루 ${bluePlayers.length}/${TEAM_SIZE_BY_MODE[snapshot.mode]} · 레드 ${redPlayers.length}/${TEAM_SIZE_BY_MODE[snapshot.mode]}`
    );
  }

  private renderPreviewPlayer(player: PreviewPlayer, x: number, y: number, color: number) {
    let container = this.previewPlayers.get(player.playerId);

    if (!container) {
      const marker = this.add.circle(0, 0, PLAYER_RADIUS, color, 0.94);
      marker.setStrokeStyle(4, 0xf4f7fb, 0.65);

      const hpBar = this.add.rectangle(0, PLAYER_RADIUS + 16, 52, 8, 0xb9ff66, 1);
      hpBar.setStrokeStyle(2, 0xffffff, 0.18);

      const label = this.add.text(0, -PLAYER_RADIUS - 22, "", {
        fontFamily: "Pretendard, Noto Sans KR, sans-serif",
        fontSize: "15px",
        color: "#f4f7fb",
        fontStyle: "700"
      });
      label.setOrigin(0.5);

      const role = this.add.text(0, PLAYER_RADIUS + 32, "", {
        fontFamily: "Pretendard, Noto Sans KR, sans-serif",
        fontSize: "11px",
        color: "#9fb2c8"
      });
      role.setOrigin(0.5);

      container = this.add.container(x, y, [marker, hpBar, label, role]);
      this.previewLayer?.add(container);
      this.previewPlayers.set(player.playerId, container);
    }

    const [, , label, role] = container.list as [Phaser.GameObjects.Arc, Phaser.GameObjects.Rectangle, Phaser.GameObjects.Text, Phaser.GameObjects.Text];
    label.setText(player.nickname);
    role.setText(player.isHost ? "방장" : "참가자");

    this.tweens.add({
      targets: container,
      x,
      y,
      duration: 220,
      ease: "Quad.easeOut"
    });
  }
}
