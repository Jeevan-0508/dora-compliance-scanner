#!/usr/bin/env python3
"""Validate the DORA requirement model.

Checks that every requirement is well-formed and that data/requirements.json
and docs/requirements.json have not drifted apart. Never publish a site whose
data has drifted from data/.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "requirements.json"
DOCS = ROOT / "docs" / "requirements.json"

REQUIRED_KEYS = {"id", "chapter", "article", "article_title", "requirement", "evidence_examples"}
ARTICLE_RE_PREFIX = "Art. "


def check(model):
    errors = []
    meta = model.get("meta") or {}
    chapters = {c["id"] for c in meta.get("chapters", [])}
    if not chapters:
        errors.append("meta.chapters is missing or empty")

    reqs = model.get("requirements")
    if not isinstance(reqs, list) or not reqs:
        errors.append("requirements is missing or empty")
        return errors

    seen_ids = set()
    seen_articles = set()
    for r in reqs:
        rid = r.get("id", "<no id>")
        missing = REQUIRED_KEYS - set(r)
        if missing:
            errors.append(f"{rid}: missing {', '.join(sorted(missing))}")
            continue
        if rid in seen_ids:
            errors.append(f"{rid}: duplicate requirement id")
        seen_ids.add(rid)

        article = r["article"]
        if article in seen_articles:
            errors.append(f"{rid}: article {article} already used by another requirement")
        seen_articles.add(article)
        if not article.startswith(ARTICLE_RE_PREFIX):
            errors.append(f"{rid}: article {article!r} does not look like 'Art. N'")

        if r["chapter"] not in chapters:
            errors.append(f"{rid}: chapter {r['chapter']!r} is not declared in meta.chapters")
        if not isinstance(r.get("evidence_examples"), list) or not r["evidence_examples"]:
            errors.append(f"{rid}: evidence_examples is missing or empty")
        if not r.get("requirement", "").strip():
            errors.append(f"{rid}: requirement text is empty")

    count = meta.get("requirement_count")
    if count != len(reqs):
        errors.append(f"meta.requirement_count is {count!r} but there are {len(reqs)} requirements")

    return errors


def main():
    model = json.loads(DATA.read_text(encoding="utf-8"))
    errors = check(model)
    if errors:
        print(f"REFUSED: requirement model failed {len(errors)} check(s)")
        for e in errors[:30]:
            print("  -", e)
        return 1

    docs_model = json.loads(DOCS.read_text(encoding="utf-8"))
    if model != docs_model:
        print("REFUSED: docs/requirements.json is out of sync with data/requirements.json")
        return 1

    m = model["meta"]
    print(f"ok: {m['framework']} v{m['version']} - {len(model['requirements'])} requirements "
          f"across {len(m['chapters'])} chapters")
    return 0


if __name__ == "__main__":
    sys.exit(main())
