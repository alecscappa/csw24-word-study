"""Export the Zyzzyva CSW24 lexicon to words.js for the study site.

Usage: python3 build.py [path/to/CSW24.db]
"""
import json, sqlite3, sys, os

db = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Zyzzyva/lexicons/CSW24.db")
con = sqlite3.connect(db)
rows = con.execute(
    "select word, coalesce(definition,''), coalesce(front_hooks,''), coalesce(back_hooks,''),"
    " coalesce(lexicon_symbols,''), probability_order2, playability_order, point_value"
    " from words order by word"
)
lines = []
for r in rows:
    lines.append("\t".join(str(x).replace("\t", " ").replace("\n", " ") for x in r))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "words.js")
with open(out, "w") as f:
    f.write("window.CSW_TSV=")
    f.write(json.dumps("\n".join(lines)))
    f.write(";\n")
print(f"wrote {len(lines)} words to {out} ({os.path.getsize(out)//1024//1024} MB)")
