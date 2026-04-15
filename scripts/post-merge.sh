#!/bin/bash
set -e

echo "Running post-merge setup..."

# Install npm dependencies
npm install --yes

echo "Post-merge setup complete."
