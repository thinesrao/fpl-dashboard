import ast


def test_pipeline_uses_supabase_penalty_source_not_sheet():
    src = open("data_pipeline.py").read()
    # The pipeline must read penalty events from Supabase, not the old sheet.
    assert "fetch_penalty_events" in src
    # It must not READ the manual_penalty_data sheet back as an input.
    assert "get_all_records" not in src
    # It must still import from penalty_source.
    tree = ast.parse(src)
    imported = {
        n.module
        for n in ast.walk(tree)
        if isinstance(n, ast.ImportFrom)
    }
    assert "penalty_source" in imported


def test_pipeline_backs_up_penalties_to_sheet():
    src = open("data_pipeline.py").read()
    # The current Supabase rows are mirrored to a backup worksheet each run.
    assert 'write_worksheet(spreadsheet, "manual_penalty_data"' in src
