import type { Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, Session } from "@mundo/shared";
import { serverState } from "../../state/serverState.js";
import { createId } from "../../services/ids.js";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerGuestHandler(socket: GameSocket) {
  socket.on("guest:enter", ({ nickname, locale }) => {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname || trimmedNickname.length > 12) {
      socket.emit("system:error", {
        code: "INVALID_NICKNAME",
        message: "닉네임은 1자 이상 12자 이하로 입력해주세요."
      });
      return;
    }

    const session: Session = {
      socketId: socket.id,
      guestId: createId("guest"),
      nickname: trimmedNickname,
      locale,
      currentRoomId: null,
      connectedAt: Date.now()
    };

    serverState.sessions.set(socket.id, session);

    socket.emit("guest:entered", {
      guestId: session.guestId,
      nickname: session.nickname,
      locale: session.locale
    });
  });
}
