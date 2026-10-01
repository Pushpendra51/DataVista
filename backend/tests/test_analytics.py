import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SALES_CSV = (
    "transaction_id,customer_name,region,product_category,unit_price,quantity,discount_pct\n"
    "1001,Aarav Sharma,North,Electronics,1200.0,2,0.05\n"
    "1002,Pooja Patel,West,Home Appliances,450.5,1,0.00\n"
    "1003,Rohan Verma,South,Electronics,85.0,5,0.10\n"
    "1004,Neha Gupta,East,Furniture,320.0,3,0.15\n"
    "1005,Vikram Singh,North,Office Supplies,45.0,12,0.00\n"
    "1006,Ananya Roy,East,Electronics,950.0,1,0.05\n"
    "1007,Karan Mehta,West,Home Appliances,,2,0.00\n"   # null unit_price
    "1008,Sunita Rao,South,Furniture,640.0,2,0.20\n"
    "1001,Aarav Sharma,North,Electronics,1200.0,2,0.05\n"  # exact duplicate of row 1
    "1010,Deepak Joshi,North,Office Supplies,25.0,20,0.00\n"
)


def _upload() -> str:
    files = {"file": ("sales.csv", io.BytesIO(SALES_CSV.encode()), "text/csv")}
    res = client.post("/api/upload", files=files)
    assert res.status_code == 201
    return res.json()["dataset_id"]


# ─── Quality ──────────────────────────────────────────────────────────────────

def test_quality_report_structure():
    did = _upload()
    res = client.get(f"/api/analytics/{did}/quality")
    assert res.status_code == 200
    d = res.json()
    assert d["total_rows"] == 10
    assert d["total_columns"] == 7
    assert d["duplicate_rows"] == 1
    assert d["total_missing_cells"] >= 1
    assert any(c["column"] == "unit_price" for c in d["columns_with_nulls"])

def test_quality_missing_percentage():
    did = _upload()
    res = client.get(f"/api/analytics/{did}/quality")
    d = res.json()
    assert d["total_missing_percentage"] > 0

def test_quality_invalid_id():
    res = client.get("/api/analytics/notavalidid/quality")
    assert res.status_code == 400

def test_quality_nonexistent_id():
    res = client.get(f"/api/analytics/{'0' * 32}/quality")
    assert res.status_code == 404


# ─── Statistics ───────────────────────────────────────────────────────────────

def test_statistics_numeric_columns():
    did = _upload()
    res = client.get(f"/api/analytics/{did}/statistics")
    assert res.status_code == 200
    d = res.json()
    assert len(d["numeric_stats"]) >= 1
    col_names = [s["column"] for s in d["numeric_stats"]]
    assert "unit_price" in col_names or "quantity" in col_names

def test_statistics_numeric_values_are_real():
    did = _upload()
    res = client.get(f"/api/analytics/{did}/statistics")
    d = res.json()
    qty_stat = next(s for s in d["numeric_stats"] if s["column"] == "quantity")
    # quantity values: 2,1,5,3,12,1,2,2,2,20 → mean ≈ 5.0
    assert qty_stat["mean"] is not None
    assert qty_stat["min_val"] == 1.0
    assert qty_stat["max_val"] == 20.0

def test_statistics_categorical_frequencies():
    did = _upload()
    res = client.get(f"/api/analytics/{did}/statistics")
    d = res.json()
    cat_cols = [f["column"] for f in d["categorical_frequencies"]]
    assert "region" in cat_cols or "product_category" in cat_cols

def test_statistics_top_n_respected():
    did = _upload()
    res = client.get(f"/api/analytics/{did}/statistics?top_n=2")
    d = res.json()
    for freq in d["categorical_frequencies"]:
        assert len(freq["frequencies"]) <= 2


# ─── Correlation ──────────────────────────────────────────────────────────────

def test_correlation_matrix_shape():
    did = _upload()
    res = client.get(f"/api/analytics/{did}/correlation")
    assert res.status_code == 200
    d = res.json()
    n = len(d["columns"])
    assert len(d["matrix"]) == n
    for row in d["matrix"]:
        assert len(row) == n

def test_correlation_diagonal_is_one():
    did = _upload()
    d = client.get(f"/api/analytics/{did}/correlation").json()
    for i in range(len(d["columns"])):
        assert d["matrix"][i][i] == 1.0
