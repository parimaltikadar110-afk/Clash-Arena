import React, { useMemo, useState } from "react";

const TRACK_LEN = 57;
const PLAYER = "player";
const CPU = "cpu";

const fairDice = () => 1 + Math.floor(Math.random() * 6);

const cpuDice = () => {
  const r = Math.random();
  if (r < 0.18) return 6;
  if (r < 0.38) return 5;
  if (r < 0.58) return 4;
  if (r < 0.72) return 3;
  if (r < 0.88) return 2;
  return 1;
};

const clampPos = (pos) => Math.max(0, Math.min(pos, TRACK_LEN));

const canMove = (token, steps) => {
  if (token.finished) return false;
  return token.pos + steps <= TRACK_LEN;
};

const moveToken = (tokens, tokenId, steps) =>
  tokens.map((t) => {
    if (t.id !== tokenId) return t;
    const nextPos = clampPos(t.pos + steps);
    const finished = nextPos >= TRACK_LEN;
    return { ...t, pos: finished ? TRACK_LEN : nextPos, finished };
  });

const getBestMove = (tokens, roll) => {
  const valid = tokens
    .filter((t) => canMove(t, roll))
    .map((t) => ({
      token: t,
      futurePos: clampPos(t.pos + roll),
    }));

  if (!valid.length) return null;

  valid.sort((a, b) => b.futurePos - a.futurePos);
  return valid[0];
};

export default function LudoVsCPU({ onBack }) {
  const [playerTokens, setPlayerTokens] = useState(
    Array.from({ length: 4 }, (_, i) => ({ id: i + 1, pos: 0, finished: false }))
  );
  const [cpuTokens, setCpuTokens] = useState(
    Array.from({ length: 4 }, (_, i) => ({ id: i + 1, pos: 0, finished: false }))
  );
  const [turn, setTurn] = useState(PLAYER);
  const [dice, setDice] = useState(null);
  const [message, setMessage] = useState("Your move");
  const [winner, setWinner] = useState(null);

  const legalMoves = useMemo(() => {
    if (!dice || turn !== PLAYER) return [];
    return playerTokens
      .map((t) => ({
        tokenId: t.id,
        move: canMove(t, dice),
        pos: t.pos,
        futurePos: clampPos(t.pos + dice),
      }))
      .filter((x) => x.move);
  }, [dice, turn, playerTokens]);

  const runCpuTurn = () => {
    if (winner) return;

    const roll = cpuDice();
    setDice(roll);
    setMessage(`Computer rolled ${roll}`);

    const best = getBestMove(cpuTokens, roll);
    if (!best) {
      setTurn(PLAYER);
      setMessage("No valid CPU move. Your turn.");
      return;
    }

    setTimeout(() => {
      const nextCpu = moveToken(cpuTokens, best.token.id, roll);

      const nextPlayer = playerTokens.map((t) => {
        const cpuPos = nextCpu.find((c) => c.id === best.token.id)?.pos;
        const hitPlayer = t.pos === cpuPos && !t.finished;
        if (hitPlayer) {
          return { ...t, pos: 0, finished: false };
        }
        return t;
      });

      setCpuTokens(nextCpu);
      setPlayerTokens(nextPlayer);

      const cpuAllFinished = nextCpu.every((t) => t.finished);
      if (cpuAllFinished) {
        setWinner("cpu");
        setMessage("Computer wins this round.");
        return;
      }

      setTurn(PLAYER);
      setMessage("Your move");
      setDice(null);
    }, 700);
  };

  const rollForPlayer = () => {
    if (turn !== PLAYER || winner) return;
    const value = fairDice();
    setDice(value);
    setMessage(`You rolled ${value}`);
  };

  const doPlayerMove = (tokenId) => {
    if (turn !== PLAYER || !dice || winner) return;

    const nextPlayer = moveToken(playerTokens, tokenId, dice);
    const nextCpu = cpuTokens.map((t) => {
      const playerPos = nextPlayer.find((p) => p.id === tokenId)?.pos;
      const hitCpu = t.pos === playerPos && !t.finished;
      if (hitCpu) {
        return { ...t, pos: 0, finished: false };
      }
      return t;
    });

    setPlayerTokens(nextPlayer);
    setCpuTokens(nextCpu);

    const playerAllFinished = nextPlayer.every((t) => t.finished);
    if (playerAllFinished) {
      setWinner("player");
      setMessage("You win!");
      return;
    }

    setDice(null);
    setTurn(CPU);
    setMessage("Computer is playing...");
    setTimeout(() => runCpuTurn(), 550);
  };

  const resetGame = () => {
    setPlayerTokens(Array.from({ length: 4 }, (_, i) => ({ id: i + 1, pos: 0, finished: false })));
    setCpuTokens(Array.from({ length: 4 }, (_, i) => ({ id: i + 1, pos: 0, finished: false })));
    setTurn(PLAYER);
    setDice(null);
    setWinner(null);
    setMessage("Your move");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1120", color: "#f8fafc", fontFamily: "system-ui, sans-serif", padding: "20px 14px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #334155", background: "#111827", color: "#f8fafc", fontWeight: 800, cursor: "pointer" }}>
          ← Lobby
        </button>
        <div style={{ flex: 1, textAlign: "center", fontWeight: 900, color: "#facc15", fontSize: 18 }}>
          Ludo vs CPU
        </div>
      </div>

      <div style={{ background: "#111827", border: "1px solid #334155", borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>Mode: Local Match · CPU has a slight advantage</div>
        <div style={{ fontWeight: 900, color: winner === "player" ? "#4ade80" : winner === "cpu" ? "#fca5a5" : "#f8fafc" }}>
          {winner ? (winner === "player" ? "You won!" : "Computer won!") : message}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, color: "#facc15", marginBottom: 8 }}>Player</div>
          <div style={{ display: "grid", gap: 6 }}>
            {playerTokens.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", background: "#0b1f17", borderRadius: 8, padding: "8px 10px", border: `1px solid ${t.finished ? "#4ade80" : "#334155"}` }}>
                <span>Token {t.id}</span>
                <span>{t.finished ? "Finished" : `Pos ${t.pos}`}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, color: "#facc15", marginBottom: 8 }}>Computer</div>
          <div style={{ display: "grid", gap: 6 }}>
            {cpuTokens.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", background: "#1f1229", borderRadius: 8, padding: "8px 10px", border: `1px solid ${t.finished ? "#f472b6" : "#334155"}` }}>
                <span>CPU {t.id}</span>
                <span>{t.finished ? "Finished" : `Pos ${t.pos}`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 18 }}>
        <button
          onClick={rollForPlayer}
          disabled={turn !== PLAYER || winner || dice !== null}
          style={{ padding: "12px 18px", borderRadius: 12, background: "#facc15", color: "#111827", fontWeight: 900, border: "none", cursor: "pointer", opacity: turn !== PLAYER || dice !== null ? 0.5 : 1 }}
        >
          Roll Dice
        </button>

        <button
          onClick={resetGame}
          style={{ padding: "12px 18px", borderRadius: 12, background: "#1f2937", color: "#f8fafc", fontWeight: 900, border: "1px solid #334155", cursor: "pointer" }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {playerTokens.map((token) => {
          const canMoveThis = dice !== null && turn === PLAYER && canMove(token, dice) && !winner;
          return (
            <button
              key={token.id}
              onClick={() => canMoveThis && doPlayerMove(token.id)}
              disabled={!canMoveThis}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #334155",
                background: canMoveThis ? "#166534" : "#111827",
                color: "#f8fafc",
                fontWeight: 800,
                cursor: canMoveThis ? "pointer" : "not-allowed",
                opacity: canMoveThis ? 1 : 0.6,
              }}
            >
              Move Token {token.id}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: "10px 12px", background: "#0f172a", borderRadius: 10, border: "1px solid #334155" }}>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Current dice</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#facc15", textAlign: "center" }}>{dice ?? "-"}</div>
      </div>
    </div>
  );
}
