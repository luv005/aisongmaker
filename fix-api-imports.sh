#!/bin/bash
# Fix all relative imports in api directory to include .js extensions

find api/server -type f -name "*.ts" -exec sed -i \
  -e "s|from '\./\([^']*\)'|from './\1.js'|g" \
  -e "s|from '\.\./\([^']*\)'|from '../\1.js'|g" \
  -e "s|from '\.\./\.\./\([^']*\)'|from '../../\1.js'|g" \
  -e "s|\.js\.js|.js|g" \
  {} \;

find api/drizzle -type f -name "*.ts" -exec sed -i \
  -e "s|from '\./\([^']*\)'|from './\1.js'|g" \
  -e "s|from '\.\./\([^']*\)'|from '../\1.js'|g" \
  -e "s|\.js\.js|.js|g" \
  {} \;

echo "Fixed imports in api directory"

