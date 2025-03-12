const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const { connect, Contract, Identity, Signer, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const utf8Decoder = new TextDecoder();

async function main() {
    try {
        const orgName="Org1";
        const userName="user";
        const product ="P007";
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, 'connection-profiles', `connection-${orgName.toLowerCase()}.json`);
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
0
        // Get the network (channel) our contract is deployed to.
        let network = await gateway.getNetwork('mychannel');
        // Get the contract from the network.
        let contract = await network.getContract('token');

        await contract.submitTransaction('initLedger');
        let result =await contract.submitTransaction('ProductExists', product);
        result =utf8Decoder.decode(result);
          
        if(result == "false")
        {
            console.log('Create Product');
            let productResult = await contract.submitTransaction('createProduct', product, 'manufactured');
            
            console.log('Query Product');
            productResult = await contract.evaluateTransaction('queryProduct', product);
            console.log(`Query result: ${ utf8Decoder.decode(productResult)}`);

            console.log('Update Product Status');
            productResult = await contract.submitTransaction('updateProductStatus', product, 'in-transit');

            console.log('Query Product');
            productResult = await contract.evaluateTransaction('queryProduct', product);
            console.log(`Query result: ${ utf8Decoder.decode(productResult)}`);

            console.log('Update Product Status');
            productResult = await contract.submitTransaction('updateProductStatus', product, 'delivered');

            console.log('Query Product');
            productResult = await contract.evaluateTransaction('queryProduct', product);
            console.log(`Query result: ${ utf8Decoder.decode(productResult)}`);
        }
        else
        {
            console.log("Product already exists");
        }
    } catch (error) {
        console.error(`Failed to create product: ${error}`);
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

main();
