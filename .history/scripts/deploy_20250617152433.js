const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Deploy the main ESIM contract
  const ESIM = await hre.ethers.getContractFactory("ESIM");
  const esim = await ESIM.deploy();
  await esim.waitForDeployment();
  const esimAddress = await esim.getAddress();
  console.log("ESIM contract deployed to:", esimAddress);

  // Deploy CrossNetworkESIM contract
  const CrossNetworkESIM = await hre.ethers.getContractFactory("CrossNetworkESIM");
  const crossNetworkESIM = await CrossNetworkESIM.deploy();
  await crossNetworkESIM.waitForDeployment();
  const crossNetworkAddress = await crossNetworkESIM.getAddress();
  console.log("CrossNetworkESIM contract deployed to:", crossNetworkAddress);

  // Deploy AccountAbstraction contract
  // For now, we'll use placeholder addresses for entryPoint and paymaster
  const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // ERC-4337 EntryPoint v0.6
  const paymasterAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
  
  const AccountAbstraction = await hre.ethers.getContractFactory("AccountAbstraction");
  const accountAbstraction = await AccountAbstraction.deploy(
    entryPointAddress,
    crossNetworkAddress,
    paymasterAddress
  );
  await accountAbstraction.waitForDeployment();
  const aaAddress = await accountAbstraction.getAddress();
  console.log("AccountAbstraction contract deployed to:", aaAddress);

  // Initialize network bridges for major operators
  console.log("Initializing network bridges...");
  
  const networkOperators = [
    { name: "Verizon", mcc: "310", mnc: "004" },
    { name: "AT&T", mcc: "310", mnc: "030" },
    { name: "Vodafone", mcc: "234", mnc: "015" },
    { name: "T-Mobile", mcc: "310", mnc: "160" },
    { name: "Orange", mcc: "208", mnc: "01" }
  ];

  for (const operator of networkOperators) {
    try {
      const tx = await crossNetworkESIM.addNetworkBridge(
        operator.name,
        `${operator.mcc}-${operator.mnc}`,
        true // enabled
      );
      await tx.wait();
      console.log(`Network bridge added for ${operator.name}`);
    } catch (error) {
      console.log(`Failed to add network bridge for ${operator.name}:`, error.message);
    }
  }

  console.log("\n=== Deployment Summary ===");
  console.log("ESIM Contract:", esimAddress);
  console.log("CrossNetworkESIM Contract:", crossNetworkAddress);
  console.log("AccountAbstraction Contract:", aaAddress);
  console.log("\nNetwork bridges initialized for 5 major operators");
  
  // Save contract addresses to a config file
  const fs = require('fs');
  const contractAddresses = {
    ESIM: esimAddress,
    CrossNetworkESIM: crossNetworkAddress,
    AccountAbstraction: aaAddress,
    entryPoint: entryPointAddress,
    paymaster: paymasterAddress,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    './contract-addresses.json',
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log("\nContract addresses saved to contract-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });