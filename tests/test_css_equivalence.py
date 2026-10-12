"""Compare every CSS rule/declaration and its order using Chrome's own parser."""
from pathlib import Path
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def canonical_rule(rule):
    # Chrome preserves whitespace in shorthands containing var(). Only spacing
    # around comma/slash delimiters and decimal leading zeros is normalized;
    # quoted text stays exact, including literal punctuation and whitespace.
    tokens = r'''("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\s*([,/])\s*|(\()\s*|\s*(\))|(?<![\w-])(-?)\.(\d+)'''

    def replacement(match):
        for group in range(1, 5):
            if match.group(group):
                return match.group(group)
        return f'{match.group(5)}0.{match.group(6)}'

    return re.sub(tokens, replacement, rule)


def run(snapshot):
    assert canonical_rule('content: " .22, / ( ) ";') == 'content: " .22, / ( ) ";'
    assert canonical_rule('--a:rgba(25,25,26,.22)') == canonical_rule('--a:rgba(25, 25, 26, 0.22)')
    assert canonical_rule('padding:1rem') != canonical_rule('padding:2rem')
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
        page = browser.new_page()
        # A detached stylesheet does not load images/fonts or mount application code.
        parse = '''source => {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(source);
            return [...sheet.cssRules].map(rule => rule.cssText);
        }'''
        for path in sorted((ROOT / 'css').glob('*.css')):
            relative = path.relative_to(ROOT)
            before = page.evaluate(parse, (snapshot / relative).read_text(encoding='utf-8'))
            after = page.evaluate(parse, path.read_text(encoding='utf-8'))
            assert list(map(canonical_rule, after)) == list(map(canonical_rule, before)), (
                f'CSS rules, values, or order changed: {relative}')
            print(f'PASS equivalent CSS rules {relative} ({len(after)} rules)', flush=True)
        browser.close()


if __name__ == '__main__':
    run(Path(sys.argv[1]))
