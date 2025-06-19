const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment to local Hardhat network...");
  
  // Get the signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy a mock ZK verifier first (for testing)
  const MockZKVerifier = await ethers.getContractFactory("ZKIdentityVerifier");
  console.log("Deploying ZKIdentityVerifier...");
  const zkVerifier = await MockZKVerifier.deploy();
  await zkVerifier.deployed();
  console.log("ZKIdentityVerifier deployed to:", zkVerifier.address);

  // Deploy the main eSIM contract
  const SimCard = await ethers.getContractFactory("SimCard");
  console.log("Deploying SimCard contract...");
  const simCard = await SimCard.deploy();
  await simCard.deployed();
  console.log("SimCard deployed to:", simCard.address);

  console.log("\n=== Deployment Summary ===");
  console.log("ZKIdentityVerifier:", zkVerifier.address);
  console.log("SimCard (Main Contract):", simCard.address);
  console.log("Network: localhost (Hardhat)");
  console.log("Chain ID: 1337");
  
  console.log("\n=== Ready to use! ===");
  console.log("Update your .env file with:");
  console.log(`EXPO_PUBLIC_CONTRACT_ADDRESS=${simCard.address}`);
  console.log(`EXPO_PUBLIC_ZK_VERIFIER_ADDRESS=${zkVerifier.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
