#!/bin/bash
# usage: tools/mt.sh <ui> <code>… — machine-translate imported Learn pages (GPU venv), memory-capped
V=/home/allan/projects/desembarque/.venv-ocr
LIB=$(ls -d $V/lib/python3*/site-packages/nvidia/cublas/lib | head -1)
cd "$(dirname "$0")/.."
ui=$1; shift
LD_LIBRARY_PATH=$LIB:$LD_LIBRARY_PATH systemd-run --user --scope -p MemoryMax=4G -p OOMPolicy=continue -q --setenv=LD_LIBRARY_PATH=$LIB \
  $V/bin/python tools/translate_learn.py "$@" --ui $ui
