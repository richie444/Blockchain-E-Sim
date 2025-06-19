const { ethers } = require("hardhat");

async function main() {
  console.log("Starting minimal deployment to local Hardhat network...");
  
  // Get the signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  try {
    // Try to deploy AccountAbstraction contract (simple one)
    const AccountAbstraction = await ethers.getContractFactory("AccountAbstraction");
    console.log("Deploying AccountAbstraction...");
    const accountAbstraction = await AccountAbstraction.deploy();
    await accountAbstraction.deployed();
    console.log("AccountAbstraction deployed to:", accountAbstraction.address);

    console.log("\n=== Deployment Summary ===");
    console.log("AccountAbstraction:", accountAbstraction.address);
    console.log("Network: localhost (Hardhat)");
    console.log("Chain ID: 1337");
    
    console.log("\n=== Ready to use! ===");
    console.log("Update your .env file with:");
    console.log(`EXPO_PUBLIC_CONTRACT_ADDRESS=${accountAbstraction.address}`);
    
  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
