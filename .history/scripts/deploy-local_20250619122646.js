const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment to local Hardhat network...");
  
  // Get the signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy a mock ZK verifier first (for testing)
  const MockZKVerifier = await ethers.getContractFactory("ZKIdentityVerifier");
  console.log("Deploying ZKIdentityVerifier...");
  const zkVerifier = await MockZKVerifier.deploy();
  await zkVerifier.waitForDeployment();
  const zkVerifierAddress = await zkVerifier.getAddress();
  console.log("ZKIdentityVerifier deployed to:", zkVerifierAddress);

  // Deploy the main Account Abstraction contract
  const AccountAbstraction = await ethers.getContractFactory("AccountAbstraction");
  console.log("Deploying AccountAbstraction contract...");
  const accountAbstraction = await AccountAbstraction.deploy();
  await accountAbstraction.waitForDeployment();
  const accountAbstractionAddress = await accountAbstraction.getAddress();
  console.log("AccountAbstraction deployed to:", accountAbstractionAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("ZKIdentityVerifier:", zkVerifierAddress);
  console.log("SimCard (Main Contract):", simCardAddress);
  console.log("Network: localhost (Hardhat)");
  console.log("Chain ID: 1337");
  
  console.log("\n=== Ready to use! ===");
  console.log("Update your .env file with:");
  console.log(`EXPO_PUBLIC_CONTRACT_ADDRESS=${simCardAddress}`);
  console.log(`EXPO_PUBLIC_ZK_VERIFIER_ADDRESS=${zkVerifierAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
