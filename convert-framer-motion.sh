#!/bin/bash
# Script to convert Framer Motion imports from 'motion' to 'm' (LazyMotion)

# Find all files that import from framer-motion
files=$(grep -rl "from ['\"]framer-motion['\"]" client/src/components client/src/pages 2>/dev/null)

for file in $files; do
  echo "Converting: $file"
  
  # Replace 'motion' import with 'm' import
  sed -i "s/import { motion } from ['\"]framer-motion['\"]/import { m } from \"@\/lib\/motion\/MotionProvider\"/g" "$file"
  
  # Replace motion, AnimatePresence with m, AnimatePresence
  sed -i "s/import { motion, AnimatePresence } from ['\"]framer-motion['\"]/import { m, AnimatePresence } from \"@\/lib\/motion\/MotionProvider\"/g" "$file"
  
  # Replace AnimatePresence, motion with m, AnimatePresence (reversed order)
  sed -i "s/import { AnimatePresence, motion } from ['\"]framer-motion['\"]/import { m, AnimatePresence } from \"@\/lib\/motion\/MotionProvider\"/g" "$file"
  
  # Replace just AnimatePresence
  sed -i "s/import { AnimatePresence } from ['\"]framer-motion['\"]/import { AnimatePresence } from \"@\/lib\/motion\/MotionProvider\"/g" "$file"
  
  # Replace all motion. with m.
  sed -i 's/\bmotion\./m\./g' "$file"
done

echo "Conversion complete! Converted $(echo "$files" | wc -l) files"
