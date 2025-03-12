. envVar.sh
. utils.sh

CHANNEL_NAME="mychannel"
CC_RUNTIME_LANGUAGE="golang"
CC_SRC_PATH="../artifacts/chaincode/token"
CC_NAME="token"
CC_POLICY="OR('Org1MSP.peer','Org2MSP.peer')"

chaincodeCreateToken()
{
    setGlobals 1

    # Create Car
    peer chaincode invoke -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls $CORE_PEER_TLS_ENABLED \
        --cafile $ORDERER_CA \
        -C $CHANNEL_NAME -n ${CC_NAME}  \
        --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
        -c '{"function":"CreateToken","Args":["HLCrossChainToken","HLCCT", "1000","admin@org1.com"]}'

}

chaincodeGetTokenDetails() {
    setGlobals 1
    peer chaincode query -C $CHANNEL_NAME -n ${CC_NAME} -c '{"function":"GetTokenDetails","Args":[]}'
}

chaincodeMintTokens()
{
    setGlobals 1
        peer chaincode invoke -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls $CORE_PEER_TLS_ENABLED \
        --cafile $ORDERER_CA \
        -C $CHANNEL_NAME -n ${CC_NAME}  \
        --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
        -c '{"function":"Mint","Args":["user@example.com","2000"]}'
}

chaincodeGetUserBalance()
{
    setGlobals 1
    peer chaincode query -C $CHANNEL_NAME -n ${CC_NAME} -c '{"function":"BalanceOf","Args":["user@example.com"]}'

}

chaincodeBurnTokens()
{
    setGlobals 1
        peer chaincode invoke -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls $CORE_PEER_TLS_ENABLED \
        --cafile $ORDERER_CA \
        -C $CHANNEL_NAME -n ${CC_NAME}  \
        --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
        -c '{"function":"Burn","Args":["user@example.com","200"]}'
}


chaincodeLockTokens()
{
    setGlobals 1
        peer chaincode invoke -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls $CORE_PEER_TLS_ENABLED \
        --cafile $ORDERER_CA \
        -C $CHANNEL_NAME -n ${CC_NAME}  \
        --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
        -c '{"function":"Lock","Args":["user@example.com","200"]}'
}

chaincodeGetUserLockedBalance()
{
    setGlobals 1
    peer chaincode query -C $CHANNEL_NAME -n ${CC_NAME} -c '{"function":"LockedBalanceOf","Args":["user@example.com"]}'

}

chaincodeUnLockTokens()
{
    setGlobals 1
        peer chaincode invoke -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls $CORE_PEER_TLS_ENABLED \
        --cafile $ORDERER_CA \
        -C $CHANNEL_NAME -n ${CC_NAME}  \
        --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA \
        -c '{"function":"Unlock","Args":["user@example.com","200"]}'
}

chaincodeCreateToken
sleep 3
chaincodeGetTokenDetails
sleep 3
chaincodeMintTokens
sleep 3
chaincodeGetUserBalance
sleep 3
chaincodeLockTokens
sleep 3
chaincodeGetUserLockedBalance
sleep 3
chaincodeUnLockTokens
sleep 3
chaincodeGetUserLockedBalance
sleep 3
chaincodeBurnTokens
sleep 3
chaincodeGetUserBalance
