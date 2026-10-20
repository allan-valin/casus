#!/usr/bin/env bash
# run a script with the GPU venv (desembarque/.venv-ocr: torch, sentencepiece, ctranslate2) and CUDA 12 cuBLAS
VENV=/home/allan/projects/desembarque/.venv-ocr
export LD_LIBRARY_PATH="$($VENV/bin/python -c 'import nvidia.cublas,os;print(os.path.join(list(nvidia.cublas.__path__)[0],"lib"))')${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$VENV/bin/python" "$@"
