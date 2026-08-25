import ast


def test_pipeline_uses_supabase_penalty_source_not_sheet():
    src = open("data_pipeline.py").read()
    # The pipeline must call the new source and no longer read the old sheet.
    assert "fetch_penalty_events" in src
    assert "manual_penalty_data" not in src
    # It must still import from penalty_source.
    tree = ast.parse(src)
    imported = {
        n.module
        for n in ast.walk(tree)
        if isinstance(n, ast.ImportFrom)
    }
    assert "penalty_source" in imported
