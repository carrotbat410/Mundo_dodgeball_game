import Phaser from "phaser";
import type { GameStateSnapshot } from "@mundo/shared";
import { MAP_CENTER_X, MAP_CENTER_Y } from "@mundo/shared";
import { RoomGameScene } from "./scenes/RoomGameScene";

export interface RoomGameController {
  game: Phaser.Game;
  updateSnapshot: (payload: GameStateSnapshot) => void;
  destroy: () => void;
}

export function createRoomGame(
  container: HTMLDivElement,
  onMoveCommand: (targetX: number, targetY: number) => void
): RoomGameController {
  const scene = new RoomGameScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: MAP_CENTER_X * 2,
    height: MAP_CENTER_Y * 2,
    backgroundColor: "#07111b",
    scene: [scene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
      antialias: true,
      pixelArt: false
    }
  });

  scene.setMoveHandler(onMoveCommand);

  return {
    game,
    updateSnapshot(payload) {
      scene.updateSnapshot(payload);
    },
    destroy() {
      game.destroy(true);
    }
  };
}
