import { useState, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import {
  UtensilsCrossed, ChefHat, Gamepad2, ClipboardList,
  Plus, Minus, CheckCircle2, ArrowLeft, Loader2, AlertCircle,
  Flame, Leaf, Wheat, ShoppingBag, ChevronRight, Star, Trophy,
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

// ─── Category icons ─────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  boissons: "🥤", boisson: "🥤", drinks: "🥤",
  jus: "🍹", juice: "🍹",
  plats: "🍽", "plats principaux": "🍽", dishes: "🍽",
  desserts: "🍮", dessert: "🍮",
  entrées: "🥗", entrees: "🥗", salades: "🥗",
  grillades: "🔥", grillade: "🔥", grillés: "🔥",
  pizzas: "🍕", pizza: "🍕",
  sandwichs: "🥖", sandwich: "🥖", sandwiches: "🥖",
};
function catIcon(name: string): string {
  const k = name.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) if (k.includes(key)) return val;
  return "🍴";
}

// ─── Hero background (restaurant ambiance) ─────────────────────────────────────
const HERO_BG = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&auto=format&fit=crop&q=80";
const MENU_CARD_BG = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80";

// ─── Dietary badges ─────────────────────────────────────────────────────────────
function DietaryBadges({ item }: { item: PublicMenuItem }) {
  return (
    <div className="flex gap-1">
      {item.isSpicy && <span className="text-[10px] bg-red-100 text-red-600 rounded px-1 py-0.5 font-medium flex items-center gap-0.5"><Flame className="h-2.5 w-2.5" />Épicé</span>}
      {item.isVegan && <span className="text-[10px] bg-green-100 text-green-600 rounded px-1 py-0.5 font-medium flex items-center gap-0.5"><Leaf className="h-2.5 w-2.5" />Végane</span>}
      {item.isGlutenFree && <span className="text-[10px] bg-amber-100 text-amber-600 rounded px-1 py-0.5 font-medium flex items-center gap-0.5"><Wheat className="h-2.5 w-2.5" />S.G</span>}
    </div>
  );
}

// ─── Menu Item Card ─────────────────────────────────────────────────────────────
function ItemCard({ item, qty, onAdd, onRemove }: {
  item: PublicMenuItem; qty: number; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all duration-200 ${qty > 0 ? "border-primary shadow-primary/20 shadow-md" : "border-transparent"}`}>
      {/* Image */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {catIcon(item.categoryName ?? "")}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {/* Cart count badge */}
        {qty > 0 && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shadow-lg">
            {qty}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="font-bold text-sm leading-tight text-gray-900">{item.name}</p>
        {item.nameAr && <p className="text-xs text-gray-400 mt-0.5" dir="rtl">{item.nameAr}</p>}
        {(item.isSpicy || item.isVegan || item.isGlutenFree) && (
          <div className="mt-1.5"><DietaryBadges item={item} /></div>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-base font-extrabold text-primary">{formatDZD(item.price)}</span>
          <div className="flex items-center gap-1.5">
            {qty > 0 ? (
              <>
                <button onClick={onRemove} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 active:scale-90 transition-all">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-bold text-gray-900">{qty}</span>
                <button onClick={onAdd} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 active:scale-90 transition-all shadow-sm">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button onClick={onAdd} className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
                <Plus className="h-3 w-3" /> Ajouter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Order Dialog ───────────────────────────────────────────────────────
function ConfirmDialog({ cart, tableInfo, onClose, onSubmit, submitting, error }: {
  cart: Map<number, CartEntry>;
  tableInfo: TableInfo | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const total = Array.from(cart.values()).reduce((s, e) => s + e.item.price * e.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pt-4 pb-6 space-y-5">
          <h2 className="text-xl font-serif font-bold text-gray-900">Confirmer la commande</h2>

          {/* Name input */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-2">Votre prénom *</label>
            <input
              type="text"
              placeholder="Ex: Ahmed, Fatima..."
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full border-2 border-gray-200 focus:border-primary rounded-xl px-4 py-3 text-base font-medium outline-none transition-colors"
            />
          </div>

          {/* Table */}
          {tableInfo && (
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Table</span>
              <span className="font-bold text-gray-900 ms-auto">#{tableInfo.number}</span>
            </div>
          )}

          {/* Cart summary */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Array.from(cart.values()).map(entry => (
              <div key={entry.item.id} className="flex items-center gap-3">
                {entry.item.imageUrl && (
                  <img src={entry.item.imageUrl} alt={entry.item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{entry.item.name}</span>
                <span className="text-xs text-gray-400 font-medium">×{entry.quantity}</span>
                <span className="text-sm font-bold text-primary">{formatDZD(entry.item.price * entry.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-dashed">
            <span className="font-semibold text-gray-500">Total</span>
            <span className="text-2xl font-extrabold text-primary">{formatDZD(total)}</span>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <button
            onClick={() => onSubmit(name)}
            disabled={submitting || !name.trim()}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl text-base hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {submitting ? "Envoi en cours..." : "Passer la commande"}
          </button>
          <button onClick={onClose} className="w-full text-sm text-gray-400 py-2 hover:text-gray-600 transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Portal ────────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const [, params] = useRoute("/portal/:tableId");
  const tableId = parseInt(params?.tableId ?? "0", 10);

  const [view, setView] = useState<View>("welcome");
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tableError, setTableError] = useState(false);

  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  const [cart, setCart] = useState<Map<number, CartEntry>>(new Map());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Map<number, number>>(new Map());
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  useEffect(() => {
    if (!tableId) return;
    fetch(`/api/public/table/${tableId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setTableInfo)
      .catch(() => setTableError(true));
  }, [tableId]);

  useEffect(() => {
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

  const submitOrder = async (guestName: string) => {
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
      setConfirmOpen(false);
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
      setQuizQuestions(await res.json());
      setQuizAnswers(new Map());
      setQuizSubmitted(false);
      setView("quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  const quizScore = quizSubmitted
    ? Array.from(quizAnswers.entries()).filter(([id, ans]) => quizQuestions.find(q => q.id === id)?.correctAnswer === ans).length
    : 0;
  const discount = quizSubmitted ? (quizScore / quizQuestions.length >= 0.8 ? 40 : quizScore / quizQuestions.length >= 0.6 ? 25 : quizScore / quizQuestions.length >= 0.4 ? 15 : 0) : 0;

  // ─── Table Error ──────────────────────────────────────────────────────────────
  if (tableError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <AlertCircle className="h-14 w-14 text-red-400 mx-auto" />
          <p className="font-bold text-white text-lg">Table introuvable</p>
          <p className="text-zinc-400 text-sm">Vérifiez le QR code sur votre table.</p>
        </div>
      </div>
    );
  }

  // ─── WELCOME VIEW ─────────────────────────────────────────────────────────────
  if (view === "welcome") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">

        {/* Hero */}
        <div className="relative flex flex-col items-center justify-end overflow-hidden" style={{ minHeight: "52vh" }}>
          <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-zinc-950" />

          <div className="relative z-10 text-center px-6 pb-8 w-full max-w-sm mx-auto">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl bg-primary shadow-2xl shadow-primary/50 flex items-center justify-center mx-auto mb-5">
              <UtensilsCrossed className="h-10 w-10 text-white" />
            </div>

            <h1 className="text-5xl font-serif font-bold text-white tracking-tight drop-shadow-lg">BRS Resto</h1>
            <p className="text-white/60 text-sm mt-1 tracking-widest uppercase">Restaurant Algérien Premium</p>

            {tableInfo && (
              <div className="inline-flex items-center gap-2 mt-4 bg-white/15 backdrop-blur-md border border-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Table #{tableInfo.number}
              </div>
            )}
          </div>
        </div>

        {/* Welcome Text */}
        <div className="bg-zinc-950 px-6 pt-6 pb-4">
          <div className="max-w-sm mx-auto">
            <h2 className="text-2xl font-serif font-bold text-white mb-3">
              Bienvenue chez nous !
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-1">
              Découvrez notre cuisine algérienne authentique, préparée avec passion et des ingrédients frais chaque jour.
            </p>
            <p className="text-zinc-500 text-sm text-right" dir="rtl">
              مرحبًا بكم في مطعمنا — استمتعوا بأطباقنا الجزائرية الأصيلة
            </p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="flex-1 px-4 pb-4 max-w-sm mx-auto w-full space-y-3">

          {/* Menu Card — Large, photo background */}
          <button
            onClick={() => setView("order")}
            className="relative w-full h-48 rounded-2xl overflow-hidden shadow-xl group"
          >
            <img src={MENU_CARD_BG} alt="Menu" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
            <div className="absolute inset-0 p-5 flex flex-col justify-end text-left">
              <ChefHat className="h-7 w-7 text-amber-400 mb-2" />
              <p className="text-white text-xl font-serif font-bold">Notre Carte</p>
              <p className="text-white/70 text-sm mt-0.5">17 plats • 7 catégories</p>
            </div>
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
              Explorer <ChevronRight className="h-3 w-3" />
            </div>
          </button>

          {/* Quiz + Track Cards — side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quiz Card */}
            <button
              onClick={openQuiz}
              disabled={quizLoading}
              className="h-40 rounded-2xl overflow-hidden relative shadow-lg group"
              style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)" }}
            >
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}
              />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  {quizLoading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Trophy className="h-5 w-5 text-white" />}
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-base leading-tight">Quiz Fidélité</p>
                  <p className="text-white/80 text-xs mt-0.5">Gagnez jusqu'à</p>
                  <p className="text-white font-extrabold text-lg">-40%</p>
                </div>
              </div>
            </button>

            {/* Track Order Card */}
            <button
              onClick={() => {
                const id = prompt("Numéro de commande :");
                if (id?.trim()) window.location.href = `/track/${id.trim()}`;
              }}
              className="h-40 rounded-2xl overflow-hidden relative shadow-lg group"
              style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)" }}
            >
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-base leading-tight">Suivi</p>
                  <p className="text-white/70 text-xs mt-0.5">État de votre commande en temps réel</p>
                </div>
              </div>
            </button>
          </div>

          {/* Category preview pills */}
          {categories.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">Nos catégories</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCatId(cat.id); setView("order"); }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium px-3 py-2 rounded-full transition-colors border border-zinc-700"
                  >
                    <span>{catIcon(cat.name)}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="sticky bottom-0 px-4 py-4 bg-zinc-950/95 backdrop-blur border-t border-white/10">
          <button
            onClick={() => setView("order")}
            className="w-full py-5 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-2xl shadow-primary/40 active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #C0392B 0%, #e74c3c 50%, #c0392b 100%)" }}
          >
            <Plus className="h-5 w-5" />
            Passer une commande
            {cartCount > 0 && (
              <span className="ms-1 bg-white text-primary text-xs font-extrabold rounded-full w-6 h-6 flex items-center justify-center shadow">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── ORDER VIEW ───────────────────────────────────────────────────────────────
  if (view === "order") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 bg-zinc-900 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <button onClick={() => setView("welcome")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-serif font-bold text-base">Notre Carte</h2>
            {tableInfo && <p className="text-xs text-white/50">Table #{tableInfo.number}</p>}
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm active:scale-95 transition-all"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount}
            </button>
          )}
        </header>

        {/* Category Tabs */}
        <div className="bg-white border-b sticky top-[57px] z-10 shadow-sm">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`flex-shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all ${
                  selectedCatId === cat.id
                    ? "bg-zinc-900 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span className="text-base">{catIcon(cat.name)}</span>
                <span>{cat.name}</span>
                <span className={`text-xs font-medium ${selectedCatId === cat.id ? "text-white/60" : "text-gray-400"}`}>
                  {menuItems.filter(m => m.categoryId === cat.id).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 pb-28">
          {menuLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-2xl bg-white overflow-hidden shadow-sm border border-gray-100">
                  <div className="h-44 bg-gray-200 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    <div className="h-8 bg-gray-100 rounded-xl animate-pulse mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="text-5xl mb-3 block">🍽</span>
              <p className="text-sm">Aucun article disponible.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
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

        {/* Sticky Cart Bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-20 px-4 py-4 bg-zinc-900/95 backdrop-blur border-t border-white/10">
            <button
              onClick={() => setConfirmOpen(true)}
              className="w-full flex items-center justify-between bg-primary text-white font-bold px-5 py-4 rounded-2xl shadow-2xl shadow-primary/40 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="bg-white/20 text-white text-sm font-extrabold rounded-full w-7 h-7 flex items-center justify-center">
                  {cartCount}
                </span>
                <span>{cartCount > 1 ? "articles" : "article"}</span>
              </div>
              <span className="text-base font-extrabold">{formatDZD(cartTotal)}</span>
              <div className="flex items-center gap-1">
                <span>Commander</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmOpen && (
          <ConfirmDialog
            cart={cart}
            tableInfo={tableInfo}
            onClose={() => setConfirmOpen(false)}
            onSubmit={submitOrder}
            submitting={submitting}
            error={submitError}
          />
        )}
      </div>
    );
  }

  // ─── QUIZ VIEW ────────────────────────────────────────────────────────────────
  if (view === "quiz") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden px-5 pt-12 pb-8 text-center"
          style={{ background: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)" }}>
          <button onClick={() => setView("welcome")} className="absolute top-5 left-4 p-2 rounded-xl bg-black/20 text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Trophy className="h-12 w-12 text-white mx-auto mb-3 drop-shadow" />
          <h2 className="text-2xl font-serif font-bold text-white">Quiz Fidélité</h2>
          <p className="text-amber-100 text-sm mt-1">Répondez correctement et gagnez jusqu'à <strong>-40%</strong></p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
          {quizQuestions.length === 0 ? (
            <div className="text-center py-16">
              <Gamepad2 className="h-14 w-14 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">Aucune question disponible.</p>
              <button onClick={() => setView("welcome")} className="mt-4 text-amber-400 text-sm underline">Retour</button>
            </div>
          ) : (
            <>
              {quizQuestions.map((q, idx) => {
                const answered = quizAnswers.get(q.id);
                const isCorrect = quizSubmitted && answered === q.correctAnswer;
                const isWrong = quizSubmitted && answered !== undefined && answered !== q.correctAnswer;
                return (
                  <div key={q.id} className={`bg-zinc-800 rounded-2xl p-5 border-2 transition-colors ${isCorrect ? "border-green-400" : isWrong ? "border-red-400" : answered !== undefined ? "border-amber-500" : "border-zinc-700"}`}>
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">{idx + 1}</span>
                      <p className="text-white font-medium text-sm leading-relaxed">{q.question}</p>
                    </div>
                    <div className="space-y-2">
                      {q.options.map((opt, i) => {
                        const isSelected = answered === i;
                        const showCorrect = quizSubmitted && i === q.correctAnswer;
                        return (
                          <button
                            key={i}
                            disabled={quizSubmitted}
                            onClick={() => !quizSubmitted && setQuizAnswers(prev => new Map(prev).set(q.id, i))}
                            className={`w-full text-start text-sm px-4 py-3 rounded-xl border transition-all font-medium ${
                              showCorrect ? "border-green-400 bg-green-400/20 text-green-300" :
                              isSelected && quizSubmitted ? "border-red-400 bg-red-400/10 text-red-300" :
                              isSelected ? "border-amber-400 bg-amber-400/20 text-amber-200" :
                              "border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:bg-zinc-700/50"
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

              {!quizSubmitted && (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={quizAnswers.size < quizQuestions.length}
                  className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-50 active:scale-95 transition-all"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                >
                  Soumettre ({quizAnswers.size}/{quizQuestions.length})
                </button>
              )}

              {quizSubmitted && (
                <div className={`rounded-2xl p-6 text-center border-2 ${discount > 0 ? "border-green-400 bg-green-900/30" : "border-zinc-600 bg-zinc-800"}`}>
                  <div className="text-5xl font-extrabold text-white mb-1">{quizScore}<span className="text-2xl text-zinc-400">/{quizQuestions.length}</span></div>
                  {discount > 0 ? (
                    <>
                      <p className="text-green-300 font-semibold mt-2">Félicitations !</p>
                      <div className="mt-3 inline-block bg-green-500 text-white font-extrabold text-2xl px-6 py-2 rounded-xl shadow-lg">
                        -{discount}%
                      </div>
                      <p className="text-zinc-400 text-xs mt-3">Signalez ce résultat à votre serveur pour bénéficier de la réduction.</p>
                    </>
                  ) : (
                    <p className="text-zinc-400 mt-2 text-sm">Bonne chance la prochaine fois !</p>
                  )}
                  <button onClick={() => setView("welcome")} className="mt-4 text-amber-400 text-sm font-medium hover:text-amber-300 transition-colors">
                    ← Retour à l'accueil
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── SUCCESS VIEW ─────────────────────────────────────────────────────────────
  if (view === "success") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-2xl shadow-green-500/40">
          <CheckCircle2 className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-white mb-2">Commande envoyée !</h2>
        <p className="text-zinc-400 text-base mb-1">
          Votre commande est en cours de préparation.
        </p>
        {orderId && (
          <p className="text-zinc-500 text-sm mb-2">
            Numéro de commande : <span className="text-amber-400 font-bold">#{orderId}</span>
          </p>
        )}
        {tableInfo && <p className="text-zinc-500 text-sm mb-8">Table #{tableInfo.number}</p>}

        <div className="space-y-3 w-full max-w-xs">
          {orderId && (
            <Link href={`/track/${orderId}`}>
              <div className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors">
                <ClipboardList className="h-5 w-5" />
                Suivre ma commande
              </div>
            </Link>
          )}
          <button
            onClick={() => { setView("welcome"); setCart(new Map()); setOrderId(null); }}
            className="w-full bg-zinc-800 border border-zinc-700 text-white font-semibold py-4 rounded-2xl hover:bg-zinc-700 transition-colors"
          >
            Nouvelle commande
          </button>
        </div>

        {/* Stars decoration */}
        <div className="mt-10 flex gap-2">
          {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />)}
        </div>
        <p className="text-zinc-600 text-xs mt-2">Merci de votre confiance !</p>
      </div>
    );
  }

  return null;
}
