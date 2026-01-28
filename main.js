import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api";

// 1. إعداد عميل Convex (سيتم جلب الرابط تلقائياً من ملف .env)
const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

// حالة التطبيق المحلية
let state = {
  playerName: "",
  roomCode: "",
  mySymbol: null, // 'X' أو 'O'
  gameId: null,
};

// عناصر الواجهة
const screens = {
  login: document.getElementById("login-screen"),
  game: document.getElementById("game-screen"),
};
const els = {
  username: document.getElementById("username"),
  roomCode: document.getElementById("room-code"),
  createBtn: document.getElementById("create-btn"),
  joinBtn: document.getElementById("join-btn"),
  error: document.getElementById("error-msg"),
  board: document.getElementById("board"),
  turn: document.getElementById("turn-indicator"),
  p1: document.getElementById("p1-display"),
  p2: document.getElementById("p2-display"),
  roomDisplay: document.getElementById("room-display"),
  resultModal: document.getElementById("result-modal"),
  resultMsg: document.getElementById("result-message"),
};

// === دوال المساعدة ===
function showError(msg) {
  els.error.textContent = msg;
  setTimeout(() => els.error.textContent = "", 3000);
}

function switchScreen(screenName) {
  screens.login.classList.add("hidden");
  screens.game.classList.add("hidden");
  screens[screenName].classList.remove("hidden");
}

function renderBoard(board) {
  els.board.innerHTML = "";
  board.forEach((cell, index) => {
    const div = document.createElement("div");
    div.className = `cell ${cell ? "taken" : ""}`;
    div.textContent = cell || "";
    div.onclick = () => handleMove(index);
    els.board.appendChild(div);
  });
}

// === منطق اللعبة ===

// دالة الاشتراك في التحديثات (Real-time Listener)
function subscribeToGame() {
  convex.watchQuery(api.games.getGame, { roomCode: state.roomCode }).onUpdate((game) => {
    if (!game) return;

    state.gameId = game._id;
    els.roomDisplay.textContent = `غرفة: ${game.roomCode}`;
    els.p1.textContent = `${game.playerX} (X)`;
    els.p2.textContent = game.playerO ? `${game.playerO} (O)` : "بانتظار انضمام...";

    // تحديد الرمز الخاص بي
    if (state.playerName === game.playerX) state.mySymbol = "X";
    else if (state.playerName === game.playerO) state.mySymbol = "O";

    // تحديث اللوحة
    renderBoard(game.board);

    // تحديث مؤشر الدور
    if (game.winner) {
      els.turn.textContent = "انتهت اللعبة!";
      showResult(game.winner, game.winner === "Draw");
    } else {
      const isMyTurn = game.turn === state.mySymbol;
      els.turn.textContent = isMyTurn ? "دورك الآن!" : `دور المنافس (${game.turn})`;
      els.turn.style.color = isMyTurn ? "#2ecc71" : "#fff";
    }
  });
}

async function handleMove(index) {
  if (!state.gameId) return;
  try {
    await convex.mutation(api.games.playMove, {
      gameId: state.gameId,
      index: index,
      playerSymbol: state.mySymbol,
    });
  } catch (e) {
    console.log("حركة غير صالحة أو ليس دورك");
  }
}

function showResult(winner, isDraw) {
  els.resultModal.classList.remove("hidden");
  if (isDraw) {
    els.resultMsg.textContent = "تعادل!";
    els.resultMsg.style.color = "#f39c12";
  } else if (winner === state.mySymbol) {
    els.resultMsg.textContent = "مبروك! لقد فزت 🎉";
    els.resultMsg.style.color = "#27ae60";
  } else {
    els.resultMsg.textContent = "حظ أوفر، لقد خسرت 😢";
    els.resultMsg.style.color = "#c0392b";
  }
}

// === معالجات الأحداث (Event Listeners) ===

els.createBtn.addEventListener("click", async () => {
  const name = els.username.value;
  const room = els.roomCode.value;
  if (!name || !room) return showError("الرجاء إدخال الاسم واسم الغرفة");

  try {
    await convex.mutation(api.games.createGame, { playerName: name, roomCode: room });
    state.playerName = name;
    state.roomCode = room;
    switchScreen("game");
    subscribeToGame();
  } catch (err) {
    showError(err.message);
  }
});

els.joinBtn.addEventListener("click", async () => {
  const name = els.username.value;
  const room = els.roomCode.value;
  if (!name || !room) return showError("الرجاء إدخال الاسم واسم الغرفة");

  try {
    await convex.mutation(api.games.joinGame, { playerName: name, roomCode: room });
    state.playerName = name;
    state.roomCode = room;
    switchScreen("game");
    subscribeToGame();
  } catch (err) {
    showError(err.message);
  }
});