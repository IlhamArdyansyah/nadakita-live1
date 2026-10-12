"""Compare entry-point HTML elements, attributes and meaningful text before/after format."""
from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

class Markup(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.nodes.append(('start', tag, sorted(attrs)))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        self.nodes.append(('end', tag))

    def handle_data(self, data):
        if data.strip():
            self.nodes.append(('text', data.strip()))

    def handle_decl(self, data):
        self.nodes.append(('doctype', data.lower()))

if __name__ == '__main__':
    snapshot = Path(sys.argv[1])
    pages = sorted(ROOT.glob('*.html'))
    for page in pages:
        before = Markup((snapshot / page.name).read_text(encoding='utf-8')).nodes
        after = Markup(page.read_text(encoding='utf-8')).nodes
        assert after == before, page.name
    print(f'PASS {len(pages)} HTML pages: same elements, attributes, text and script order')
