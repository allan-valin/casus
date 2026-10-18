"""Paradigm tables: every form of a lemma, from the built form index (Allan, 2026-10-18)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_paradigms import invert, bucket_of  # noqa: E402


def test_invert_groups_each_lemmas_forms_with_their_codes_in_index_order():
    shards = {"ro": {"rosa": [[33803, "nnsf", "nbsf", "nvsf"]], "rosae": [[33803, "ngsf", "ndsf", "nnpf"]]},
              "ur": {"urbs": [[100, "nnsf"]], "rosam": [[33803, "nasf"]]}}
    p = invert(shards)
    assert p[33803] == [["rosa", "nnsf", "nbsf", "nvsf"], ["rosae", "ngsf", "ndsf", "nnpf"], ["rosam", "nasf"]]
    assert p[100] == [["urbs", "nnsf"]]


def test_bucket_is_stable_and_bounded():
    assert bucket_of(33803, 256) == 33803 % 256
    assert 0 <= bucket_of(10_000_008, 256) < 256


def test_front_coding_round_trips():
    from build_paradigms import front_code, front_decode
    rows = [["rosa", "nnsf"], ["rosae", "ngsf", "ndsf"], ["rosam", "nasf"], ["urbs", "x"]]
    coded = front_code(rows)
    assert coded == [["rosa", "nnsf"], [4, "e", "ngsf", "ndsf"], [4, "m", "nasf"], [0, "urbs", "x"]]
    assert front_decode(coded) == rows
