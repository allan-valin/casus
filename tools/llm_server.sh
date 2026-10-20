#!/bin/bash
# usage: tools/llm_server.sh start|stop — EuroLLM-9B-Instruct (Apache-2.0, Q4_K_M GGUF in vendor/llm) behind a llama.cpp
# server on 127.0.0.1:8099 for tools/translate_learn.py --engine eurollm. 28 of its layers on the 6 GB GPU (all of
# them do not fit), four slots; memory-capped in its own scope; the PID is kept in vendor/llm/server.pid.
cd "$(dirname "$0")/.."
B=vendor/llama.cpp/llama-b11760; C=vendor/llama.cpp/cudart-llama-b11760-bin-ubuntu-cuda-12.8-x64
PID=vendor/llm/server.pid
case "$1" in
  start)
    systemd-run --user --scope -q -p MemoryMax=6G -p OOMPolicy=continue --setenv=LD_LIBRARY_PATH=$B:$C \
      $B/llama-server -m vendor/llm/EuroLLM-9B-Instruct-Q4_K_M.gguf -ngl 28 -c 8192 -np 4 --port 8099 > vendor/llm/server.log 2>&1 &
    echo $! > $PID
    for _ in $(seq 120); do curl -sf http://127.0.0.1:8099/health > /dev/null && { echo "EuroLLM server up"; exit 0; }; sleep 2; done
    echo "EuroLLM server did not come up (vendor/llm/server.log)" >&2; exit 1 ;;
  stop)
    [ -f $PID ] && kill "$(cat $PID)" 2>/dev/null; rm -f $PID ;;
esac
