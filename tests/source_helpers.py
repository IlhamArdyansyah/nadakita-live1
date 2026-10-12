"""Adapt source-injection harnesses to multiline imports, without changing app logic."""
import re

def without_imports(source):
    # Test-only injection: dependencies are supplied by each fixture, not fetched.
    return re.sub(r'^import\b[\s\S]*?;\s*', '', source, flags=re.MULTILINE)
