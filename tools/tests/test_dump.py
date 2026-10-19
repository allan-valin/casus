import gzip
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.dump import open_dump  # noqa: E402


def test_a_dump_reads_the_same_plain_or_gzipped(tmp_path):
    plain = tmp_path / "kaikki.org-dictionary-X.jsonl"
    with gzip.open(tmp_path / "kaikki.org-dictionary-X.jsonl.gz", "wt", encoding="utf-8") as f:
        f.write('{"word": "a"}\n')
    with open_dump(plain) as f:
        assert f.read() == '{"word": "a"}\n'
