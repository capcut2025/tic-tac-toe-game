import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// دالة لإنشاء غرفة جديدة
export const createGame = mutation({
  args: { playerName: v.string(), roomCode: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_room_code", (q) => q.eq("roomCode", args.roomCode))
      .first();
    
    if (existing) throw new Error("الغرفة موجودة بالفعل!");

    const gameId = await ctx.db.insert("games", {
      roomCode: args.roomCode,
      playerX: args.playerName,
      board: Array(9).fill(null),
      turn: "X", // مبدئياً X، سيتغير عشوائياً عند اكتمال اللاعبين
      isFinished: false,
    });
    return gameId;
  },
});

// دالة للانضمام للغرفة وبدء اللعبة عشوائياً
export const joinGame = mutation({
  args: { playerName: v.string(), roomCode: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_room_code", (q) => q.eq("roomCode", args.roomCode))
      .first();

    if (!game) throw new Error("الغرفة غير موجودة");
    if (game.playerO) throw new Error("الغرفة ممتلئة");

    // تحديد عشوائي لمن يبدأ (X أو O)
    const randomStart = Math.random() < 0.5 ? "X" : "O";

    await ctx.db.patch(game._id, {
      playerO: args.playerName,
      turn: randomStart, // بداية عشوائية
    });
    return game._id;
  },
});

// دالة قراءة حالة اللعبة (Real-time)
export const getGame = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_room_code", (q) => q.eq("roomCode", args.roomCode))
      .first();
  },
});

// دالة لعب دور (Make a Move)
export const playMove = mutation({
  args: { gameId: v.id("games"), index: v.number(), playerSymbol: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.isFinished) return;
    if (game.board[args.index] !== null) return; // الخانة مشغولة
    if (game.turn !== args.playerSymbol) return; // ليس دورك

    const newBoard = [...game.board];
    newBoard[args.index] = args.playerSymbol;

    // فحص الفوز
    const winner = checkWinner(newBoard);
    const isDraw = !winner && newBoard.every((cell) => cell !== null);
    
    await ctx.db.patch(args.gameId, {
      board: newBoard,
      turn: args.playerSymbol === "X" ? "O" : "X", // تبديل الدور
      winner: winner || (isDraw ? "Draw" : undefined),
      isFinished: !!winner || isDraw,
    });
  },
});

function checkWinner(board: any[]) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // أفقي
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // عمودي
    [0, 4, 8], [2, 4, 6]             // قطري
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}