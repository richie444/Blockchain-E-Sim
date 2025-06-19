const hre = require("hardhat");

async function checkWallet() {
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Current balance:", hre.ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.log("\n❌ No funds available!");
      console.log("You need Sepolia ETH to deploy contracts.");
      console.log("\n🚰 Get Sepolia ETH from these faucets:");
      console.log("1. https://sepoliafaucet.com/");
      console.log("2. https://www.alchemy.com/faucets/ethereum-sepolia");
      console.log("3. https://sepolia-faucet.pk910.de/");
      console.log("4. https://faucet.quicknode.com/ethereum/sepolia");
      console.log("\nSend Sepolia ETH to:", deployer.address);
    } else {
      console.log("✅ Wallet has funds, ready for deployment!");
    }
  } catch (error) {
    console.error("Error checking wallet:", error.message);
  }
}

checkWallet().catch(console.error);
