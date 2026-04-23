import Phaser from "phaser";
import {
  MAP_CENTER_X,
  MAP_CENTER_Y,
  MAP_RADIUS,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  type GamePlayerSnapshot,
  type GameStateSnapshot
} from "@mundo/shared";
import type { RoomGameCopy } from "../createGame";

const ARENA_BACKGROUND_OFFSET_X = -95;
const ARENA_BACKGROUND_OFFSET_Y = 28;
const ARENA_BACKGROUND_SCALE = 1.08;

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  hpSegments: Phaser.GameObjects.Rectangle[];
  shadow: Phaser.GameObjects.Ellipse;
  aura: Phaser.GameObjects.Arc;
  sprite: Phaser.GameObjects.Image;
  targetX: number;
  targetY: number;
  facingAngle: number;
}

interface ProjectileVisual {
  sprite: Phaser.GameObjects.Image;
  targetX: number;
  targetY: number;
  spinDirection: number;
  baseRotation: number;
  spinRotation: number;
}

export class RoomGameScene extends Phaser.Scene {
  private players = new Map<string, PlayerVisual>();
  private projectiles = new Map<string, ProjectileVisual>();
  private previousHp = new Map<string, number>();
  private countdownText?: Phaser.GameObjects.Text;
  private onMoveCommand: ((x: number, y: number) => void) | null = null;
  private onCastCommand: ((x: number, y: number) => void) | null = null;
  private isQHeld = false;
  private readonly copy: RoomGameCopy;

  constructor(copy: RoomGameCopy) {
    super("room-game-scene");
    this.copy = copy;
  }

  private moveTowards(current: number, target: number, maxDelta: number) {
    const delta = target - current;

    if (Math.abs(delta) <= maxDelta) {
      return target;
    }

    return current + Math.sign(delta) * maxDelta;
  }

  setMoveHandler(handler: (x: number, y: number) => void) {
    this.onMoveCommand = handler;
  }

  setCastHandler(handler: (x: number, y: number) => void) {
    this.onCastCommand = handler;
  }

  preload() {
    this.load.image("mundo-brawler-front", "/sprites/mundo-brawler-front.png");
    this.load.image("mundo-brawler-back", "/sprites/mundo-brawler-back.png");
    this.load.image("mundo-brawler-side-front", "/sprites/mundo-brawler-side-front.png");
    this.load.image("mundo-brawler-side-back", "/sprites/mundo-brawler-side-back.png");
    this.load.image("cleaver", "/sprites/cleaver.svg");
    this.load.image("mundo-arena-bg", "/images/mundo-arena-bg.png");
    this.load.image("baron-floor-cracks", "/sprites/baron-floor-cracks.svg");
    this.load.image("baron-surroundings", "/sprites/baron-surroundings.svg");
    this.load.image("pink-ward", "/sprites/pink-ward.svg");
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
      if (this.isQHeld) {
        return;
      }

      this.isQHeld = true;
      const pointer = this.input.activePointer;
      this.onCastCommand?.(pointer.worldX, pointer.worldY);
    });
    this.input.keyboard?.on("keyup-Q", () => {
      this.isQHeld = false;
    });

    this.drawBaronPit(width, height);

    const title = this.add.text(width / 2, 84, this.copy.title, {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "34px",
      color: "#f4f7fb"
    });
    title.setOrigin(0.5);
    title.setDepth(1000);

    this.countdownText = this.add.text(width / 2, 132, "", {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "26px",
      color: "#b9ff66"
    });
    this.countdownText.setOrigin(0.5);
    this.countdownText.setDepth(1000);

  }

  update(_time: number, delta: number) {
    const playerStep = PLAYER_MOVE_SPEED * 1.35 * (delta / 1000);
    const projectileStep = PROJECTILE_SPEED * 1.15 * (delta / 1000);

    for (const visual of this.players.values()) {
      visual.container.x = this.moveTowards(visual.container.x, visual.targetX, playerStep);
      visual.container.y = this.moveTowards(visual.container.y, visual.targetY, playerStep);
    }

    for (const visual of this.projectiles.values()) {
      visual.sprite.x = this.moveTowards(visual.sprite.x, visual.targetX, projectileStep);
      visual.sprite.y = this.moveTowards(visual.sprite.y, visual.targetY, projectileStep);
      visual.spinRotation += visual.spinDirection * delta * 0.012;
      visual.sprite.rotation = visual.baseRotation + visual.spinRotation;
    }

    this.updateVisualDepths();
  }

  updateSnapshot(snapshot: GameStateSnapshot) {
    if (!this.countdownText) {
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

      visual.sprite.destroy();
      this.projectiles.delete(projectileId);
    }

    snapshot.projectiles.forEach((projectile) => {
      let visual = this.projectiles.get(projectile.projectileId);

      if (!visual) {
        this.playCastEffect(projectile.x, projectile.y, projectile.team === "blue" ? 0x9fe6ff : 0xffc2bb);
        const sprite = this.add.image(projectile.x, projectile.y, "cleaver");
        sprite.setScale(1.95);
        sprite.setTint(projectile.team === "blue" ? 0xcff3ff : 0xffd3cb);
        visual = {
          sprite,
          targetX: projectile.x,
          targetY: projectile.y,
          spinDirection: projectile.team === "blue" ? 1 : -1,
          baseRotation: 0,
          spinRotation: 0
        };
        this.projectiles.set(projectile.projectileId, visual);
      }

      const dx = projectile.x - visual.targetX;
      const dy = projectile.y - visual.targetY;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        visual.baseRotation = Math.atan2(dy, dx);
      }
      visual.targetX = projectile.x;
      visual.targetY = projectile.y;
    });

    if (snapshot.status === "countdown") {
      this.countdownText.setText(`${this.copy.countdownPrefix} ${Math.ceil(snapshot.countdownRemaining)}${this.copy.countdownSuffix}`);
    } else if (snapshot.status === "finished") {
      this.countdownText.setText("");
    } else {
      this.countdownText.setText("");
    }
  }

  private ensurePlayerVisual(player: GamePlayerSnapshot) {
    const existing = this.players.get(player.playerId);

    if (existing) {
      return existing;
    }

    const shadow = this.add.ellipse(0, 18, 44, 18, 0x02060b, 0.34);
    shadow.setStrokeStyle(1, 0xffffff, 0.03);

    const aura = this.add.circle(0, 6, PLAYER_RADIUS + 5, player.team === "blue" ? 0x47b8ff : 0xff6d5e, 0.18);
    aura.setStrokeStyle(3, player.team === "blue" ? 0x9fe6ff : 0xffb0a5, 0.58);

    const facingKey = this.getFacingTextureKey(player.facingAngle);
    const sprite = this.add.image(0, -2, facingKey);
    sprite.setScale(1.72);
    sprite.setDisplayOrigin(32, 48);
    sprite.setFlipX(false);

    const hpSegments = [-23, -8, 8, 23].map((offset) => {
      const segment = this.add.rectangle(offset, PLAYER_RADIUS + 20, 12, 9, 0xb9ff66, 1);
      segment.setStrokeStyle(1, 0xffffff, 0.22);
      return segment;
    });

    const label = this.add.text(0, -PLAYER_RADIUS - 62, player.nickname, {
      fontFamily: "Pretendard, Noto Sans KR, sans-serif",
      fontSize: "17px",
      color: "#f4f7fb",
      fontStyle: "700"
    });
    label.setOrigin(0.5, 1);

    const container = this.add.container(player.x, player.y, [shadow, aura, sprite, ...hpSegments, label]);
    const visual = { container, label, hpSegments, shadow, aura, sprite, targetX: player.x, targetY: player.y, facingAngle: player.facingAngle };

    this.players.set(player.playerId, visual);
    return visual;
  }

  private drawBaronPit(width: number, height: number) {
    const bg = this.add.graphics();
    bg.setDepth(-200);
    bg.fillGradientStyle(0x081019, 0x081019, 0x132334, 0x132334, 1);
    bg.fillRect(0, 0, width, height);

    const surroundings = this.add.image(
      width / 2 + ARENA_BACKGROUND_OFFSET_X,
      height / 2 + ARENA_BACKGROUND_OFFSET_Y,
      "mundo-arena-bg"
    );
    surroundings.setDepth(-195);
    surroundings.setDisplaySize(width * ARENA_BACKGROUND_SCALE, height * ARENA_BACKGROUND_SCALE);
    surroundings.setAlpha(1);

    const backgroundShade = this.add.rectangle(0, 0, width, height, 0x02070f, 0.08);
    backgroundShade.setOrigin(0, 0);
    backgroundShade.setDepth(-194);

    const outerTerrain = this.add.graphics();
    outerTerrain.setDepth(-190);
    outerTerrain.fillStyle(0x294028, 0);
    outerTerrain.fillPoints(
      [
        new Phaser.Geom.Point(0, 0),
        new Phaser.Geom.Point(width, 0),
        new Phaser.Geom.Point(width, 160),
        new Phaser.Geom.Point(1220, 98),
        new Phaser.Geom.Point(1080, 78),
        new Phaser.Geom.Point(930, 64),
        new Phaser.Geom.Point(756, 58),
        new Phaser.Geom.Point(598, 74),
        new Phaser.Geom.Point(432, 104),
        new Phaser.Geom.Point(280, 136),
        new Phaser.Geom.Point(0, 182)
      ],
      true
    );
    outerTerrain.fillStyle(0x1f3422, 0);
    outerTerrain.fillPoints(
      [
        new Phaser.Geom.Point(1124, 700),
        new Phaser.Geom.Point(width, 640),
        new Phaser.Geom.Point(width, height),
        new Phaser.Geom.Point(0, height),
        new Phaser.Geom.Point(0, 620),
        new Phaser.Geom.Point(198, 600),
        new Phaser.Geom.Point(364, 620),
        new Phaser.Geom.Point(520, 646),
        new Phaser.Geom.Point(712, 656),
        new Phaser.Geom.Point(918, 642)
      ],
      true
    );

    const ravine = this.add.graphics();
    ravine.setDepth(-180);
    ravine.fillStyle(0x0b1018, 0);
    ravine.fillEllipse(MAP_CENTER_X, MAP_CENTER_Y + 18, MAP_RADIUS * 2.4, MAP_RADIUS * 1.82);
    ravine.fillStyle(0x101720, 0);
    ravine.fillEllipse(MAP_CENTER_X, MAP_CENTER_Y + 8, MAP_RADIUS * 2.16, MAP_RADIUS * 1.56);

    const cliff = this.add.graphics();
    cliff.setDepth(-160);
    cliff.fillStyle(0x2f3844, 0);
    cliff.fillEllipse(MAP_CENTER_X, MAP_CENTER_Y - 4, MAP_RADIUS * 2.04, MAP_RADIUS * 1.4);
    cliff.fillStyle(0x1c2530, 0);
    cliff.fillEllipse(MAP_CENTER_X, MAP_CENTER_Y + 6, MAP_RADIUS * 1.92, MAP_RADIUS * 1.28);
    cliff.lineStyle(8, 0xb7cad8, 0);
    cliff.strokeEllipse(MAP_CENTER_X, MAP_CENTER_Y - 2, MAP_RADIUS * 2.02, MAP_RADIUS * 1.38);
    cliff.lineStyle(3, 0xb7cad8, 0);
    cliff.strokeEllipse(MAP_CENTER_X, MAP_CENTER_Y - 12, MAP_RADIUS * 1.82, MAP_RADIUS * 1.16);

    const water = this.add.graphics();
    water.setDepth(-120);
    water.fillStyle(0x091c2d, 0);
    water.fillEllipse(MAP_CENTER_X, MAP_CENTER_Y + 26, MAP_RADIUS * 2.02, MAP_RADIUS * 1.92);
    water.fillStyle(0x0b2740, 0);
    water.fillEllipse(MAP_CENTER_X, MAP_CENTER_Y + 24, MAP_RADIUS * 1.88, MAP_RADIUS * 1.74);
    water.fillStyle(0x103d61, 0);
    water.fillEllipse(MAP_CENTER_X + 8, MAP_CENTER_Y + 22, MAP_RADIUS * 1.56, MAP_RADIUS * 1.42);
    water.fillStyle(0x4b9ac5, 0);
    water.fillEllipse(MAP_CENTER_X - 48, MAP_CENTER_Y + 6, MAP_RADIUS * 1.02, MAP_RADIUS * 0.52);
    water.fillEllipse(MAP_CENTER_X + 82, MAP_CENTER_Y + 44, MAP_RADIUS * 0.88, MAP_RADIUS * 0.46);

    const floor = this.add.graphics();
    floor.setDepth(-110);
    floor.fillStyle(0x14263a, 0);
    floor.fillEllipse(MAP_CENTER_X, MAP_CENTER_Y + 22, MAP_RADIUS * 2.08, MAP_RADIUS * 1.96);
    floor.fillStyle(0x19293f, 0);
    floor.fillEllipse(MAP_CENTER_X + 12, MAP_CENTER_Y + 30, MAP_RADIUS * 1.78, MAP_RADIUS * 1.62);

    const corruption = this.add.image(MAP_CENTER_X - 8, MAP_CENTER_Y + 24, "baron-floor-cracks");
    corruption.setDepth(-101);
    corruption.setAlpha(0);
    corruption.setDisplaySize(MAP_RADIUS * 2.92, MAP_RADIUS * 2.58);

    const playableGlow = this.add.graphics();
    playableGlow.setDepth(-100);
    playableGlow.fillEllipse(MAP_CENTER_X + 10, MAP_CENTER_Y + 44, MAP_RADIUS * 1.9, MAP_RADIUS * 1.54);

    const teamWashBlue = this.add.graphics();
    teamWashBlue.setDepth(-95);
    teamWashBlue.fillStyle(0x4b8cff, 0);
    teamWashBlue.beginPath();
    teamWashBlue.moveTo(MAP_CENTER_X - 240, MAP_CENTER_Y + 126);
    teamWashBlue.lineTo(MAP_CENTER_X - 278, MAP_CENTER_Y + 44);
    teamWashBlue.lineTo(MAP_CENTER_X - 232, MAP_CENTER_Y - 56);
    teamWashBlue.lineTo(MAP_CENTER_X - 110, MAP_CENTER_Y - 122);
    teamWashBlue.lineTo(MAP_CENTER_X + 8, MAP_CENTER_Y - 116);
    teamWashBlue.lineTo(MAP_CENTER_X - 34, MAP_CENTER_Y + 34);
    teamWashBlue.closePath();
    teamWashBlue.fillPath();

    const teamWashRed = this.add.graphics();
    teamWashRed.setDepth(-95);
    teamWashRed.fillStyle(0xff6f78, 0);
    teamWashRed.beginPath();
    teamWashRed.moveTo(MAP_CENTER_X + 248, MAP_CENTER_Y - 104);
    teamWashRed.lineTo(MAP_CENTER_X + 286, MAP_CENTER_Y - 12);
    teamWashRed.lineTo(MAP_CENTER_X + 246, MAP_CENTER_Y + 90);
    teamWashRed.lineTo(MAP_CENTER_X + 124, MAP_CENTER_Y + 152);
    teamWashRed.lineTo(MAP_CENTER_X + 6, MAP_CENTER_Y + 146);
    teamWashRed.lineTo(MAP_CENTER_X + 42, MAP_CENTER_Y + 0);
    teamWashRed.closePath();
    teamWashRed.fillPath();

    const dividerGlow = this.add.graphics();
    dividerGlow.setDepth(-94);
    dividerGlow.lineStyle(10, 0xd357ff, 0.06);
    dividerGlow.beginPath();
    dividerGlow.moveTo(MAP_CENTER_X + MAP_RADIUS * 0.52, MAP_CENTER_Y - MAP_RADIUS * 0.52);
    dividerGlow.lineTo(MAP_CENTER_X - MAP_RADIUS * 0.52, MAP_CENTER_Y + MAP_RADIUS * 0.52);
    dividerGlow.strokePath();

    const dividerStartX = MAP_CENTER_X + MAP_RADIUS * 0.5;
    const dividerStartY = MAP_CENTER_Y - MAP_RADIUS * 0.5;
    const dividerEndX = MAP_CENTER_X - MAP_RADIUS * 0.5;
    const dividerEndY = MAP_CENTER_Y + MAP_RADIUS * 0.5;
    const wardCount = 6;

    for (let index = 0; index < wardCount; index += 1) {
      const t = index / (wardCount - 1);
      const x = Phaser.Math.Linear(dividerStartX, dividerEndX, t);
      const y = Phaser.Math.Linear(dividerStartY, dividerEndY, t);
      const wardShadow = this.add.ellipse(x, y + 14, 24, 10, 0x28173d, 0.3);
      wardShadow.setDepth(-93 + index * 0.01);

      const ward = this.add.image(x, y, "pink-ward");
      ward.setScale(1.2);
      ward.setDepth(-92 + index * 0.01);
    }

    const outerPlayableBorder = this.add.graphics();
    outerPlayableBorder.setDepth(-93);
    outerPlayableBorder.lineStyle(7, 0xb545ff, 0.18);
    outerPlayableBorder.strokeEllipse(MAP_CENTER_X, MAP_CENTER_Y + 24, MAP_RADIUS * 2.1, MAP_RADIUS * 2.02);
    outerPlayableBorder.lineStyle(16, 0xca72ff, 0.04);
    outerPlayableBorder.strokeEllipse(MAP_CENTER_X, MAP_CENTER_Y + 24, MAP_RADIUS * 2.18, MAP_RADIUS * 2.08);

    const innerRim = this.add.graphics();
    innerRim.setDepth(-121);
    innerRim.lineStyle(18, 0x0a1018, 0);
    innerRim.strokeEllipse(MAP_CENTER_X, MAP_CENTER_Y + 18, MAP_RADIUS * 2.08, MAP_RADIUS * 1.96);

    const continuousWallShadow = this.add.polygon(
      0,
      0,
      [
        424, 320, 446, 236, 516, 154, 630, 118, 786, 102, 936, 122, 1064, 180, 1148, 266,
        1178, 362, 1152, 466, 1074, 556, 952, 618, 800, 646, 654, 634, 530, 596, 454, 532, 420, 436
      ],
      0x151a20,
      0
    );
    continuousWallShadow.setOrigin(0, 0);
    continuousWallShadow.setDepth(-179);

    const continuousWallBase = this.add.polygon(
      0,
      0,
      [
        446, 320, 466, 248, 528, 172, 636, 136, 786, 122, 928, 140, 1046, 194, 1122, 274,
        1150, 364, 1126, 458, 1056, 540, 944, 596, 804, 620, 670, 610, 556, 576, 482, 516, 448, 430
      ],
      0x5d6672,
      0
    );
    continuousWallBase.setOrigin(0, 0);
    continuousWallBase.setDepth(-178.5);
    continuousWallBase.setStrokeStyle(6, 0xd8e2eb, 0);

    const continuousWallFace = this.add.polygon(
      0,
      0,
      [
        486, 330, 500, 266, 558, 204, 650, 178, 782, 166, 906, 180, 1010, 226, 1078, 296,
        1100, 370, 1080, 446, 1016, 514, 920, 560, 798, 580, 684, 572, 590, 544, 528, 494, 492, 424
      ],
      0x8f99a6,
      0
    );
    continuousWallFace.setOrigin(0, 0);
    continuousWallFace.setDepth(-178.25);
    continuousWallFace.setStrokeStyle(3, 0xf2f6fb, 0);

    const wallCrest = this.add.polygon(
      0,
      0,
      [
        456, 238, 492, 194, 520, 144, 560, 156, 602, 118, 646, 132, 706, 88, 750, 102,
        808, 82, 866, 96, 930, 120, 972, 110, 1030, 152, 1088, 202, 1128, 262, 1144, 318,
        1126, 290, 1088, 234, 1030, 184, 972, 144, 910, 132, 850, 112, 790, 100, 734, 114,
        682, 132, 626, 150, 574, 178, 520, 208, 484, 230
      ],
      0x6a7480,
      0
    );
    wallCrest.setOrigin(0, 0);
    wallCrest.setDepth(-178.1);
    wallCrest.setStrokeStyle(5, 0xe7edf4, 0);

    const wallCrestHighlight = this.add.graphics();
    wallCrestHighlight.setDepth(-178.05);
    wallCrestHighlight.lineStyle(4, 0xf4f8fc, 0);
    [
      [498, 190, 528, 150, 560, 156],
      [610, 124, 646, 132, 700, 96],
      [754, 102, 806, 86, 860, 98],
      [912, 128, 972, 116, 1022, 154],
      [1066, 186, 1104, 224, 1126, 258]
    ].forEach((path) => {
      wallCrestHighlight.beginPath();
      wallCrestHighlight.moveTo(path[0], path[1]);
      for (let index = 2; index < path.length; index += 2) {
        wallCrestHighlight.lineTo(path[index], path[index + 1]);
      }
      wallCrestHighlight.strokePath();
    });

    const wallInnerShadow = this.add.graphics();
    wallInnerShadow.setDepth(-178.02);
    wallInnerShadow.lineStyle(12, 0x14181e, 0);
    wallInnerShadow.beginPath();
    wallInnerShadow.moveTo(486, 332);
    wallInnerShadow.lineTo(526, 266);
    wallInnerShadow.lineTo(598, 216);
    wallInnerShadow.lineTo(698, 188);
    wallInnerShadow.lineTo(822, 184);
    wallInnerShadow.lineTo(934, 206);
    wallInnerShadow.lineTo(1028, 258);
    wallInnerShadow.lineTo(1088, 330);
    wallInnerShadow.lineTo(1102, 396);
    wallInnerShadow.lineTo(1088, 450);
    wallInnerShadow.strokePath();

    const wallMasses = [
      {
        shadow: [448, 236, 520, 152, 636, 118, 648, 178, 560, 246],
        base: [460, 220, 524, 148, 628, 126, 636, 184, 560, 238, 496, 244],
        face: [490, 194, 542, 162, 606, 150, 596, 188, 540, 212, 504, 214]
      },
      {
        shadow: [616, 150, 716, 98, 860, 96, 878, 146, 760, 186, 652, 188],
        base: [624, 144, 722, 102, 850, 104, 868, 148, 760, 180, 654, 182],
        face: [678, 126, 734, 112, 824, 114, 824, 142, 752, 162, 692, 154]
      },
      {
        shadow: [854, 112, 962, 128, 1064, 188, 1024, 258, 922, 220, 860, 162],
        base: [864, 116, 958, 130, 1048, 188, 1012, 248, 924, 214, 868, 160],
        face: [900, 132, 954, 144, 1004, 184, 978, 220, 924, 196, 892, 162]
      },
      {
        shadow: [1044, 192, 1130, 246, 1160, 352, 1126, 456, 1046, 522, 1000, 438, 998, 274],
        base: [1048, 200, 1122, 252, 1148, 350, 1118, 446, 1048, 510, 1008, 432, 1008, 278],
        face: [1066, 238, 1110, 280, 1126, 352, 1104, 420, 1058, 458, 1032, 406, 1030, 298]
      },
      {
        shadow: [432, 274, 464, 226, 482, 324, 468, 448, 442, 522, 404, 444, 398, 344],
        base: [440, 278, 466, 234, 480, 324, 466, 442, 440, 510, 410, 438, 406, 346],
        face: [446, 314, 460, 286, 468, 344, 460, 426, 440, 470, 426, 422, 426, 354]
      },
      {
        shadow: [454, 516, 530, 482, 620, 520, 608, 584, 520, 622, 450, 586],
        base: [462, 520, 532, 490, 612, 522, 602, 580, 522, 614, 458, 582],
        face: [494, 526, 542, 508, 592, 528, 584, 560, 534, 584, 492, 566]
      }
    ];

    wallMasses.forEach((mass, index) => {
      const shadow = this.add.polygon(0, 0, mass.shadow, 0x161b22, 0);
      shadow.setOrigin(0, 0);
      shadow.setDepth(-178 + index * 3);

      const base = this.add.polygon(0, 0, mass.base, 0x697584, 0);
      base.setOrigin(0, 0);
      base.setDepth(-177 + index * 3);
      base.setStrokeStyle(4, 0xd6e1eb, 0);

      const face = this.add.polygon(0, 0, mass.face, 0x95a2af, 0);
      face.setOrigin(0, 0);
      face.setDepth(-176 + index * 3);
      face.setStrokeStyle(2, 0xf3f7fb, 0);
    });

    const ledges = [
      [488, 164, 560, 126, 612, 180, 532, 226],
      [1020, 134, 1096, 176, 1044, 250, 978, 208],
      [1120, 520, 1188, 488, 1220, 572, 1146, 616],
      [432, 520, 502, 484, 542, 560, 466, 606]
    ];

    ledges.forEach((points, index) => {
      const polygon = this.add.polygon(0, 0, points, index % 2 === 0 ? 0x495462 : 0x3a424d, 0);
      polygon.setOrigin(0, 0);
      polygon.setDepth(-178 + index);
      polygon.setStrokeStyle(2, 0xd6dee8, 0);
    });

    const cliffCrowns = [
      [462, 172, 506, 120, 548, 136, 582, 88, 628, 106, 604, 170, 538, 194],
      [620, 116, 682, 74, 742, 82, 792, 58, 854, 74, 820, 138, 748, 156, 666, 148],
      [860, 78, 928, 58, 982, 74, 1032, 110, 1070, 94, 1098, 144, 1032, 188, 946, 170, 888, 126],
      [1040, 178, 1114, 168, 1168, 214, 1188, 278, 1144, 324, 1090, 286]
    ];

    cliffCrowns.forEach((points, index) => {
      const crown = this.add.polygon(0, 0, points, index % 2 === 0 ? 0x717c89 : 0x5b6673, 0);
      crown.setOrigin(0, 0);
      crown.setDepth(-169 + index);
      crown.setStrokeStyle(3, 0xd7e2ec, 0);
    });

    const fissures = this.add.graphics();
    fissures.setDepth(-118);
    fissures.lineStyle(4, 0x993dff, 0);
    fissures.beginPath();
    fissures.moveTo(564, 488);
    fissures.lineTo(638, 430);
    fissures.lineTo(730, 398);
    fissures.lineTo(818, 364);
    fissures.lineTo(920, 332);
    fissures.strokePath();
    fissures.beginPath();
    fissures.moveTo(620, 588);
    fissures.lineTo(704, 520);
    fissures.lineTo(790, 474);
    fissures.lineTo(876, 444);
    fissures.lineTo(962, 398);
    fissures.strokePath();
    fissures.beginPath();
    fissures.moveTo(956, 526);
    fissures.lineTo(1002, 458);
    fissures.lineTo(1048, 396);
    fissures.lineTo(1100, 336);
    fissures.strokePath();
    fissures.lineStyle(2, 0xe1bcff, 0);
    fissures.beginPath();
    fissures.moveTo(1048, 224);
    fissures.lineTo(1020, 272);
    fissures.lineTo(972, 320);
    fissures.lineTo(926, 354);
    fissures.strokePath();

    const wallCracks = this.add.graphics();
    wallCracks.setDepth(-166);
    wallCracks.lineStyle(2, 0x202630, 0);
    [
      [506, 170, 526, 138, 548, 126, 564, 102],
      [694, 132, 714, 110, 736, 98, 754, 82],
      [878, 124, 900, 98, 924, 92, 952, 78],
      [1032, 176, 1052, 146, 1074, 134, 1092, 114],
      [1126, 300, 1100, 266, 1084, 240, 1060, 226]
    ].forEach((line) => {
      wallCracks.beginPath();
      wallCracks.moveTo(line[0], line[1]);
      wallCracks.lineTo(line[2], line[3]);
      wallCracks.lineTo(line[4], line[5]);
      wallCracks.lineTo(line[6], line[7]);
      wallCracks.strokePath();
    });

    const wallCorruption = this.add.graphics();
    wallCorruption.setDepth(-165.5);
    wallCorruption.lineStyle(3, 0xa93cff, 0);
    [
      [498, 206, 542, 188, 586, 176, 620, 158],
      [670, 150, 724, 136, 782, 126, 836, 130],
      [900, 154, 950, 168, 996, 188, 1034, 218],
      [1066, 266, 1096, 306, 1110, 352, 1108, 404],
      [1036, 470, 996, 514, 946, 546, 888, 566],
      [560, 548, 612, 568, 670, 580, 734, 582]
    ].forEach((path) => {
      wallCorruption.beginPath();
      wallCorruption.moveTo(path[0], path[1]);
      for (let index = 2; index < path.length; index += 2) {
        wallCorruption.lineTo(path[index], path[index + 1]);
      }
      wallCorruption.strokePath();
    });
    wallCorruption.lineStyle(2, 0xe09dff, 0);
    [
      [526, 196, 554, 184, 582, 176],
      [720, 138, 754, 130, 790, 128],
      [946, 172, 980, 186, 1010, 206],
      [1082, 296, 1098, 324, 1104, 356],
      [982, 528, 952, 548, 920, 560]
    ].forEach((path) => {
      wallCorruption.beginPath();
      wallCorruption.moveTo(path[0], path[1]);
      for (let index = 2; index < path.length; index += 2) {
        wallCorruption.lineTo(path[index], path[index + 1]);
      }
      wallCorruption.strokePath();
    });

    const crystals = this.add.graphics();
    crystals.setDepth(-140);
    crystals.fillStyle(0x7a3fe0, 0);
    crystals.fillPoints(
      [
        new Phaser.Geom.Point(1038, 238),
        new Phaser.Geom.Point(1068, 212),
        new Phaser.Geom.Point(1080, 256),
        new Phaser.Geom.Point(1052, 284)
      ],
      true
    );
    crystals.fillPoints(
      [
        new Phaser.Geom.Point(540, 226),
        new Phaser.Geom.Point(566, 202),
        new Phaser.Geom.Point(580, 244),
        new Phaser.Geom.Point(552, 268)
      ],
      true
    );
    crystals.fillStyle(0x5631a9, 0);
    crystals.fillPoints(
      [
        new Phaser.Geom.Point(954, 126),
        new Phaser.Geom.Point(976, 108),
        new Phaser.Geom.Point(986, 142),
        new Phaser.Geom.Point(962, 156)
      ],
      true
    );

    const mist = this.add.graphics();
    mist.setDepth(-80);
    mist.fillStyle(0x8c5cff, 0);
    mist.fillEllipse(MAP_CENTER_X - 120, MAP_CENTER_Y + 70, 220, 80);
    mist.fillStyle(0x69d1ff, 0);
    mist.fillEllipse(MAP_CENTER_X + 120, MAP_CENTER_Y + 28, 240, 72);

    const waterEdge = this.add.graphics();
    waterEdge.setDepth(-119);
    waterEdge.lineStyle(7, 0xae49ff, 0);
    [
      [470, 544, 562, 574, 656, 592, 764, 600, 876, 590, 992, 548],
      [432, 462, 504, 424, 586, 396, 678, 366, 778, 342, 882, 318, 984, 268],
      [832, 150, 924, 168, 1002, 206, 1058, 258]
    ].forEach((path) => {
      waterEdge.beginPath();
      waterEdge.moveTo(path[0], path[1]);
      for (let index = 2; index < path.length; index += 2) {
        waterEdge.lineTo(path[index], path[index + 1]);
      }
      waterEdge.strokePath();
    });
  }

  private updateVisualDepths() {
    for (const visual of this.players.values()) {
      visual.container.setDepth(200 + visual.container.y);
    }

    for (const visual of this.projectiles.values()) {
      visual.sprite.setDepth(210 + visual.sprite.y);
    }
  }

  private updatePlayerVisual(visual: PlayerVisual, player: GamePlayerSnapshot) {
    visual.label.setText(player.nickname);
    visual.hpSegments.forEach((segment, index) => {
      segment.setFillStyle(index < player.hp ? 0xb9ff66 : 0x415064, index < player.hp ? 1 : 0.55);
    });
    visual.container.alpha = player.alive ? 1 : 0.4;
    visual.shadow.alpha = player.alive ? 0.34 : 0.18;
    visual.aura.fillColor = player.team === "blue" ? 0x47b8ff : 0xff6d5e;
    visual.targetX = player.x;
    visual.targetY = player.y;
    visual.facingAngle = player.facingAngle;
    visual.sprite.setTexture(this.getFacingTextureKey(player.facingAngle));
    visual.sprite.setFlipX(false);
  }

  private getFacingTextureKey(angle: number) {
    const normalized = Phaser.Math.Angle.Normalize(angle);
    const dx = Math.cos(normalized);
    const dy = Math.sin(normalized);

    if (dy < -0.55) {
      return "mundo-brawler-back";
    }

    if (dy > 0.55) {
      return "mundo-brawler-front";
    }

    return dx >= 0 ? "mundo-brawler-side-front" : "mundo-brawler-side-back";
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
