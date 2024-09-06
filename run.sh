#!/bin/sh

# Check if INSPECTOR_ENABLED environment variable is set to 'true'
if [ "$INSPECTOR_ENABLED" = "true" ]; then
    exec deno run --inspect --allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run --allow-ffi ./serve.ts
else
    exec deno run --allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run --allow-ffi ./serve.ts
fi
