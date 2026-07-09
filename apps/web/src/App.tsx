import { BookOpen, Home, LineChart, Plus, User } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { CardDto, DeckSummary } from "./features/decks/types";
import "./styles/app.css";

type MiniAppUser = { id: string; email: string | null; platform: "telegram" | "vk" | "dev" };
type Tab = "home" | "decks" | "stats" | "profile";

export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardDto[]>([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDeck = useMemo(() => decks.find((deck) => deck.id === activeDeckId), [activeDeckId, decks]);

  async function loadDecks() {
    const nextDecks = await api<DeckSummary[]>("/decks");
    setDecks(nextDecks);
    if (!activeDeckId && nextDecks[0]) setActiveDeckId(nextDecks[0].id);
  }

  async function loadCards(deckId: string) {
    setCards(await api<CardDto[]>(`/decks/${deckId}/cards`));
  }

  useEffect(() => {
    api<MiniAppUser>("/me").then(setUser).then(loadDecks).catch(() => setError("Не удалось подключиться к серверу"));
  }, []);

  useEffect(() => {
    if (activeDeckId) loadCards(activeDeckId).catch(() => setError("Не удалось загрузить карточки"));
  }, [activeDeckId]);

  async function createDeck(event: FormEvent) {
    event.preventDefault();
    if (!deckTitle.trim()) return;
    const deck = await api<DeckSummary>("/decks", { method: "POST", body: JSON.stringify({ title: deckTitle.trim() }) });
    setDeckTitle("");
    setActiveDeckId(deck.id);
    await loadDecks();
  }

  async function createCard(event: FormEvent) {
    event.preventDefault();
    if (!activeDeckId || !front.trim() || !back.trim()) return;
    await api<CardDto>(`/decks/${activeDeckId}/cards`, {
      method: "POST",
      body: JSON.stringify({ front: front.trim(), back: back.trim(), tags: [] })
    });
    setFront("");
    setBack("");
    await loadCards(activeDeckId);
    await loadDecks();
  }

  async function review(cardId: string, rating: "again" | "hard" | "good" | "easy") {
    await api("/reviews", { method: "POST", body: JSON.stringify({ cardId, rating, mode: "basic" }) });
    setCards((current) => current.filter((card) => card.id !== cardId));
    setRevealedCardId(null);
  }

  return (
    <main className="app-shell">
      <section className="screen">
        <header className="topbar">
          <div>
            <p className="eyebrow">Карточки</p>
            <h1>{tab === "home" ? "Главная" : tab === "decks" ? "Наборы" : tab === "stats" ? "Статистика" : "Профиль"}</h1>
          </div>
          <span className="platform">{user?.platform ?? "dev"}</span>
        </header>

        {error && <div className="notice danger">{error}</div>}

        {tab === "home" && (
          <div className="stack">
            <div className="hero-panel">
              <p>Пора повторить</p>
              <strong>{cards.length}</strong>
              <span>карточек в выбранном наборе</span>
              <button className="primary" onClick={() => setTab("decks")} disabled={!activeDeckId}>Начать повторение</button>
            </div>
            <section>
              <h2>Последние наборы</h2>
              <div className="deck-list">
                {decks.length === 0 ? <p className="empty">Пока нет карточек. Создайте первый набор и начните повторение.</p> : decks.slice(0, 3).map((deck) => (
                  <button className="deck-row" key={deck.id} onClick={() => { setActiveDeckId(deck.id); setTab("decks"); }}>
                    <span>{deck.title}</span><small>{deck.cardsCount} карточек</small>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "decks" && (
          <div className="stack">
            <form className="inline-form" onSubmit={createDeck}>
              <input value={deckTitle} onChange={(event) => setDeckTitle(event.target.value)} placeholder="Название набора" />
              <button type="submit" aria-label="Создать набор"><Plus size={20} /></button>
            </form>
            <div className="chips">
              {decks.map((deck) => <button className={deck.id === activeDeckId ? "chip active" : "chip"} key={deck.id} onClick={() => setActiveDeckId(deck.id)}>{deck.title}</button>)}
            </div>
            {activeDeck ? (
              <section className="stack">
                <h2>{activeDeck.title}</h2>
                <form className="card-form" onSubmit={createCard}>
                  <textarea value={front} onChange={(event) => setFront(event.target.value)} placeholder="Сторона 1" />
                  <textarea value={back} onChange={(event) => setBack(event.target.value)} placeholder="Сторона 2" />
                  <button className="primary" type="submit">Добавить карточку</button>
                </form>
                <div className="review-stack">
                  {cards.length === 0 ? <p className="empty">В этом наборе пока нет карточек.</p> : cards.map((card) => (
                    <article className="flashcard" key={card.id}>
                      <p>{card.front}</p>
                      {revealedCardId === card.id ? <strong>{card.back}</strong> : <button onClick={() => setRevealedCardId(card.id)}>Показать ответ</button>}
                      {revealedCardId === card.id && (
                        <div className="rating-row">
                          <button onClick={() => review(card.id, "again")}>Не помню</button>
                          <button onClick={() => review(card.id, "hard")}>Трудно</button>
                          <button onClick={() => review(card.id, "good")}>Хорошо</button>
                          <button onClick={() => review(card.id, "easy")}>Легко</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ) : <p className="empty">Создайте первый набор.</p>}
          </div>
        )}

        {tab === "stats" && <div className="stats-grid"><div><strong>{decks.length}</strong><span>наборов</span></div><div><strong>{decks.reduce((sum, deck) => sum + deck.cardsCount, 0)}</strong><span>карточек</span></div></div>}
        {tab === "profile" && <div className="stack"><div className="notice">Профиль создан автоматически через платформу.</div><p className="muted">Email: {user?.email ?? "не привязан"}</p><button className="secondary">Привязать email</button></div>}
      </section>

      <nav className="bottom-nav" aria-label="Основная навигация">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}><Home size={20} />Главная</button>
        <button className={tab === "decks" ? "active" : ""} onClick={() => setTab("decks")}><BookOpen size={20} />Наборы</button>
        <button className={tab === "stats" ? "active" : ""} onClick={() => setTab("stats")}><LineChart size={20} />Статистика</button>
        <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><User size={20} />Профиль</button>
      </nav>
    </main>
  );
}
