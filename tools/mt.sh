#!/bin/bash
# usage: tools/mt.sh <ui> <code>… [--redo] — machine-translate imported Learn pages on the GPU (desembarque's GPU venv),
# memory-capped; a crash (the GPU sometimes reports "invalid device ordinal" on long runs) restarts it, up to 5 times:
# finished sentences are in vendor/mt/cache.<ui>.json, so it resumes. Set MT_DEBUG=1 to log batch sizes.
V=${DESEMBARQUE_VENV:-$(cd "$(dirname "$0")/../.." && pwd)/desembarque/.venv-ocr}  # sibling checkout by default
LIB=$(ls -d $V/lib/python3*/site-packages/nvidia/cublas/lib | head -1)
cd "$(dirname "$0")/.."
ui=$1; shift
for attempt in 1 2 3 4 5; do
  systemd-run --user --scope -p MemoryMax=4G -p OOMPolicy=continue -q --setenv=LD_LIBRARY_PATH=$LIB --setenv=MT_DEBUG=${MT_DEBUG:-} \
    $V/bin/python tools/translate_learn.py "$@" --ui $ui && exit 0
  echo "translate_learn failed (attempt $attempt), resuming from the cache" >&2
done
exit 1
