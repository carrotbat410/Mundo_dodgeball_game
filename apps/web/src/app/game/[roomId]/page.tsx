"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCurrentRoomId } from "../../../lib/room/currentRoom";
import { getGuestSession } from "../../../lib/session/guestSession";

export default function GamePage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

  useEffect(() => {
    const session = getGuestSession();
    const currentRoomId = getCurrentRoomId();

    if (!session || !roomId || currentRoomId !== roomId) {
      router.replace("/rooms");
    }
  }, [roomId, router]);

  return (
    <main className="page-shell">
      <section
        className="panel"
        style={{
          minHeight: 720,
          padding: 24,
          display: "grid",
          placeItems: "center",
          textAlign: "center"
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0, color: "var(--accent)", fontWeight: 700 }}>Game Scene</p>
          <h1 style={{ margin: 0, fontSize: 36 }}>카운트다운/Phaser 전장 연결 예정</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            현재 방 ID: {roomId}
          </p>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            스프린트 2부터 고정 맵, 카운트다운, 우클릭 이동을 여기에 붙입니다.
          </p>
        </div>
      </section>
    </main>
  );
}
