"use client";

import { useState, useEffect, useCallback } from "react";
import type { IconName } from "./icons";
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gtag = (...args: any[]) => { if (typeof window !== "undefined" && (window as any).gtag) (window as any).gtag(...args); };

const P2_PORTRAITS: { name: string; url: string }[] = [
  { name: "Haruspex", url: "https://pathologic.wiki.gg/images/NPC_Haruspex.png" },
  { name: "Bachelor", url: "https://pathologic.wiki.gg/images/NPC_Bachelor.png" },
  { name: "Changeling", url: "https://pathologic.wiki.gg/images/NPC_Klara.png" },
  { name: "Aglaya Lilich", url: "https://pathologic.wiki.gg/images/NPC_Aglaya.png" },
  { name: "Alexander Saburov", url: "https://pathologic.wiki.gg/images/NPC_Alexander.png" },
  { name: "Alexander Block", url: "https://pathologic.wiki.gg/images/NPC_Block.png" },
  { name: "Andrey Stamatin", url: "https://pathologic.wiki.gg/images/NPC_Andrey.png" },
  { name: "Anna Angel", url: "https://pathologic.wiki.gg/images/NPC_Anna.png" },
  { name: "Aspity", url: "https://pathologic.wiki.gg/images/NPC_Ospina.png" },
  { name: "Bad Grief", url: "https://pathologic.wiki.gg/images/NPC_Grief.png" },
  { name: "Big Vlad", url: "https://pathologic.wiki.gg/images/NPC_Big_Vlad.png" },
  { name: "Capella", url: "https://pathologic.wiki.gg/images/NPC_Capella.png" },
  { name: "Eva Yan", url: "https://pathologic.wiki.gg/images/NPC_Eva.png" },
  { name: "Georgiy Kain", url: "https://pathologic.wiki.gg/images/NPC_Georg.png" },
  { name: "Grace", url: "https://pathologic.wiki.gg/images/NPC_Grace.png" },
  { name: "Isidor Burakh", url: "https://pathologic.wiki.gg/images/NPC_isidor.png" },
  { name: "Katerina Saburova", url: "https://pathologic.wiki.gg/images/NPC_Katerina.png" },
  { name: "Khan", url: "https://pathologic.wiki.gg/images/NPC_Khan.png" },
  { name: "Lara Ravel", url: "https://pathologic.wiki.gg/images/NPC_Lara.png" },
  { name: "Maria Kaina", url: "https://pathologic.wiki.gg/images/NPC_Maria.png" },
  { name: "Mark Immortell", url: "https://pathologic.wiki.gg/images/NPC_Mark.png" },
  { name: "Murky", url: "https://pathologic.wiki.gg/images/NPC_Mishka.png" },
  { name: "Notkin", url: "https://pathologic.wiki.gg/images/NPC_Notkin.png" },
  { name: "Oyun", url: "https://pathologic.wiki.gg/images/NPC_Oyun.png" },
  { name: "Peter Stamatin", url: "https://pathologic.wiki.gg/images/NPC_Peter.png" },
  { name: "Rubin", url: "https://pathologic.wiki.gg/images/NPC_Rubin.png" },
  { name: "Sticky", url: "https://pathologic.wiki.gg/images/NPC_Sticky.png" },
  { name: "Taya Tycheek", url: "https://pathologic.wiki.gg/images/NPC_Taya.png" },
  { name: "Victor Kain", url: "https://pathologic.wiki.gg/images/NPC_Victor.png" },
  { name: "Vlad the Younger", url: "https://pathologic.wiki.gg/images/NPC_Vlad.png" },
  { name: "Yulia Lyuricheva", url: "https://pathologic.wiki.gg/images/NPC_Yulia.png" },
];

interface Card {
  id: string;
  name: string;
  icon: IconName | null;
  portraitUrl: string | null;
  description: string;
  status: "safe" | "danger" | "infected" | "dead";
}

interface Category {
  id: string;
  name: string;
  cards: Card[];
  cols: number;
}

interface PeopleData {
  categories: Category[];
}

const FONT = "'Noto Sans', sans-serif";
const CARD_W = 115;
const CARD_H = 153;

const statusOrder: Card["status"][] = ["safe", "danger", "infected", "dead"];
const statusColors: Record<Card["status"], string> = { safe: "#6a6050", danger: "#b89a3e", infected: "#a83232", dead: "#3a3528" };
const statusLabels: Record<Card["status"], string> = { safe: "SAFE", danger: "IN DANGER", infected: "INFECTED", dead: "DEAD" };

function load(): PeopleData {
  try {
    const raw = localStorage.getItem("pathomap-people");
    if (raw) {
      const parsed = JSON.parse(raw) as PeopleData;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed.categories = parsed.categories.map((c: any) => ({
        ...c,
        cols: c.cols || 4,
        cards: c.cards.map((k: any) => ({
          ...k,
          portraitUrl: k.portraitUrl !== undefined ? k.portraitUrl : null,
          status: k.status || (k.dead ? "dead" : "safe"),
        })),
      }));
      return parsed;
    }
  } catch { /* ignore */ }
  return { categories: [] };
}

function save(data: PeopleData) {
  try { localStorage.setItem("pathomap-people", JSON.stringify(data)); } catch { /* ignore */ }
}

function SortableColumn({ id, children }: { id: string; children: (handleProps: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        padding: "0 30px",
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...attributes}
    >
      {children({ ...listeners })}
    </div>
  );
}

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export default function People({ activeTab, onTabChange }: { activeTab?: string; onTabChange: (tab: string) => void }) {
  const [data, setData] = useState<PeopleData>({ categories: [] });
  const [editing, setEditing] = useState(false);
  const [editCat, setEditCat] = useState<string | null>(null);
  const [selCard, setSelCard] = useState<{ catId: string; cardId: string } | null>(null);
  const [portraitPick, setPortraitPick] = useState(false);
  const [selCatId, setSelCatId] = useState<string | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ msg: string; onOk: () => void } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const d = load();
    setData(d);
    if (d.categories.length === 0) setEditing(true);
  }, []);
  const update = useCallback((fn: (d: PeopleData) => Partial<PeopleData>) => {
    setData(prev => { const next = { ...prev, ...fn(prev) }; save(next); return next; });
  }, []);

  const addCategory = () => {
    const id = crypto.randomUUID();
    update(d => ({ categories: [...d.categories, { id, name: "New Layer", cards: [], cols: 1 }] }));
    gtag("event", "create_layer");
    setEditCat(id);
  };

  const removeCategory = (id: string) => {
    update(d => ({ categories: d.categories.filter(c => c.id !== id) }));
    if (selCard?.catId === id) setSelCard(null);
  };

  const renameCat = (id: string, name: string) => {
    update(d => ({ categories: d.categories.map(c => c.id === id ? { ...c, name: name || "Unnamed" } : c) }));
    setEditCat(null);
  };

  const addCard = (catId: string) => {
    const id = crypto.randomUUID();
    update(d => ({
      categories: d.categories.map(c =>
        c.id === catId ? { ...c, cards: [...c.cards, { id, name: "New Person", icon: null, portraitUrl: null, description: "", status: "safe" }] } : c
      ),
    }));
    gtag("event", "create_person", { layer: catId });
    setSelCard({ catId, cardId: id });
  };

  const removeCard = (catId: string, cardId: string) => {
    update(d => ({
      categories: d.categories.map(c =>
        c.id === catId ? { ...c, cards: c.cards.filter(k => k.id !== cardId) } : c
      ),
    }));
    if (selCard?.cardId === cardId) setSelCard(null);
  };

  const updateCard = (catId: string, cardId: string, patch: Partial<Card>) => {
    update(d => ({
      categories: d.categories.map(c =>
        c.id === catId ? { ...c, cards: c.cards.map(k => k.id === cardId ? { ...k, ...patch } : k) } : c
      ),
    }));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isLayerDrag = data.categories.some(c => c.id === active.id);
    if (isLayerDrag) {
      update(d => {
        const oldIdx = d.categories.findIndex(c => c.id === active.id);
        const newIdx = d.categories.findIndex(c => c.id === over.id);
        if (oldIdx < 0 || newIdx < 0) return d;
        const cats = [...d.categories];
        const [moved] = cats.splice(oldIdx, 1);
        cats.splice(newIdx, 0, moved);
        return { categories: cats };
      });
      return;
    }

    update(d => ({
      categories: d.categories.map(c => {
        const oldIdx = c.cards.findIndex(k => k.id === active.id);
        if (oldIdx < 0) return c;
        const newIdx = c.cards.findIndex(k => k.id === over.id);
        if (newIdx < 0) return c;
        const cards = [...c.cards];
        const [moved] = cards.splice(oldIdx, 1);
        cards.splice(newIdx, 0, moved);
        return { ...c, cards };
      }),
    }));
  };

  const sel = selCard
    ? (() => {
        const cat = data.categories.find(c => c.id === selCard.catId);
        const card = cat?.cards.find(k => k.id === selCard.cardId);
        return cat && card ? { cat, card } : null;
      })()
    : null;

  return (
    <div style={{ position: "fixed", top: 69, left: 0, right: 0, bottom: 0, background: "#000", color: "#fff", fontFamily: FONT, fontStretch: "condensed", overflow: "hidden", display: activeTab === "people" ? undefined : "none" }}>
      <style>{`
        .simplebar-scrollbar::before {
          background: #8b7355 !important;
          border-radius: 4px !important;
        }
        .simplebar-scrollbar.simplebar-visible::before {
          opacity: 1 !important;
        }
        .simplebar-track.simplebar-horizontal {
          background: #2a2318;
          border-radius: 4px;
          height: 10px !important;
          margin: 0 300px;
          bottom: 100px;
        }
        .simplebar-track.simplebar-vertical {
          display: none !important;
        }
      `}</style>
      {/* Scroll content area */}
      <SimpleBar style={{ height: "100%", padding: "20px 40px" }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            <SortableContext items={data.categories.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {data.categories.map(cat => (
                <SortableColumn key={cat.id} id={cat.id}>
                  {(handleProps) => (
                    <>
                      {/* Layer header */}
                      <div
                        style={{ textAlign: "center", padding: "8px 20px 16px", cursor: editing ? "grab" : "default" }}
                        {...(editing ? handleProps : {})}
                        onClick={editing ? (e) => { e.stopPropagation(); setSelCatId(selCatId === cat.id ? null : cat.id); setSelCard(null); setPortraitPick(false); } : undefined}
                      >
                        <div style={{ fontSize: 24, fontFamily: "'Liberation Serif', Georgia, serif", fontWeight: "bold", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>{cat.name}</div>
                      </div>

                      {/* Cards grid */}
                      <SortableContext items={editing ? cat.cards.map(k => k.id) : []} strategy={rectSortingStrategy}>
                        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cat.cols}, ${CARD_W}px)`, gap: 48, padding: "0 30px 200px", justifyContent: "center" }}>
                          {cat.cards.map(card => {
                            const isSel = selCard?.cardId === card.id;
                            const cardEl = (
                              <div
                                key={card.id}
                                onClick={editing ? () => { setSelCard(isSel ? null : { catId: cat.id, cardId: card.id }); setSelCatId(null); } : undefined}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: editing ? "pointer" : "default", opacity: isSel ? 1 : 0.75 }}
                              >
                                <div style={{
                                  width: CARD_W, height: CARD_H,
                                  background: "#0a0a0a",
                                  border: !card.portraitUrl ? "1px dashed #1a1a1a" : "none",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  overflow: "hidden", flexShrink: 0,
                                  position: "relative",
                                }}>
                                  {card.portraitUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={card.portraitUrl} alt={card.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: card.status === "dead" ? "brightness(0.35)" : undefined }} />
                                  ) : (
                                    <span style={{ color: "#333", fontSize: 28 }}>?</span>
                                  )}
                                  {card.status === "dead" && (
                                    <svg style={{ position: "absolute", top: "25%", left: "-10%", width: "120%", height: "30%", pointerEvents: "none" }} viewBox="0 0 120 30" preserveAspectRatio="none">
                                      <path d="M0,18 C8,8 16,22 24,12 C32,2 40,20 48,14 C56,8 64,22 72,10 C80,2 88,24 96,12 C104,4 112,20 120,14" stroke="#000" strokeWidth="6" fill="none" strokeLinecap="round" />
                                      <path d="M0,14 C10,24 18,6 28,16 C38,26 46,4 56,18 C66,28 74,6 84,14 C94,24 102,8 112,16 C118,20 120,12 120,12" stroke="#000" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
                                      <path d="M-5,20 C6,10 14,26 26,14 C34,6 42,22 54,12 C62,4 70,24 82,14 C90,6 98,22 110,10 C116,6 125,18 125,18" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5" />
                                    </svg>
                                  )}
                                </div>
                                <div style={{ fontSize: 16, color: "#fff", marginTop: 6, textAlign: "center", maxWidth: CARD_W, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {card.name}
                                </div>
                                {card.status !== "safe" && (
                                  <div style={{ fontSize: 14, letterSpacing: "0.08em", marginTop: 2, color: statusColors[card.status], textTransform: "uppercase" }}>
                                    {statusLabels[card.status]}
                                  </div>
                                )}
                              </div>
                            );
                            return editing ? (
                              <SortableCard key={card.id} id={card.id}>{cardEl}</SortableCard>
                            ) : (
                              <div key={card.id}>{cardEl}</div>
                            );
                          })}
                          {editing && (
                            <button
                              onClick={() => addCard(cat.id)}
                              style={{ width: CARD_W, height: CARD_H, fontSize: 14, fontStyle: "italic", color: "#333", background: "none", border: "1px dashed #1a1a1a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >+</button>
                          )}
                        </div>
                      </SortableContext>
                    </>
                  )}
                </SortableColumn>
              ))}
            </SortableContext>
          </DndContext>

          {editing && (
            <div
              onClick={addCategory}
              style={{
                flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "center",
                paddingTop: 28, cursor: "pointer", color: "#333", fontSize: 18, fontStyle: "italic",
                padding: "28px 50px 0",
              }}
            >+ new layer</div>
          )}
        </div>
      </SimpleBar>

      {/* Edit toggle */}
      <div style={{ position: "absolute", left: 60, bottom: 36, zIndex: 20 }}>
        {editing && selCatId && (() => {
          const cat = data.categories.find(c => c.id === selCatId);
          if (!cat) return null;
          return (
            <div style={{ marginBottom: 12 }}>
              {editCat === cat.id ? (
                <input
                  autoFocus
                  defaultValue={cat.name}
                  onBlur={e => renameCat(cat.id, e.target.value.trim())}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditCat(null); }}
                  style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 16, fontFamily: FONT, fontStretch: "condensed", caretColor: "#a83232", width: 300 }}
                />
              ) : (
                <div style={{ fontSize: 16, color: "#fff", marginBottom: 8 }}>{cat.name}</div>
              )}
              <div style={{ display: "flex", gap: 14, fontSize: 11, letterSpacing: "0.08em", alignItems: "center" }}>
                <button onClick={() => setEditCat(cat.id)} style={{ color: "#777", background: "none", border: "none", cursor: "pointer" }}>RENAME</button>
                <button onClick={() => {
                  const hasCards = cat.cards.length > 0;
                  const doDelete = () => { removeCategory(cat.id); setSelCatId(null); setConfirmDlg(null); };
                  if (!hasCards) { doDelete(); return; }
                  setConfirmDlg({ msg: `Delete ${cat.name}? All people will be lost.`, onOk: doDelete });
                }} style={{ color: "#a83232", background: "none", border: "none", cursor: "pointer" }}>DELETE</button>
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => update(d => ({ categories: d.categories.map(c => c.id === cat.id ? { ...c, cols: n } : c) }))}
                    style={{
                      fontSize: 10, width: 18, height: 18,
                      color: cat.cols === n ? "#fff" : "#333",
                      background: cat.cols === n ? "#1a1a1a" : "none",
                      border: `1px solid ${cat.cols === n ? "#666" : "#1a1a1a"}`,
                      cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >{n}</button>
                ))}
              </div>
            </div>
          );
        })()}
        <button
          onClick={() => {
            if (editing) { setEditing(false); setSelCard(null); setPortraitPick(false); setEditCat(null); setSelCatId(null); }
            else setEditing(true);
          }}
          style={{ fontSize: 11, letterSpacing: "0.08em", color: editing ? "#fff" : "#777", background: "none", border: "none", cursor: "pointer" }}
        >{editing ? "DONE" : "EDIT"}</button>
      </div>

      {/* Backdrop */}
      {sel && (
        <div onClick={() => { setSelCard(null); setPortraitPick(false); }} style={{ position: "fixed", inset: 0, zIndex: 19, background: "transparent" }} />
      )}

      {/* Edit panel */}
      {sel && (
        <div
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "rgba(10,10,10,0.97)", border: "1px solid #1a1a1a",
            padding: "16px 24px", zIndex: 20, width: 460, maxWidth: "90vw",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            {/* Portrait preview — click toggles portrait picker */}
            <div
              onClick={() => setPortraitPick(!portraitPick)}
              style={{
                width: 50, height: 67, background: "#0a0a0a",
                border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", cursor: "pointer", flexShrink: 0,
              }}
            >
              {sel.card.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sel.card.portraitUrl} alt={sel.card.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#333", fontSize: 18 }}>?</span>
              )}
            </div>
            {/* Name input */}
            <input
              key={sel.card.id + "-name-" + sel.card.name}
              defaultValue={sel.card.name}
              onBlur={e => updateCard(sel.cat.id, sel.card.id, { name: e.target.value.trim() || "Unnamed" })}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 18, fontFamily: FONT, fontStretch: "condensed", caretColor: "#a83232", flex: 1, minWidth: 0 }}
            />
            <button
              onClick={() => {
                const next = statusOrder[(statusOrder.indexOf(sel.card.status) + 1) % statusOrder.length];
                updateCard(sel.cat.id, sel.card.id, { status: next });
              }}
              style={{ fontSize: 10, color: statusColors[sel.card.status], background: "none", border: "none", cursor: "pointer", letterSpacing: "0.08em", flexShrink: 0 }}
            >{statusLabels[sel.card.status]}</button>
            <button
              onClick={() => { removeCard(sel.cat.id, sel.card.id); }}
              style={{ fontSize: 10, color: "#a83232", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.08em", flexShrink: 0 }}
            >DELETE</button>
            <button
              onClick={() => setSelCard(null)}
              style={{ fontSize: 16, color: "#666", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: "0 0 0 4px" }}
            >✕</button>
          </div>
          {/* Description */}
          <textarea
            key={sel.card.id + "-desc"}
            defaultValue={sel.card.description}
            placeholder="Description..."
            onBlur={e => updateCard(sel.cat.id, sel.card.id, { description: e.target.value })}
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#b0a890", fontSize: 13, fontFamily: FONT, fontStretch: "condensed",
              caretColor: "#a83232", width: "100%", minHeight: 36, resize: "vertical", lineHeight: 1.5,
            }}
          />

          {/* Portrait picker */}
          {portraitPick && (
            <div style={{ marginTop: 10, maxHeight: 240, overflowY: "auto", borderTop: "1px solid #1a1a1a", paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.1em", marginBottom: 6 }}>CHOOSE PORTRAIT</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 60px)", gap: 6 }}>
                {P2_PORTRAITS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => { updateCard(sel.cat.id, sel.card.id, { portraitUrl: p.url, name: sel.card.name === "New Person" || P2_PORTRAITS.some(pp => pp.name === sel.card.name) ? p.name : sel.card.name }); setPortraitPick(false); }}
                    title={p.name}
                    style={{
                      width: 60, height: 80, cursor: "pointer", padding: 0,
                      background: sel.card.portraitUrl === p.url ? "#1a1a1a" : "#0a0a0a",
                      border: `1px solid ${sel.card.portraitUrl === p.url ? "#fff" : "#1a1a1a"}`,
                      overflow: "hidden",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {confirmDlg && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)" }}>
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.3)", padding: "24px 32px", maxWidth: 360, textAlign: "center" }}>
            <div style={{ color: "#fff", fontSize: 16, marginBottom: 20, lineHeight: 1.5 }}>{confirmDlg.msg}</div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <button onClick={confirmDlg.onOk} style={{ fontSize: 12, color: "#fff", background: "none", border: "1px solid #333", cursor: "pointer", padding: "4px 20px", letterSpacing: "0.05em" }}>CONFIRM</button>
              <button onClick={() => setConfirmDlg(null)} style={{ fontSize: 12, color: "#666", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em" }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
