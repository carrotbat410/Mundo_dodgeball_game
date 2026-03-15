import Phaser from "phaser";
import type { GameMode, RoomPlayer } from "@mundo/shared";
import { MAP_CENTER_X, MAP_CENTER_Y } from "@mundo/shared";
import { RoomGameScene } from "./scenes/RoomGameScene";

export interface RoomGameController {
  game: Phaser.Game;
  updatePreview: (payload: { mode: GameMode; players: RoomPlayer[] }) => void;
  destroy: () => void;
}

export function createRoomGame(container: HTMLDivElement): RoomGameController {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: MAP_CENTER_X * 2,
    height: MAP_CENTER_Y * 2,
    backgroundColor: "#07111b",
    scene: [RoomGameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
      antialias: true,
      pixelArt: false
    }
  });

  return {
    game,
    updatePreview(payload) {
      const scene = game.scene.getScene("room-game-scene") as RoomGameScene;
      scene.updatePreview({ mode: payload.mode, players: payload.players });
    },
    destroy() {
      game.destroy(true);
    }
  };
}
