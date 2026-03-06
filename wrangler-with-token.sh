#!/bin/bash
# Script wrapper per wrangler che legge il token da .dev.vars

TOKEN=$(grep CLOUDFLARE_API_TOKEN .dev.vars | cut -d= -f2)
export CLOUDFLARE_API_TOKEN=$TOKEN

wrangler "$@"
