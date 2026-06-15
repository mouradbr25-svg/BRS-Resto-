import { useState, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import {
  UtensilsCrossed, ChefHat, Gamepad2, ClipboardList,
  Plus, Minus, CheckCircle2, ArrowLeft, Loader2, AlertCircle, Flame, Leaf, Wheat,
} from "lucide-react";
import { formatDZD } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TableInfo = { id: number; number: number; capacity: number; status: string };

type PublicMenuItem = {
  id: number; name: string; nameAr: string | null; description: string | null;
  price: number; categoryId: number; categoryName: string | null;
  imageUrl: string | null; isSpicy: boolean; isVegan: boolean; isGlutenFree: boolean;
};

type Category = { id: number; name: string; description: string | null; icon: string | null };

type CartEntry = { item: PublicMenuItem; quantity: number };

type QuizQuestion = { id: number; question: string; options: string[]; correctAnswer: number };

type View = "welcome" | "order" | "quiz" | "success";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  boissons: "🥤", boisson: "🥤", drinks: "🥤", drink: "🥤",
  jus: "🍹", juice: "🍹",
  plats: "🍽", plat: "🍽", dishes: "🍽", dish: "🍽", repas: "🍽",
  desserts: "🍮", dessert: "🍮",
  entrées: "🥗", entrees: "🥗", entrée: "🥗", salades: "🥗",
};

function categoryIcon(name: string): string {
  const key = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return "🍴";
}

// ─── Category color scheme ─────────────────────────────────────────────────────
const CAT_COLORS = [
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
];

// ─── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, qty, onAdd, onRemove }: {
  item: PublicMenuItem; qty: number;
  onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm transition-all ${qty > 0 ? "border-primary shadow-primary/20" : "border-transparent"}`}>
      {item.imageUrl ? (
        <div className="relative h-36 bg-muted overflow-hidden">
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          {qty > 0 && (
            <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
              {qty}
            </div>
          )}
        </div>
      ) : null}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-tight">{item.name}</p>
            {item.nameAr && <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{item.nameAr}</p>}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {item.isSpicy && <Flame className="h-3 w-3 text-red-500" />}
            {item.isVegan && <Leaf className="h-3 w-3 text-green-500" />}
            {item.isGlutenFree && <Wheat className="h-3 w-3 text-amber-500" />}
          </div>
        </div>
        {item.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>}
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-primary">{formatDZD(item.price)}</span>
          <div className="flex items-center gap-1">
            {qty > 0 ? (
              <>
                <button onClick={onRemove} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm font-bold">{qty}</span>
                <button onClick={onAdd} className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors">
                  <Plus className="h-3 w-3" />
                </button>
              </>
            ) : (
              <button onClick={onAdd} className="flex items-center gap-1 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
                <Plus className="h-3 w-3" /> Ajouter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Customer Portal ──────────────────────────────────────────────────────
export default function CustomerPortal() {
  const [, params] = useRoute("/portal/:tableId");
  const tableId = parseInt(params?.tableId ?? "0", 10);

  const [view, setView] = useState<View>("welcome");
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tableError, setTableError] = useState(false);

  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  const [cart, setCart] = useState<Map<number, CartEntry>>(new Map());
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Map<number, number>>(new Map());
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  // Fetch table info
  useEffect(() => {
    if (!tableId) return;
    fetch(`/api/public/table/${tableId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setTableInfo)
      .catch(() => setTableError(true));
  }, [tableId]);

  // Fetch menu eagerly
  useEffect(() => {
    setMenuLoading(true);
    fetch("/api/public/menu")
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories ?? []);
        setMenuItems(data.items ?? []);
        if (data.categories?.length > 0) setSelectedCatId(data.categories[0].id);
      })
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, []);

  const addToCart = useCallback((item: PublicMenuItem) => {
    setCart(prev => {
      const next = new Map(prev);
      const ex = next.get(item.id);
      next.set(item.id, ex ? { ...ex, quantity: ex.quantity + 1 } : { item, quantity: 1 });
      return next;
    });
  }, []);

  const removeFromCart = useCallback((itemId: number) => {
    setCart(prev => {
      const next = new Map(prev);
      const ex = next.get(itemId);
      if (!ex) return prev;
      if (ex.quantity > 1) next.set(itemId, { ...ex, quantity: ex.quantity - 1 });
      else next.delete(itemId);
      return next;
    });
  }, []);

  const cartTotal = Array.from(cart.values()).reduce((s, e) => s + e.item.price * e.quantity, 0);
  const cartCount = Array.from(cart.values()).reduce((s, e) => s + e.quantity, 0);
  const filteredItems = selectedCatId ? menuItems.filter(i => i.categoryId === selectedCatId) : menuItems;

  const submitOrder = async () => {
    if (!guestName.trim()) { setSubmitError("Veuillez entrer votre nom."); return; }
    if (cart.size === 0) { setSubmitError("Votre panier est vide."); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          guestName: guestName.trim(),
          items: Array.from(cart.values()).map(e => ({ menuItemId: e.item.id, quantity: e.quantity })),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Erreur"); }
      const { orderId: id } = await res.json();
      setOrderId(id);
      setView("success");
    } catch (err: any) {
      setSubmitError(err.message ?? "Erreur lors de la commande.");
    } finally {
      setSubmitting(false);
    }
  };

  const openQuiz = async () => {
    setQuizLoading(true);
    try {
      const res = await fetch("/api/public/quiz");
      const data: QuizQuestion[] = await res.json();
      setQuizQuestions(data);
      setQuizAnswers(new Map());
      setQuizSubmitted(false);
      setView("quiz");
    } catch {
      setQuizQuestions([]);
      setView("quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  const quizScore = quizSubmitted
    ? Array.from(quizAnswers.entries()).filter(([id, ans]) => {
        const q = quizQuestions.find(q => q.id === id);
        return q?.correctAnswer === ans;
      }).length
    : 0;

  const discountFromScore = (score: number, total: number) => {
    const pct = total > 0 ? score / total : 0;
    if (pct >= 0.8) return 40;
    if (pct >= 0.6) return 25;
    if (pct >= 0.4) return 15;
    return 0;
  };

  // ─── Table Error ─────────────────────────────────────────────────────────────
  if (tableError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="font-semibold">Table introuvable</p>
          <p className="text-sm text-muted-foreground">Vérifiez le QR code.</p>
        </div>
      </div>
    );
  }

  // ─── Welcome View ─────────────────────────────────────────────────────────────
  if (view === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center pt-10 px-4 pb-6">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-primary shadow-lg flex items-center justify-center mb-4">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">BRS Resto</h1>
          {tableInfo && (
            <div className="mt-2 flex items-center gap-2">
              <span className="bg-primary/10 text-primary font-semibold text-sm px-3 py-1 rounded-full border border-primary/20">
                Table #{tableInfo.number}
              </span>
            </div>
          )}
          <p className="text-muted-foreground text-sm mt-2 text-center">
            Bienvenue ! مرحبًا بكم · Welcome!
          </p>

          {/* Action Cards */}
          <div className="grid grid-cols-3 gap-3 mt-8 w-full max-w-sm">
            <button
              onClick={() => setView("order")}
              className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm border-2 border-primary/20 hover:border-primary hover:shadow-md active:scale-95 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-center leading-tight">Menu</span>
            </button>

            <button
              onClick={openQuiz}
              disabled={quizLoading}
              className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm border-2 border-amber-200 hover:border-amber-400 hover:shadow-md active:scale-95 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                {quizLoading ? <Loader2 className="h-5 w-5 text-amber-600 animate-spin" /> : <Gamepad2 className="h-5 w-5 text-amber-600" />}
              </div>
              <span className="text-xs font-semibold text-center leading-tight">Quiz</span>
            </button>

            <button
              onClick={() => {
                const id = prompt("Entrez votre numéro de commande:");
                if (id) window.location.href = `/track/${id}`;
              }}
              className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm border-2 border-blue-200 hover:border-blue-400 hover:shadow-md active:scale-95 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-center leading-tight">Suivi</span>
            </button>
          </div>

          {/* Menu preview cards */}
          {categories.length > 0 && (
            <div className="mt-8 w-full max-w-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Nos catégories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat, i) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCatId(cat.id); setView("order"); }}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${CAT_COLORS[i % CAT_COLORS.length]} hover:opacity-80 transition-opacity`}
                  >
                    <span>{categoryIcon(cat.name)}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="sticky bottom-0 p-4 bg-white/80 backdrop-blur border-t">
          <button
            onClick={() => setView("order")}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Passer une commande
            {cartCount > 0 && (
              <span className="ml-1 bg-white text-primary text-xs font-extrabold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── Order View ───────────────────────────────────────────────────────────────
  if (view === "order") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 bg-white border-b z-10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView("welcome")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="font-serif font-bold text-foreground">Passer commande</h2>
            {tableInfo && <p className="text-xs text-muted-foreground">Table #{tableInfo.number}</p>}
          </div>
          {cartCount > 0 && (
            <div className="ms-auto bg-primary text-white text-xs font-bold rounded-full px-2.5 py-1">
              {cartCount} articles · {formatDZD(cartTotal)}
            </div>
          )}
        </header>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          {/* LEFT: Menu */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Category tabs */}
            <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
              {categories.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border transition-all ${
                    selectedCatId === cat.id
                      ? "bg-primary text-white border-primary shadow-sm"
                      : `${CAT_COLORS[i % CAT_COLORS.length]} hover:opacity-80`
                  }`}
                >
                  <span>{categoryIcon(cat.name)}</span>
                  <span>{cat.name}</span>
                  <span className="opacity-70">({menuItems.filter(m => m.categoryId === cat.id).length})</span>
                </button>
              ))}
            </div>

            {/* Items grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {menuLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">Aucun article dans cette catégorie.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      qty={cart.get(item.id)?.quantity ?? 0}
                      onAdd={() => addToCart(item)}
                      onRemove={() => removeFromCart(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="lg:w-80 xl:w-96 bg-white border-t lg:border-t-0 lg:border-s flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">
                  Votre nom *
                </label>
                <input
                  type="text"
                  placeholder="Entrez votre prénom..."
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              {tableInfo && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">
                    Table
                  </label>
                  <div className="bg-muted rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground">
                    Table #{tableInfo.number}
                  </div>
                </div>
              )}

              {/* Cart items */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
                  Votre commande
                </label>
                {cart.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                    <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Ajoutez des articles depuis le menu
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array.from(cart.values()).map(entry => (
                      <div key={entry.item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.item.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.quantity} × {formatDZD(entry.item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 ms-3">
                          <button onClick={() => removeFromCart(entry.item.id)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10">
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold">{entry.quantity}</span>
                          <button onClick={() => addToCart(entry.item)} className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20">
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer: Total + buttons */}
            <div className="p-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Total</span>
                <span className="font-bold text-lg text-primary">{formatDZD(cartTotal)}</span>
              </div>

              {submitError && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{submitError}</p>
              )}

              <button
                onClick={submitOrder}
                disabled={submitting || cart.size === 0 || !guestName.trim()}
                className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {submitting ? "Envoi en cours..." : "Confirmer la commande"}
              </button>

              <button
                onClick={() => setView("welcome")}
                className="w-full text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Quiz View ────────────────────────────────────────────────────────────────
  if (view === "quiz") {
    const discount = quizSubmitted ? discountFromScore(quizScore, quizQuestions.length) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView("welcome")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="font-serif font-bold">Quiz de fidélité</h2>
            <p className="text-xs text-muted-foreground">Répondez et gagnez une réduction !</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4">
          {quizQuestions.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Aucune question disponible pour le moment.</p>
            </div>
          )}

          {quizQuestions.map((q, idx) => {
            const answered = quizAnswers.get(q.id);
            const isCorrect = quizSubmitted && answered === q.correctAnswer;
            const isWrong = quizSubmitted && answered !== undefined && answered !== q.correctAnswer;

            return (
              <div key={q.id} className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-colors ${isCorrect ? "border-green-300" : isWrong ? "border-red-200" : "border-transparent"}`}>
                <p className="font-semibold text-sm mb-3 flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                  {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, i) => {
                    const isSelected = answered === i;
                    const showCorrect = quizSubmitted && i === q.correctAnswer;
                    return (
                      <button
                        key={i}
                        disabled={quizSubmitted}
                        onClick={() => !quizSubmitted && setQuizAnswers(prev => new Map(prev).set(q.id, i))}
                        className={`w-full text-start text-sm px-3 py-2.5 rounded-lg border-2 transition-all ${
                          showCorrect ? "border-green-400 bg-green-50 text-green-800 font-medium" :
                          isSelected && quizSubmitted ? "border-red-300 bg-red-50 text-red-700" :
                          isSelected ? "border-primary bg-primary/10 text-primary font-medium" :
                          "border-muted hover:border-primary/40 hover:bg-muted/50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {quizQuestions.length > 0 && !quizSubmitted && (
            <button
              onClick={() => setQuizSubmitted(true)}
              disabled={quizAnswers.size < quizQuestions.length}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Soumettre mes réponses ({quizAnswers.size}/{quizQuestions.length})
            </button>
          )}

          {quizSubmitted && (
            <div className={`rounded-xl p-5 text-center shadow-md border-2 ${discount > 0 ? "bg-green-50 border-green-200" : "bg-muted border-border"}`}>
              <p className="text-3xl font-bold mb-1">{quizScore}/{quizQuestions.length}</p>
              <p className="text-sm text-muted-foreground mb-3">
                {discount > 0 ? `Félicitations ! Vous avez gagné une réduction de ${discount}%` : "Bonne chance la prochaine fois !"}
              </p>
              {discount > 0 && (
                <div className="bg-green-500 text-white rounded-lg px-4 py-2 font-bold text-lg inline-block">
                  -{discount}% de réduction
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">Mentionnez votre score au serveur pour appliquer la réduction.</p>
              <button onClick={() => setView("welcome")} className="mt-4 text-sm text-primary underline">
                Retour à l'accueil
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Success View ─────────────────────────────────────────────────────────────
  if (view === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-lg shadow-green-200">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Commande envoyée !</h2>
        <p className="text-muted-foreground mb-2">Votre commande #{orderId} est en cours de traitement.</p>
        {tableInfo && <p className="text-sm text-muted-foreground mb-6">Table #{tableInfo.number}</p>}

        <div className="space-y-3 w-full max-w-xs">
          {orderId && (
            <Link href={`/track/${orderId}`}>
              <div className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Suivre ma commande
              </div>
            </Link>
          )}
          <button
            onClick={() => { setView("welcome"); setCart(new Map()); setGuestName(""); setOrderId(null); }}
            className="w-full bg-white border-2 border-border text-foreground font-semibold py-3.5 rounded-xl hover:bg-muted transition-colors"
          >
            Nouvelle commande
          </button>
        </div>
      </div>
    );
  }

  return null;
}
