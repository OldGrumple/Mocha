#!/bin/bash

# Create necessary directories if they don't exist
mkdir -p src/{api,config,controllers,models,routes,services,utils,proto,generated}

# Move files to their new locations
mv controllers/* src/controllers/ 2>/dev/null || true
mv models/* src/models/ 2>/dev/null || true
mv routes/* src/routes/ 2>/dev/null || true
mv services/* src/services/ 2>/dev/null || true
mv proto/* src/proto/ 2>/dev/null || true
mv generated/* src/generated/ 2>/dev/null || true
mv config.js src/config/ 2>/dev/null || true

# Clean up empty directories
rmdir controllers models routes services proto generated 2>/dev/null || true

echo "Files have been reorganized into the src directory structure." 