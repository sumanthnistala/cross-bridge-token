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

    const pk ="5d2cf034ab8f13440d34122d81a5d2b4a86c1300e4b3150d175b42b24a7ace2f";
    const provider = new ethers.JsonRpcProvider("http://localhost:10002");
    // const signer =await provider.getSigner();
    // const add = await signers.getAddress("0xC0679b9DCBD4aCB89DD5e11FBfeB6048c2edD15f");
    const evmWallet = new ethers.Wallet(pk, provider);
    // const signer = await provider.getSigner();
    const address = evmWallet.address;
    //console.log(address);
    const evmContract = new ethers.Contract(abi.address, abi.ABI, provider);
    const orgName="Org1";
    const ccpPathOrg = path.resolve(__dirname, "connection-profiles",'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPathOrg, 'utf8'));
    const walletPath = path.join(process.cwd(), '..', `wallets/${orgName}`);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get('admin-' + orgName);
    client =  await  getClient(ccp, orgName.toLowerCase());
    const gateway = connect({
      client,
      identity: await getIdentity(identity),
      signer: getSigner(identity)
  });

    const network = await gateway.getNetwork('mychannel');

    // // Get the contract from the network.
    let hfContract = await network.getContract('token');

    const events = await network.getChaincodeEvents('token');
    try {
    for await (const event of events) {
          console.log(event);
          let result =utf8Decoder.decode(event.payload);
          console.log(result);
          let s = result.toString().split(" ");
          console.log(s);
          let user = s[5];
          let amount = s[1];
          // if(event.eventName === "Burn")
          // {
          //   let result = await evmContract.connect(signer).mint(evmWallet.address, amount);
          //   console.log(result);
          // }
       }
     } finally {
         events.close();
     }
}
const getClient = async (ccp, orgName) => {

    const org = orgName.toLowerCase();
    const tlsCredentials = grpc.credentials.createSsl(Buffer.from(ccp.peers[`peer0.${org}.example.com`].tlsCACerts.pem));

    return new grpc.Client(ccp.peers[`peer0.${org}.example.com`].url, tlsCredentials, {
      'grpc.ssl_target_name_override': ccp.peers[`peer0.${org}.example.com`].grpcOptions.ssl_target_name_override,
    });
  };

  const getIdentity = async (identity) => {
    return { mspId: identity.mspId, credentials: Buffer.from(identity.credentials.certificate) };
  };

  const getSigner = (identity) => {
    const privateKeyPem = identity.credentials.privateKey;
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  };

main();
