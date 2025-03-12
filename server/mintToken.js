const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const { connect, Contract, Identity, Signer, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const utf8Decoder = new TextDecoder();

async function mintTokens(userName, amount, orgName) {
    try {
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, "..", 'connection-profiles', `connection-${orgName.toLowerCase()}.json`);
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        // Create a new file system-based wallet for managing identities.
        const walletPath = path.join(process.cwd(), '..', `wallets/${orgName}`);
        let wallet = await Wallets.newFileSystemWallet(walletPath);
        const identity = await wallet.get(userName + '-' + orgName);
        if (!identity) {
            console.log(`An identity for the user ${userName} does not exist in the wallet. Enroll the user before retrying.`);
            return;
        }

        client =  await  getClient(ccp, orgName.toLowerCase());
        let newIdentity = await getIdentity(identity);
        let newSigner = getSigner(identity);
        const gateway = connect({
          client,
          identity: await getIdentity(identity),
          signer: getSigner(identity)
      });
        // Get the network (channel) our contract is deployed to.
        let network = await gateway.getNetwork('mychannel');
        // Get the contract from the network.
        let contract = await network.getContract('token');
        let user = userName+"-"+orgName;
        let result = await contract.submitTransaction('Mint', user, amount.toString());
        console.log(`Successfully minted ${amount} tokens for user: ${userName}`);
        result = { txid: utf8Decoder.decode(result) };
        console.log(result);
        return result;
    } catch (error) {
        console.error(`Failed to mint tokens: ${error}`);
        return 0;
    }
}

const getClient = async (ccp, orgName) => {

    const org = orgName.toLowerCase();
    console.log(`peer0.${orgName}.example.com`);

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

  module.exports = { mintTokens };
