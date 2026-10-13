#!/bin/sh
# Preview locally: ./serve.sh  ->  http://localhost:8099
cd "$(dirname "$0")" && python3 -m http.server 8099
