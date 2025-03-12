const ethers = require("ethers");
const abi = require("./contract.json");
const { Gateway, Wallets } = require("fabric-network");
const path = require("path");
const fs = require("fs");
const grpc = require("@grpc/grpc-js");
const {
  connect,
  Contract,
  Identity,
  Signer,
  signers,
} = require("@hyperledger/fabric-gateway");
const crypto = require("crypto");
const { resourceUsage } = require("process");
const utf8Decoder = new TextDecoder();

async function main() {
  const contractAddress = abi.address;

  const provider = new ethers.JsonRpcProvider("http://localhost:10002");
  const evmContract = new ethers.Contract(contractAddress, abi.ABI, provider);

  const orgName="Org1";
  const ccpPath = path.resolve(
    __dirname,
    "connection-profiles",
    `connection-${orgName.toLowerCase()}.json`
  );
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
  // Create a new file system-based wallet for managing identities.
  const walletPath = path.join(process.cwd(), "..", `wallets/${orgName}`);
  let wallet = await Wallets.newFileSystemWallet(walletPath);

  console.log("Executing Lock functionality");
  let identity, amount, user;
  // Print the first Transfer event
  // while (true) {
  const block = await provider.getBlockNumber();
  console.log(block);
  const mintEvents = await evmContract.queryFilter("Locked", block - 1000, block);
  console.log(mintEvents);
  for (let i = 0; i < mintEvents.length; i++) {
    if (mintEvents[i] != undefined) {
      console.log(mintEvents[i]);
      // console.log(mintEvents[i].args[0]);
      // console.log(mintEvents[i].args[1]);
      user =mintEvents[i].args[0];
      identity = await wallet.get(mintEvents[i].args[0]);
      amount = mintEvents[i].args[1];
      if (!identity) {
        console.log(
          `An identity for the user ${userName} does not exist in the wallet. Enroll the user before retrying.`
        );
        return;
      }
      client = await getClient(ccp, orgName.toLowerCase());
      const gateway = connect({
        client,
        identity: await getIdentity(identity),
        signer: getSigner(identity),
      });

      const network = gateway.getNetwork("mychannel");

      // Get the contract from the network.
      let hfContract = network.getContract("token");
      await hfContract.submitTransaction("Mint", user, amount.toString());
      let result = await hfContract.submitTransaction("BalanceOf",user);
      result = utf8Decoder.decode(result);
      console.log("Balance of user in token contract is: "+result);
    }
  }
}
// }

const getClient = async (ccp, orgName) => {
  const org = orgName.toLowerCase();
  const tlsCredentials = grpc.credentials.createSsl(
    Buffer.from(ccp.peers[`peer0.${org}.example.com`].tlsCACerts.pem)
  );

  return new grpc.Client(
    ccp.peers[`peer0.${org}.example.com`].url,
    tlsCredentials,
    {
      "grpc.ssl_target_name_override":
        ccp.peers[`peer0.${org}.example.com`].grpcOptions
          .ssl_target_name_override,
    }
  );
};

const getIdentity = async (identity) => {
  return {
    mspId: identity.mspId,
    credentials: Buffer.from(identity.credentials.certificate),
  };
};

const getSigner = (identity) => {
  const privateKeyPem = identity.credentials.privateKey;
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return signers.newPrivateKeySigner(privateKey);
};
main();
