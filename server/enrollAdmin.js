const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Enroll admin for Org1
        await enrollAdminForOrg('Org1', 'connection-org1.json');

    } catch (error) {
        console.error(`Failed to enroll admin: ${error}`);
        process.exit(1);
    }
}

async function enrollAdminForOrg(orgName, connectionFileName) {
    try {
        // Load the connection profile
        const ccpPath = path.resolve(__dirname, 'connection-profiles', connectionFileName);
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA.
        const caInfo = ccp.certificateAuthorities['ca.' + orgName.toLowerCase() + '.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), '..', `wallets/${orgName}`);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(walletPath);
        // Check to see if we've already enrolled the admin.
        const identity = await wallet.get('admin-' + orgName);
        if (identity) {
            console.log(`An identity for the admin user "admin" already exists in the wallet for ${orgName}`);
            return;
        }

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgName + 'MSP',
            type: 'X.509',
        };
        await wallet.put('admin-' + orgName, x509Identity);
        console.log(`Successfully enrolled admin user "admin" and imported it into the wallet for ${orgName}`);

    } catch (error) {
        console.error(`Failed to enroll admin for ${orgName}: ${error}`);
    }
}

main();
