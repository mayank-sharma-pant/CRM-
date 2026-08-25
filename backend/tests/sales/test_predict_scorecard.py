from app.services.predictions.scorecard import fit_scorecard, predict_scorecard, MIN_SAMPLES


def _rows(n_per, source_win):
    rows = []
    for src, wins in source_win.items():
        for i in range(n_per):
            rows.append({
                "won": i < wins,
                "source": src,
                "amount": 1000.0 * (i + 1),
                "has_client": bool(i % 2),
                "has_owner": True,
            })
    return rows


def test_fallback_when_thin():
    params = fit_scorecard(_rows(2, {"A": 1}))  # 4 rows < MIN_SAMPLES
    assert params["model"] == "fallback"
    out = predict_scorecard(params, {"source": "A", "amount": 500, "has_client": True, "has_owner": True})
    assert 0.0 <= out["probability"] <= 1.0
    assert out["model"] == "fallback"
    assert out["factors"] == []


def test_fallback_single_class():
    rows = _rows(20, {"A": 20})  # all won -> single class
    assert fit_scorecard(rows)["model"] == "fallback"


def test_trained_ranks_winning_source_higher():
    rows = _rows(10, {"A": 8, "B": 2})
    params = fit_scorecard(rows)
    assert params["model"] == "trained"
    pa = predict_scorecard(params, {"source": "A", "amount": 5000, "has_client": True, "has_owner": True})
    pb = predict_scorecard(params, {"source": "B", "amount": 5000, "has_client": True, "has_owner": True})
    assert pa["probability"] > pb["probability"]
    assert 0.0 <= pb["probability"] <= 1.0 and 0.0 <= pa["probability"] <= 1.0
    src_factor = next(f for f in pa["factors"] if f["feature"] == "source")
    assert src_factor["contribution"] > 0


def test_unseen_source_is_neutral():
    rows = _rows(10, {"A": 8, "B": 2})
    params = fit_scorecard(rows)
    out = predict_scorecard(params, {"source": "ZZZ", "amount": 5000, "has_client": True, "has_owner": True})
    src_factor = next((f for f in out["factors"] if f["feature"] == "source"), None)
    assert src_factor is None or src_factor["contribution"] == 0
