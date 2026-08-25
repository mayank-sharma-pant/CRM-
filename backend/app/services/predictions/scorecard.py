import math

MIN_SAMPLES = 10
_ALPHA = 1.0  # Laplace smoothing strength
_BINARY_FEATURES = ("has_client", "has_owner")


def _odds(p: float) -> float:
    p = min(max(p, 1e-6), 1 - 1e-6)
    return p / (1 - p)


def _sigmoid(x: float) -> float:
    if x < 0:
        z = math.exp(x)
        return z / (1 + z)
    return 1 / (1 + math.exp(-x))


def _terciles(values: list[float]) -> list[float]:
    s = sorted(values)
    if not s:
        return [0.0, 0.0]
    t1 = s[len(s) // 3]
    t2 = s[(2 * len(s)) // 3]
    return [t1, t2]


def amount_band(amount: float, thresholds: list[float]) -> str:
    t1, t2 = thresholds
    if amount < t1:
        return "low"
    if amount < t2:
        return "med"
    return "high"


def _smoothed_rate(wins: int, n: int, base_rate: float) -> float:
    return (wins + _ALPHA * base_rate) / (n + _ALPHA)


def fit_scorecard(rows: list[dict]) -> dict:
    n = len(rows)
    wins = sum(1 for r in rows if r["won"])
    if n == 0:
        return {"model": "fallback", "base_rate": 0.5, "sample_count": 0}
    base_rate = (wins + _ALPHA * 0.5) / (n + _ALPHA)
    if n < MIN_SAMPLES or wins == 0 or wins == n:
        return {"model": "fallback", "base_rate": round(base_rate, 6), "sample_count": n}

    thresholds = _terciles([float(r["amount"] or 0.0) for r in rows])

    def value_of(r, feature):
        if feature == "source":
            return (r.get("source") or "").strip().lower() or "(none)"
        if feature == "amount_band":
            return amount_band(float(r["amount"] or 0.0), thresholds)
        return "true" if r.get(feature) else "false"

    features = {}
    for feature in ("source", "amount_band", *_BINARY_FEATURES):
        counts = {}
        for r in rows:
            v = value_of(r, feature)
            agg = counts.setdefault(v, [0, 0])  # [wins, n]
            agg[1] += 1
            if r["won"]:
                agg[0] += 1
        features[feature] = {
            v: round(_smoothed_rate(w, cnt, base_rate), 6) for v, (w, cnt) in counts.items()
        }

    return {
        "model": "trained",
        "base_rate": round(base_rate, 6),
        "sample_count": n,
        "amount_thresholds": thresholds,
        "features": features,
    }


def predict_scorecard(params: dict, feats: dict) -> dict:
    base_rate = params.get("base_rate", 0.5)
    if params.get("model") != "trained":
        return {"probability": round(base_rate, 4), "model": "fallback",
                "base_rate": round(base_rate, 6), "factors": []}

    thresholds = params["amount_thresholds"]
    features = params["features"]
    base_logit = math.log(_odds(base_rate))
    logit = base_logit
    factors = []

    def value_of(feature):
        if feature == "source":
            return (feats.get("source") or "").strip().lower() or "(none)"
        if feature == "amount_band":
            return amount_band(float(feats.get("amount") or 0.0), thresholds)
        return "true" if feats.get(feature) else "false"

    for feature, table in features.items():
        v = value_of(feature)
        rate = table.get(v)
        if rate is None:
            continue  # unseen value -> neutral
        contribution = math.log(_odds(rate)) - base_logit
        logit += contribution
        factors.append({"feature": feature, "value": v, "contribution": round(contribution, 4)})

    factors.sort(key=lambda f: abs(f["contribution"]), reverse=True)
    return {
        "probability": round(_sigmoid(logit), 4),
        "model": "trained",
        "base_rate": round(base_rate, 6),
        "factors": factors,
    }
