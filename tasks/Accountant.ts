import { ethers } from "ethers";
import { task, types } from "hardhat/config";
import { Provider, Wallet } from "zksync-web3";

function perYearToPerSecondRate(annualRate: number) {
  return {
    numerator: annualRate * 100,
    denominator: 60 * 60 * 24 * 365 * 100,
  };
}

task("deploy:accountant", "Deploy the Accountant").setAction(async (args, hre) => {
  const Accountant = await hre.ethers.getContractFactory("Accountant");
  const accountant = await Accountant.deploy();
  await accountant.deployed();

  console.log("Accountant deployed to:", accountant.address);

  return accountant.address;
});

task("deploy-zksync:accountant", "Deploy the Accountant").setAction(async ({deployer}, hre) => {
  const Accountant = await deployer.loadArtifact("Accountant");
  const accountant = await deployer.deploy(Accountant, []);

  console.log("Accountant deployed to:", accountant.address);

  return accountant;
});

task("config:accountant")
  .addOptionalParam("contract", "Accountant contract", undefined, types.json)
  .addOptionalParam("contractAddress", "Accountant contract address", undefined, types.string)
  .addOptionalParam(
    "annualFeeRate",
    "Annual rate for contribution fee. 10% -> 0.1",
    undefined,
    types.float
  )
  .addOptionalParam(
    "validator",
    "Where to find if a license's account is still valid"
  )
  .setAction(async ({ contract, contractAddress, annualFeeRate, validator }: {contract?: ethers.Contract, contractAddress?: string, annualFeeRate?: number, validator?: string}, hre) => {
    if (!annualFeeRate && !validator) {
      console.log("Nothing to configure. See options");
      return;
    }

    const accountant = contractAddress ? await hre.ethers.getContractAt("Accountant", contractAddress) : contract!;

    if (annualFeeRate) {
      const { numerator, denominator } = perYearToPerSecondRate(annualFeeRate);
      const res = await accountant.setPerSecondFee(numerator, denominator);
      await res.wait();
      console.log("Successfully set Accountant fee.");
    }

    if (validator) {
      const res = await accountant.setValidator(validator);
      await res.wait();
      console.log("Successfully set Accountant validator.");
    }
  });

task("roles:accountant", "Set default roles for Accountant")
  .addOptionalParam("accountant", "Accountant contract", undefined, types.json)
  .addOptionalParam("accountantAddress", "Address of Accountant", undefined, types.string)
  .addParam("collectorAddress", "Address of ETHExpirationCollector")
  .setAction(async ({ accountant, accountantAddress, collectorAddress }: {accountant?: ethers.Contract, accountantAddress?: string, collectorAddress: string}, hre) => {
    const accountantContract = accountantAddress ? await hre.ethers.getContractAt(
      "Accountant",
      accountantAddress
    ) : accountant!;

    // Accountant roles
    const res1 = await accountantContract.grantRole(
      await accountantContract.MODIFY_CONTRIBUTION_ROLE(),
      collectorAddress
    );
    await res1.wait();

    console.log(
      "Successfully granted Accountant.MODIFY_CONTRIBUTION_ROLE to ETHExpirationCollector"
    );
  });
