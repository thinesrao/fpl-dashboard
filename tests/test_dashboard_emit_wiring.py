def test_pipeline_writes_dashboard_json():
    src = open("data_pipeline.py").read()
    assert "build_dashboard_payload" in src
    assert "write_dashboard_json" in src
    assert "dashboard.json" in src
