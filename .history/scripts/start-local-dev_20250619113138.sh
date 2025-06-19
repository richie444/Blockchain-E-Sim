#!/bin/bash

echo "🚀 Setting up Hardhat Local Development Environment"
echo "=============================================="

# Check if Hardhat is installed
if ! command -v npx hardhat &> /dev/null; then
    echo "❌ Hardhat not found. Installing..."
    npm install --save-dev hardhat
fi

# Kill any existing Hardhat node
echo "🔄 Stopping any existing Hardhat node..."
pkill -f "hardhat node" || true

# Start Hardhat node in background
echo "🌐 Starting Hardhat local network..."
npx hardhat node &
HARDHAT_PID=$!

# Wait for the node to start
echo "⏳ Waiting for Hardhat node to start..."
sleep 5

# Check if node is running
if ps -p $HARDHAT_PID > /dev/null; then
    echo "✅ Hardhat node is running (PID: $HARDHAT_PID)"
    
    # Deploy contracts
    echo "📋 Deploying contracts to local network..."
    npx hardhat run scripts/deploy-local.js --network localhost
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Setup Complete!"
        echo "==================="
        echo "✅ Hardhat node is running on http://127.0.0.1:8545"
        echo "✅ Contracts deployed successfully"
        echo "✅ Environment variables updated"
        echo ""
        echo "📱 You can now start your React Native app with:"
        echo "   npx expo start"
        echo ""
        echo "🔧 Hardhat node accounts (each has 10,000 ETH):"
        npx hardhat accounts --network localhost
        echo ""
        echo "⚠️  To stop the Hardhat node later, run:"
        echo "   kill $HARDHAT_PID"
        echo "   or just close this terminal"
        
        # Save PID for later reference
        echo $HARDHAT_PID > .hardhat-node.pid
        
    else
        echo "❌ Contract deployment failed"
        kill $HARDHAT_PID
        exit 1
    fi
else
    echo "❌ Failed to start Hardhat node"
    exit 1
fi
