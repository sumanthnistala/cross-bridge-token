const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const crypto = require("crypto");
const { connect, Contract, Identity, Signer, signers } = require('@hyperledger/fabric-gateway');
async function main() {
  try {
    const orgName="Org1";
    const userName="0xC0679b9DCBD4aCB89DD5e11FBfeB6048c2edD15f";
    // Load the connection profile for Org1
    const ccpPathOrg = path.resolve(__dirname, "connection-profiles",'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPathOrg, 'utf8'));
    // Create a new CA client for interacting with the CA.
    const caInfo = ccp.certificateAuthorities['ca.' + orgName.toLowerCase() + '.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    // Load the wallet for Org1
    const walletPath = path.join(process.cwd(), '..', `wallets/${orgName}`);
    console.log("path"+walletPath);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

   // Check to see if the user is already enrolled.
   const userIdentity = await wallet.get(userName);
   console.log(userIdentity)
   if (userIdentity) {
       console.log(`An identity for the user "${userName}" already exists in the wallet for ${orgName}`);
       return;
   }

   // Check if the admin is enrolled
   const adminIdentity = await wallet.get('admin-' + orgName);
   console.log(adminIdentity);
   if (!adminIdentity) {
       console.log(`An identity for the admin user "admin" does not exist in the wallet for ${orgName}`);
       enrollAdminForOrg(orgName);
   }

   console.log("Executed here");
   // Build a user object for authenticating with the CA
   const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
   const adminUser = await provider.getUserContext(adminIdentity, 'admin-' + orgName);

   // Register the user, enroll the user, and import the new identity into the wallet.
   const secret = await ca.register({
       affiliation: orgName.toLowerCase() + '.department1',
       enrollmentID: userName,
       role: 'client'
   }, adminUser);
   const enrollment = await ca.enroll({
       enrollmentID: userName,
       enrollmentSecret: secret
   });
   const x509Identity = {
       credentials: {
           certificate: enrollment.certificate,
           privateKey: enrollment.key.toBytes(),
       },
       mspId: orgName + 'MSP',
       type: 'X.509',
   };
   await wallet.put(userName, x509Identity);
   console.log(secret);
   console.log(`Successfully registered and enrolled user "${userName}" and imported it into the wallet for ${orgName}`);

   console.log(`Before returning the secrets`, secret);

  } catch (error) {
    console.error(`Failed to submit transaction: ${error.stack}`);
    process.exit(1);
  }
}
main();
