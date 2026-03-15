import Phaser from "phaser";
import { MAP_CENTER_X, MAP_CENTER_Y } from "@mundo/shared";
import { RoomGameScene } from "./scenes/RoomGameScene";

export function createRoomGame(container: HTMLDivElement) {
  return new Phaser.Game({
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
}
