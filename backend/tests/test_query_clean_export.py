import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SIMPLE_CSV = (
    "name,region,score,grade\n"
    "Alice,North,88,A\n"
    "Bob,South,72,B\n"
    "Carol,North,95,A\n"
    "Dan,East,60,C\n"
    "Eve,South,88,A\n"
)


def _upload() -> str:
    files = {"file": ("test.csv", io.BytesIO(SIMPLE_CSV.encode()), "text/csv")}
    res = client.post("/api/upload", files=files)
    assert res.status_code == 201
    return res.json()["dataset_id"]


# ─── Valid queries ─────────────────────────────────────────────────────────────

def test_query_sum():
    did = _upload()
    res = client.post(f"/api/query/{did}", json={"operation": "sum", "column": "score"})
    assert res.status_code == 200
    d = res.json()
    assert d["supported"] is True
    # 88+72+95+60+88 = 403
    assert d["result"] == 403.0

def test_query_mean():
    did = _upload()
    res = client.post(f"/api/query/{did}", json={"operation": "mean", "column": "score"})
    d = res.json()
    # 403 / 5 = 80.6
    assert abs(d["result"] - 80.6) < 0.01

def test_query_median():
    did = _upload()
    res = client.post(f"/api/query/{did}", json={"operation": "median", "column": "score"})
    d = res.json()
    assert d["result"] == 88.0

def test_query_min():
    did = _upload()
    d = client.post(f"/api/query/{did}", json={"operation": "min", "column": "score"}).json()
    assert d["result"] == 60.0

def test_query_max():
    did = _upload()
    d = client.post(f"/api/query/{did}", json={"operation": "max", "column": "score"}).json()
    assert d["result"] == 95.0

def test_query_count():
    did = _upload()
    d = client.post(f"/api/query/{did}", json={"operation": "count", "column": "score"}).json()
    assert d["result"] == 5

def test_query_unique_count():
    did = _upload()
    d = client.post(f"/api/query/{did}", json={"operation": "unique_count", "column": "region"}).json()
    # North, South, East → 3
    assert d["result"] == 3

def test_query_null_count():
    did = _upload()
    d = client.post(f"/api/query/{did}", json={"operation": "null_count", "column": "score"}).json()
    assert d["result"] == 0

def test_query_top_n():
    did = _upload()
    d = client.post(f"/api/query/{did}", json={"operation": "top_n", "column": "grade", "top_n": 3}).json()
    assert isinstance(d["result"], list)
    assert d["result"][0]["value"] == "A"
    assert d["result"][0]["count"] == 3

def test_query_groupby():
    did = _upload()
    d = client.post(f"/api/query/{did}", json={
        "operation": "groupby", "column": "score", "group_by": "region"
    }).json()
    assert isinstance(d["result"], dict)
    assert "North" in d["result"]


# ─── Unsupported / Invalid ─────────────────────────────────────────────────────

def test_query_unsupported_operation():
    did = _upload()
    d = client.post(f"/api/query/{did}", json={"operation": "delete", "column": "score"}).json()
    assert d["supported"] is False
    assert "not supported" in d["formatted_result"]

def test_query_invalid_column():
    did = _upload()
    res = client.post(f"/api/query/{did}", json={"operation": "sum", "column": "nonexistent"})
    assert res.status_code == 400

def test_query_numeric_op_on_categorical():
    did = _upload()
    res = client.post(f"/api/query/{did}", json={"operation": "sum", "column": "region"})
    assert res.status_code == 400
    assert "numeric" in res.json()["detail"].lower()

def test_query_groupby_missing_group_column():
    did = _upload()
    res = client.post(f"/api/query/{did}", json={"operation": "groupby", "column": "score"})
    assert res.status_code == 400


# ─── Cleaning ─────────────────────────────────────────────────────────────────

NULL_CSV = (
    "name,age,city\n"
    "Alice,25,Delhi\n"
    "Bob,,Mumbai\n"
    "Alice,25,Delhi\n"  # duplicate
    "Carol,30,\n"
)


def _upload_null() -> str:
    files = {"file": ("nulls.csv", io.BytesIO(NULL_CSV.encode()), "text/csv")}
    res = client.post("/api/upload", files=files)
    assert res.status_code == 201
    return res.json()["dataset_id"]


def test_clean_drop_duplicates():
    did = _upload_null()
    res = client.post(f"/api/clean/{did}", json={"action": "drop_duplicates"})
    assert res.status_code == 200
    d = res.json()
    assert d["rows_before"] == 4
    assert d["rows_after"] == 3
    assert d["rows_removed"] == 1
    assert len(d["new_dataset_id"]) == 32
    # Verify original is unchanged
    orig = client.get(f"/api/dataset/{did}/preview")
    assert orig.json()["total_rows"] == 4

def test_clean_drop_nulls_column():
    did = _upload_null()
    res = client.post(f"/api/clean/{did}", json={"action": "drop_nulls", "column": "age"})
    d = res.json()
    assert d["rows_before"] == 4
    assert d["rows_after"] == 3  # Bob's row dropped

def test_clean_fill_nulls_mean():
    did = _upload_null()
    res = client.post(f"/api/clean/{did}", json={"action": "fill_nulls_mean", "column": "age"})
    assert res.status_code == 200
    d = res.json()
    assert "mean" in d["message"].lower()
    new_did = d["new_dataset_id"]
    # Verify cleaned dataset has no nulls in age
    q = client.get(f"/api/analytics/{new_did}/quality")
    quality = q.json()
    null_cols = [c["column"] for c in quality["columns_with_nulls"]]
    assert "age" not in null_cols

def test_clean_fill_nulls_mode():
    did = _upload_null()
    res = client.post(f"/api/clean/{did}", json={"action": "fill_nulls_mode", "column": "city"})
    assert res.status_code == 200

def test_clean_fill_nulls_value():
    did = _upload_null()
    res = client.post(f"/api/clean/{did}", json={"action": "fill_nulls_value", "column": "city", "fill_value": "Unknown"})
    assert res.status_code == 200

def test_clean_unsupported_action():
    did = _upload_null()
    res = client.post(f"/api/clean/{did}", json={"action": "delete_all"})
    assert res.status_code == 400

def test_clean_invalid_column():
    did = _upload_null()
    res = client.post(f"/api/clean/{did}", json={"action": "drop_nulls", "column": "nonexistent"})
    assert res.status_code == 400


# ─── Export ───────────────────────────────────────────────────────────────────

def test_export_csv():
    files = {"file": ("exp.csv", io.BytesIO(SIMPLE_CSV.encode()), "text/csv")}
    did = client.post("/api/upload", files=files).json()["dataset_id"]
    res = client.get(f"/api/export/{did}/csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "name" in content
    assert "Alice" in content

def test_export_summary():
    files = {"file": ("exp2.csv", io.BytesIO(SIMPLE_CSV.encode()), "text/csv")}
    did = client.post("/api/upload", files=files).json()["dataset_id"]
    res = client.get(f"/api/export/{did}/summary")
    assert res.status_code == 200
    import json
    summary = json.loads(res.content)
    assert "data_quality" in summary
    assert "descriptive_statistics" in summary
    assert "correlation" in summary
    assert summary["shape"]["rows"] == 5
