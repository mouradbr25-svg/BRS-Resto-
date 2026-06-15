import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Loader2, ChefHat, UtensilsCrossed, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type TrackData = {
  id: number;
  status: string;
  tableNumber: number | null;
  createdAt: string;
  estimatedMinutes: number;
  items: { name: string; nameAr: string | null; quantity: number }[];
};

const STEPS = [
  { status: "pending",   icon: CheckCircle2,    labelKey: "received" as const },
  { status: "preparing", icon: ChefHat,          labelKey: "cooking"  as const },
  { status: "served",    icon: UtensilsCrossed,  labelKey: "serving"  as const },
  { status: "completed", icon: CheckCircle2,     labelKey: "done"     as const },
] as const;

const STATUS_IDX: Record<string, number> = {
  pending: 0, preparing: 1, served: 2, completed: 3, cancelled: -1,
};

// ─── Live elapsed time ────────────────────────────────────────────────────────
function Elapsed({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(since).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return <span className="font-mono font-bold tabular-nums">{mm}:{ss}</span>;
}

// ─── Main tracker page ────────────────────────────────────────────────────────
export default function OrderTracker() {
  const { t, i18n } = useTranslation();
  const [, params] = useRoute("/track/:id");
  const orderId = params?.id;

  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/public/track/${orderId}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Order not found. Check your order number." : "Unable to load order status.");
        return;
      }
      const json: TrackData = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Connection error. Retrying...");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 8000);
    return () => clearInterval(id);
  }, [orderId]);

  const currentIdx = data ? (STATUS_IDX[data.status] ?? 0) : 0;
  const isCancelled = data?.status === "cancelled";
  const isDone = data?.status === "completed";
  const isAr = i18n.language === "ar";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col items-center justify-start py-10 px-4">
      {/* Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg mb-3">
          <UtensilsCrossed className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground">BRS Resto</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("orders.title")}</p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-sm">
        {loading && (
          <Card className="shadow-xl border-0">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <Card className="shadow-xl border-destructive/30">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-center text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground">Order #{orderId}</p>
            </CardContent>
          </Card>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Order header */}
            <Card className="shadow-xl border-0 overflow-hidden">
              <div className={`p-5 ${isDone ? "bg-green-500" : isCancelled ? "bg-destructive" : "bg-primary"} text-white`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/80 text-sm font-medium">Order #{data.id}</p>
                  {data.tableNumber && (
                    <span className="text-xs bg-white/20 rounded-full px-2.5 py-1 font-medium">
                      Table {data.tableNumber}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold font-serif">
                  {isCancelled ? t("status.cancelled") :
                   isDone ? t("status.completed") :
                   data.status === "served" ? t("status.served") :
                   data.status === "preparing" ? t("status.preparing") :
                   t("status.pending")}
                </p>
                {!isCancelled && !isDone && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-white/80 text-sm">
                    <Clock className="h-3.5 w-3.5" />
                    <Elapsed since={data.createdAt} />
                    {data.estimatedMinutes > 0 && (
                      <span className="text-white/60">· Est. {data.estimatedMinutes} min</span>
                    )}
                  </div>
                )}
              </div>

              <CardContent className="pt-5 pb-4">
                {/* Progress stepper */}
                {!isCancelled && (
                  <div className="flex items-start mb-5">
                    {STEPS.map((step, i) => {
                      const done = i <= currentIdx;
                      const active = i === currentIdx;
                      const isLast = i === STEPS.length - 1;
                      return (
                        <div key={step.status} className="flex items-start flex-1 min-w-0">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                              done
                                ? active
                                  ? "bg-primary shadow-md shadow-primary/30 scale-110"
                                  : "bg-primary/80"
                                : "bg-muted border-2 border-muted-foreground/20"
                            }`}>
                              <step.icon className={`h-4 w-4 ${done ? "text-white" : "text-muted-foreground/40"}`} />
                            </div>
                            <span className={`text-[9px] mt-1.5 font-medium text-center leading-tight ${
                              done ? "text-primary" : "text-muted-foreground/50"
                            }`}>
                              {t(`orders.progress.${step.labelKey}`)}
                            </span>
                          </div>
                          {!isLast && (
                            <div className={`flex-1 h-0.5 mt-4.5 mx-0.5 transition-all duration-700 ${
                              i < currentIdx ? "bg-primary" : "bg-muted-foreground/20"
                            }`} style={{ marginTop: "18px" }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Items */}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Order</p>
                  {data.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          <span className="text-primary font-bold">{item.quantity}×</span> {item.name}
                        </p>
                        {item.nameAr && isAr && (
                          <p className="text-xs text-muted-foreground" dir="rtl">{item.nameAr}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status message */}
            {!isCancelled && !isDone && (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground animate-pulse">
                  Auto-refreshing every 8 seconds...
                </p>
              </div>
            )}
            {isDone && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-sm font-semibold text-green-700">Enjoy your meal!</p>
                  <p className="text-xs text-green-600 mt-0.5">Thank you for dining with us.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-8">BRS Resto · Order #{orderId}</p>
    </div>
  );
}
