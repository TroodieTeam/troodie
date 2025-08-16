#!/bin/bash

# Kill all processes on common localhost ports

echo "Killing processes on localhost ports..."

# Kill process on port 3000 (common for React/Node apps)
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 3000" || echo "- No process on port 3000"

# Kill process on port 8080 (common for various servers)
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 8080" || echo "- No process on port 8080"

# Kill process on port 8081 (Metro bundler for React Native)
lsof -ti:8081 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 8081" || echo "- No process on port 8081"

# Kill process on port 19000 (Expo)
lsof -ti:19000 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 19000" || echo "- No process on port 19000"

# Kill process on port 19001 (Expo)
lsof -ti:19001 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 19001" || echo "- No process on port 19001"

# Kill process on port 19002 (Expo)
lsof -ti:19002 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 19002" || echo "- No process on port 19002"

# Kill process on port 5000 (common for APIs)
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 5000" || echo "- No process on port 5000"

# Kill process on port 4000 (common for APIs)
lsof -ti:4000 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 4000" || echo "- No process on port 4000"

echo ""
echo "All localhost servers killed!"
echo ""
echo "To check what's still running on any port:"
echo "lsof -i :PORT_NUMBER"
echo ""
echo "To kill a specific port:"
echo "lsof -ti:PORT_NUMBER | xargs kill -9"