#!/bin/bash

# E2E Test Runner Script for Troodie
# Usage: ./run-tests.sh [platform] [suite]

set -e

PLATFORM=${1:-"ios"}
SUITE=${2:-"smoke"}
MAESTRO_PATH="$HOME/.maestro/bin/maestro"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting E2E Tests${NC}"
echo "Platform: $PLATFORM"
echo "Suite: $SUITE"
echo "------------------------"

# Check if Maestro is installed
if ! command -v maestro &> /dev/null && [ ! -f "$MAESTRO_PATH" ]; then
    echo -e "${YELLOW}⚠️  Maestro not found. Installing...${NC}"
    curl -Ls "https://get.maestro.mobile.dev" | bash
    export PATH="$HOME/.maestro/bin:$PATH"
fi

# Function to run tests
run_tests() {
    local platform=$1
    local suite=$2
    
    echo -e "${GREEN}📱 Running $suite tests on $platform${NC}"
    
    case $suite in
        "smoke")
            maestro test e2e/flows --platform $platform --include-tags smoke
            ;;
        "full")
            maestro test e2e/flows --platform $platform
            ;;
        "auth")
            maestro test e2e/flows/auth --platform $platform
            ;;
        "discovery")
            maestro test e2e/flows/discovery --platform $platform
            ;;
        "social")
            maestro test e2e/flows/social --platform $platform
            ;;
        "content")
            maestro test e2e/flows/content --platform $platform
            ;;
        "profile")
            maestro test e2e/flows/profile --platform $platform
            ;;
        *)
            echo -e "${RED}❌ Unknown suite: $suite${NC}"
            exit 1
            ;;
    esac
}

# Prepare test environment
prepare_environment() {
    echo -e "${YELLOW}🔧 Preparing test environment...${NC}"
    
    # Seed test data
    if [ -f "e2e/helpers/test-data.js" ]; then
        echo "Seeding test data..."
        node e2e/helpers/test-data.js seed
    fi
    
    # Clear previous screenshots
    rm -rf e2e/screenshots/*
    mkdir -p e2e/screenshots
    
    # Clear previous reports
    rm -rf e2e/reports/*
    mkdir -p e2e/reports
}

# Cleanup after tests
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Clean test data
    if [ -f "e2e/helpers/test-data.js" ]; then
        node e2e/helpers/test-data.js cleanup
    fi
}

# Start simulator/emulator if needed
start_device() {
    local platform=$1
    
    if [ "$platform" = "ios" ]; then
        echo -e "${YELLOW}📱 Starting iOS Simulator...${NC}"
        # Check if simulator is running
        if ! xcrun simctl list | grep -q "Booted"; then
            xcrun simctl boot "iPhone 14" || true
        fi
    elif [ "$platform" = "android" ]; then
        echo -e "${YELLOW}📱 Starting Android Emulator...${NC}"
        # Check if emulator is running
        if ! adb devices | grep -q "emulator"; then
            emulator -avd test_device -no-audio -no-boot-anim &
            adb wait-for-device
        fi
    fi
}

# Main execution
main() {
    # Trap to ensure cleanup runs
    trap cleanup EXIT
    
    # Prepare environment
    prepare_environment
    
    # Start device
    start_device $PLATFORM
    
    # Run tests
    run_tests $PLATFORM $SUITE
    
    # Check results
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Tests passed!${NC}"
    else
        echo -e "${RED}❌ Tests failed!${NC}"
        echo "Screenshots saved in e2e/screenshots/"
        exit 1
    fi
}

# Run main function
main