import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_valid_csv_upload_and_preview():
    # Dataset 1: Sales Dataset with known values
    csv_content = (
        "id,product,price,quantity\n"
        "1,Laptop,1200.50,4\n"
        "2,Mouse,25.00,10\n"
        "3,Keyboard,75.99,5\n"
        "4,Monitor,300.00,2\n"
        "5,Headphones,80.00,8\n"
    )
    files = {"file": ("sales_data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload", files=files)

    assert response.status_code == 201
    data = response.json()

    assert data["filename"] == "sales_data.csv"
    assert data["row_count"] == 5
    assert data["column_count"] == 4
    assert len(data["columns"]) == 4

    col_names = [col["name"] for col in data["columns"]]
    assert col_names == ["id", "product", "price", "quantity"]

    # Assert preview rows
    assert len(data["preview_rows"]) == 5
    assert data["preview_rows"][0]["product"] == "Laptop"
    assert data["preview_rows"][0]["price"] == 1200.50
    assert data["has_nulls"] is False
    assert data["has_duplicates"] is False
    assert data["duplicate_rows_count"] == 0

    # Test preview retrieval endpoint
    dataset_id = data["dataset_id"]
    preview_res = client.get(f"/api/dataset/{dataset_id}/preview?offset=1&limit=2")
    assert preview_res.status_code == 200
    p_data = preview_res.json()
    assert len(p_data["rows"]) == 2
    assert p_data["rows"][0]["product"] == "Mouse"

    # Test records endpoint for BI dashboard
    records_res = client.get(f"/api/dataset/{dataset_id}/records")
    assert records_res.status_code == 200
    r_data = records_res.json()
    assert r_data["total_rows"] == 5
    assert len(r_data["records"]) == 5
    assert r_data["records"][0]["product"] == "Laptop"

def test_second_different_dataset_proves_no_hardcoding():
    # Dataset 2: Students and grades (3 rows, 2 columns)
    csv_content = (
        "student_name,score\n"
        "Aman,92\n"
        "Priya,88\n"
        "Rohit,95\n"
    )
    files = {"file": ("students.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload", files=files)

    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "students.csv"
    assert data["row_count"] == 3
    assert data["column_count"] == 2
    assert [c["name"] for c in data["columns"]] == ["student_name", "score"]
    assert len(data["preview_rows"]) == 3

def test_csv_with_missing_values_and_duplicates():
    csv_content = (
        "name,age,city\n"
        "Alice,25,Delhi\n"
        "Bob,,Mumbai\n"
        "Alice,25,Delhi\n"  # Duplicate row
    )
    files = {"file": ("users.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload", files=files)

    assert response.status_code == 201
    data = response.json()
    assert data["row_count"] == 3
    assert data["has_nulls"] is True
    assert data["has_duplicates"] is True
    assert data["duplicate_rows_count"] == 1

    # Age column should report 1 null
    age_col = next(c for c in data["columns"] if c["name"] == "age")
    assert age_col["null_count"] == 1
    assert age_col["non_null_count"] == 2

def test_valid_excel_xlsx_upload_and_preview():
    import pandas as pd
    df = pd.DataFrame({
        "employee_id": [101, 102, 103],
        "department": ["Engineering", "Marketing", "Sales"],
        "salary": [95000.0, 72000.0, 81000.0]
    })
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    output.seek(0)

    files = {
        "file": (
            "employees.xlsx",
            output,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    }
    response = client.post("/api/upload", files=files)
    assert response.status_code == 201
    data = response.json()

    assert data["filename"] == "employees.xlsx"
    assert data["row_count"] == 3
    assert data["column_count"] == 3
    assert [c["name"] for c in data["columns"]] == ["employee_id", "department", "salary"]
    assert len(data["preview_rows"]) == 3
    assert data["preview_rows"][0]["department"] == "Engineering"

def test_reject_unsupported_extension():
    files = {"file": ("notes.txt", io.BytesIO(b"Hello World"), "text/plain")}
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400
    assert "Supported file formats" in response.json()["detail"]

def test_reject_empty_csv():
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_reject_malformed_csv():
    # CSV with no headers and no columns
    files = {"file": ("corrupt.csv", io.BytesIO(b"\n\n\n"), "text/csv")}
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400

def test_get_preview_invalid_id():
    # Path traversal / invalid format attempt
    response = client.get("/api/dataset/../../etc/passwd/preview")
    assert response.status_code == 400 or response.status_code == 404

    # Valid format but non-existent ID
    fake_id = "0" * 32
    response = client.get(f"/api/dataset/{fake_id}/preview")
    assert response.status_code == 404
