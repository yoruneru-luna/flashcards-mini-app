import { BookOpen, Home, LineChart, Pencil, Plus, Trash2, User } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { CardDto, CategorySummary, DeckSummary } from "./features/decks/types";
import "./styles/app.css";

type MiniAppUser = { id: string; email: string | null; platform: "telegram" | "vk" | "dev" };
type Tab = "home" | "decks" | "stats" | "profile";

export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardDto[]>([]);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [deckEditTitle, setDeckEditTitle] = useState("");
  const [deckEditCategoryId, setDeckEditCategoryId] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDeck = useMemo(() => decks.find((deck) => deck.id === activeDeckId), [activeDeckId, decks]);

  async function loadCategories() {
    setCategories(await api<CategorySummary[]>("/categories"));
  }

  async function loadDecks() {
    const nextDecks = await api<DeckSummary[]>("/decks");
    setDecks(nextDecks);
    if (!activeDeckId && nextDecks[0]) setActiveDeckId(nextDecks[0].id);
    if (activeDeckId && !nextDecks.some((deck) => deck.id === activeDeckId)) setActiveDeckId(nextDecks[0]?.id ?? null);
  }

  async function loadCards(deckId: string) {
    setCards(await api<CardDto[]>(`/decks/${deckId}/cards`));
  }

  useEffect(() => {
    api<MiniAppUser>("/me")
      .then(setUser)
      .then(async () => Promise.all([loadCategories(), loadDecks()]))
      .catch(() => setError("Не удалось подключиться к серверу"));
  }, []);

  useEffect(() => {
    if (activeDeckId) loadCards(activeDeckId).catch(() => setError("Не удалось загрузить карточки"));
    if (!activeDeckId) setCards([]);
  }, [activeDeckId]);

  useEffect(() => {
    setDeckEditTitle(activeDeck?.title ?? "");
    setDeckEditCategoryId(activeDeck?.categoryId ?? "");
  }, [activeDeck]);

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    if (!categoryTitle.trim()) return;

    const category = await api<CategorySummary>("/categories", {
      method: "POST",
      body: JSON.stringify({ title: categoryTitle.trim() })
    });
    setCategoryTitle("");
    setSelectedCategoryId(category.id);
    await loadCategories();
  }

  async function createDeck(event: FormEvent) {
    event.preventDefault();
    if (!deckTitle.trim()) return;

    const deck = await api<DeckSummary>("/decks", {
      method: "POST",
      body: JSON.stringify({ title: deckTitle.trim(), categoryId: selectedCategoryId || null })
    });
    setDeckTitle("");
    setActiveDeckId(deck.id);
    await loadDecks();
    await loadCategories();
  }

  async function updateDeck(event: FormEvent) {
    event.preventDefault();
    if (!activeDeck || !deckEditTitle.trim()) return;

    await api<DeckSummary>(`/decks/${activeDeck.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: deckEditTitle.trim(), categoryId: deckEditCategoryId || null })
    });
    await loadDecks();
    await loadCategories();
  }

  async function deleteDeck() {
    if (!activeDeck || !window.confirm(`Удалить набор "${activeDeck.title}" вместе с карточками?`)) return;

    await api(`/decks/${activeDeck.id}`, { method: "DELETE" });
    setRevealedCardId(null);
    setEditingCardId(null);
    await loadDecks();
    await loadCategories();
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

  function startCardEdit(card: CardDto) {
    setEditingCardId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  }

  async function updateCard(cardId: string) {
    if (!activeDeckId || !editFront.trim() || !editBack.trim()) return;

    await api<CardDto>(`/cards/${cardId}`, {
      method: "PATCH",
      body: JSON.stringify({ front: editFront.trim(), back: editBack.trim() })
    });
    setEditingCardId(null);
    await loadCards(activeDeckId);
  }

  async function deleteCard(card: CardDto) {
    if (!activeDeckId || !window.confirm(`Удалить карточку "${card.front}"?`)) return;

    await api(`/cards/${card.id}`, { method: "DELETE" });
    setRevealedCardId(null);
    setEditingCardId(null);
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
              <button className="primary" onClick={() => setTab("decks")} disabled={!activeDeckId}>
                Начать повторение
              </button>
            </div>

            <section>
              <h2>Последние наборы</h2>
              <div className="deck-list">
                {decks.length === 0 ? (
                  <p className="empty">Пока нет карточек. Создайте первый набор и начните повторение.</p>
                ) : (
                  decks.slice(0, 3).map((deck) => (
                    <button className="deck-row" key={deck.id} onClick={() => { setActiveDeckId(deck.id); setTab("decks"); }}>
                      <span>{deck.title}</span>
                      <small>{deck.categoryTitle ?? "Без категории"} · {deck.cardsCount} карточек</small>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {tab === "decks" && (
          <div className="stack">
            <form className="inline-form" onSubmit={createCategory}>
              <input value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="Новая категория" />
              <button type="submit" aria-label="Создать категорию"><Plus size={20} /></button>
            </form>

            <form className="deck-create-form" onSubmit={createDeck}>
              <input value={deckTitle} onChange={(event) => setDeckTitle(event.target.value)} placeholder="Название набора" />
              <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
                <option value="">Без категории</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
              </select>
              <button className="primary" type="submit">Создать набор</button>
            </form>

            <div className="chips">
              {decks.map((deck) => (
                <button className={deck.id === activeDeckId ? "chip active" : "chip"} key={deck.id} onClick={() => setActiveDeckId(deck.id)}>
                  {deck.title}
                </button>
              ))}
            </div>

            {activeDeck ? (
              <section className="stack">
                <form className="settings-panel" onSubmit={updateDeck}>
                  <div>
                    <h2>Настройки набора</h2>
                    <p className="section-note">{activeDeck.cardsCount} карточек</p>
                  </div>
                  <input value={deckEditTitle} onChange={(event) => setDeckEditTitle(event.target.value)} placeholder="Название набора" />
                  <select value={deckEditCategoryId} onChange={(event) => setDeckEditCategoryId(event.target.value)}>
                    <option value="">Без категории</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
                  </select>
                  <div className="action-row">
                    <button className="secondary" type="submit">Сохранить</button>
                    <button className="danger-button" type="button" onClick={deleteDeck}><Trash2 size={18} />Удалить</button>
                  </div>
                </form>

                <form className="card-form" onSubmit={createCard}>
                  <textarea value={front} onChange={(event) => setFront(event.target.value)} placeholder="Сторона 1" />
                  <textarea value={back} onChange={(event) => setBack(event.target.value)} placeholder="Сторона 2" />
                  <button className="primary" type="submit">Добавить карточку</button>
                </form>

                <div className="review-stack">
                  {cards.length === 0 ? (
                    <p className="empty">В этом наборе пока нет карточек.</p>
                  ) : (
                    cards.map((card) => (
                      <article className="flashcard" key={card.id}>
                        {editingCardId === card.id ? (
                          <>
                            <textarea value={editFront} onChange={(event) => setEditFront(event.target.value)} placeholder="Сторона 1" />
                            <textarea value={editBack} onChange={(event) => setEditBack(event.target.value)} placeholder="Сторона 2" />
                            <div className="action-row">
                              <button className="secondary" type="button" onClick={() => updateCard(card.id)}>Сохранить</button>
                              <button type="button" onClick={() => setEditingCardId(null)}>Отмена</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="card-heading">
                              <p>{card.front}</p>
                              <div className="icon-actions">
                                <button aria-label="Редактировать карточку" onClick={() => startCardEdit(card)}><Pencil size={17} /></button>
                                <button aria-label="Удалить карточку" onClick={() => deleteCard(card)}><Trash2 size={17} /></button>
                              </div>
                            </div>
                            {revealedCardId === card.id ? <strong>{card.back}</strong> : <button onClick={() => setRevealedCardId(card.id)}>Показать ответ</button>}
                            {revealedCardId === card.id && (
                              <div className="rating-row">
                                <button onClick={() => review(card.id, "again")}>Не помню</button>
                                <button onClick={() => review(card.id, "hard")}>Трудно</button>
                                <button onClick={() => review(card.id, "good")}>Хорошо</button>
                                <button onClick={() => review(card.id, "easy")}>Легко</button>
                              </div>
                            )}
                          </>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </section>
            ) : <p className="empty">Создайте первый набор.</p>}
          </div>
        )}

        {tab === "stats" && (
          <div className="stats-grid">
            <div><strong>{categories.length}</strong><span>категорий</span></div>
            <div><strong>{decks.length}</strong><span>наборов</span></div>
            <div><strong>{decks.reduce((sum, deck) => sum + deck.cardsCount, 0)}</strong><span>карточек</span></div>
          </div>
        )}

        {tab === "profile" && (
          <div className="stack">
            <div className="notice">Профиль создан автоматически через платформу.</div>
            <p className="muted">Email: {user?.email ?? "не привязан"}</p>
            <button className="secondary">Привязать email</button>
          </div>
        )}
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
