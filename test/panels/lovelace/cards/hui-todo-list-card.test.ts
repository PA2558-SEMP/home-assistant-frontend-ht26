import { afterEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });
describe("hui-todo-list-card pending deletes", () => {
  let cards: HTMLElement[] = [];

  const mountCard = async (): Promise<any> => {
    (globalThis as any).__STATIC_PATH__ = "/static/";
    await import("../../../../src/panels/lovelace/cards/hui-todo-list-card");
    const el = document.createElement("hui-todo-list-card") as any;
    document.body.appendChild(el);
    cards.push(el);
    await el.updateComplete;
    return el;
  };

  afterEach(() => {
    cards.forEach((el) => el.remove());
    cards = [];
    vi.restoreAllMocks();
  });

  it("commits every pending delete when the card is disconnected", async () => {
    const el = await mountCard();
    const commit = vi.spyOn(el, "_commitDelete").mockResolvedValue(undefined);
    el._pendingDeletes = new Map([
      ["uid-1", { timer: 1, row: document.createElement("div") }],
      ["uid-2", { timer: 2, row: document.createElement("div") }],
    ]);

    el.remove();

    expect(commit).toHaveBeenCalledTimes(2);
    expect(commit).toHaveBeenCalledWith("uid-1");
    expect(commit).toHaveBeenCalledWith("uid-2");
  });

  it("removes the item from pending deletes when committed", async () => {
    const el = await mountCard();
    el._pendingDeletes = new Map([
      ["uid-1", { timer: 1, row: document.createElement("div") }],
    ]);
    el.hass = { callService: vi.fn().mockResolvedValue(undefined) };

    await el._commitDelete("uid-1");

    expect(el._pendingDeletes.has("uid-1")).toBe(false);
  });

  it("shows the row again and cancels the delete when undo is clicked", async () => {
    const el = await mountCard();
    const commit = vi.spyOn(el, "_commitDelete").mockResolvedValue(undefined);
    const row = document.createElement("div");
    row.style.display = "none";
    el._pendingDeletes = new Map([
      ["uid-1", { timer: 1, rows: [row], uids: ["uid-1"] }],
    ]);

    el._undoDelete("uid-1");

    expect(el._pendingDeletes.has("uid-1")).toBe(false);
    expect(row.style.display).toBe("");
    expect(commit).not.toHaveBeenCalled();
  });

  it("moves the item when it is dragged to a new position", async () => {
    const el = await mountCard();
    const move = vi.spyOn(el, "_moveItem").mockResolvedValue(undefined);
    const ev = new CustomEvent("item-moved", {
      detail: { oldIndex: 0, newIndex: 2 },
    });
    const stop = vi.spyOn(ev, "stopPropagation");

    await el._itemMoved(ev);

    expect(stop).toHaveBeenCalled();
    expect(move).toHaveBeenCalledTimes(1);
    expect(move).toHaveBeenCalledWith(0, 2);
  });
});
