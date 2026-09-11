#!/usr/bin/env python3
"""Recount README figures from data/requirements.json and report drift.

Never rewrites the README - a hand-written sentence can say things a plain
number can't, so this only checks and reports; a human decides the edit.
"""
import io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
README = os.path.join(ROOT, "README.md")
findings = []


def check(label, computed, pattern):
    text = open(README, encoding="utf-8").read()
    m = re.search(pattern, text)
    if not m:
        findings.append((label, "not found in README", str(computed)))
        return
    claimed = int(m.group(1).replace(",", ""))
    if claimed != computed:
        findings.append((label, str(claimed), str(computed)))


def report():
    lines = []
    if not findings:
        lines.append("No drift. Every figure in the README matches the data.")
    else:
        lines.append("**%d figure(s) drifted from the data:**" % len(findings))
        lines.append("")
        lines.append("| Figure | README says | Data says |")
        lines.append("|---|---|---|")
        for label, claimed, computed in findings:
            lines.append("| %s | %s | %s |" % (label, claimed, computed))
        lines += ["", "Nothing has been changed. Each row is a decision for you."]
    text = "\n".join(lines) + "\n"
    io.open("findings.md", "w", encoding="utf-8", newline="\n").write(text)
    print(text)


def main():
    d = json.load(open(os.path.join(ROOT, "data", "requirements.json"), encoding="utf-8"))
    check("requirement count", len(d["requirements"]), r"\b(\d+)\b requirements drawn from")
    report()


if __name__ == "__main__":
    main()
