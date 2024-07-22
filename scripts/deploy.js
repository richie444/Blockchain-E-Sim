const hre = require("hardhat");

async function main() {
  const ESIM = await hre.ethers.getContractFactory("ESIM");
  const esim = await ESIM.deploy();

  await esim.deployed();

  console.log("ESIM contract deployed to:", esim.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });