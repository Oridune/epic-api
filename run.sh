#!/bin/sh

# Check if INSPECTOR_ENABLED environment variable is set to 'true'
if [ "$INSPECTOR_ENABLED" = "true" ]; then
    echo "Running deno with inspector enabled."
    exec deno run --inspect --allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run --allow-ffi ./serve.ts
else
    echo "Running deno with inspector disabled."
    exec deno run --allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run --allow-ffi ./serve.ts
fi
