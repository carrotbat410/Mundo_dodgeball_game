export default function GamePage() {
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
          <h1 style={{ margin: 0, fontSize: 36 }}>Phaser 전장 연결 예정</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            스프린트 1에서는 로비 흐름까지 먼저 닫고, 스프린트 2부터 고정 맵과 이동을 붙입니다.
          </p>
        </div>
      </section>
    </main>
  );
}
