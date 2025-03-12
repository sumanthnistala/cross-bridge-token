package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Asset represents an asset on Fabric
type Asset struct {
	ID     string  `json:"id"`
	Owner  string  `json:"owner"`
	Amount float64 `json:"amount"`
	Origin string  `json:"origin"`
	Status string  `json:"status"` // "Locked" or "Minted"
}

// AssetChaincode implements chaincode
type AssetChaincode struct {
	contractapi.Contract
}

// MintAsset mints an asset on Fabric
func (c *AssetChaincode) MintAsset(ctx contractapi.TransactionContextInterface, tokenAddress string, Id string, amount float64, destinationAddress string) error {
	asset := Asset{
		ID:     Id,
		Owner:  destinationAddress,
		Amount: amount,
		Origin: tokenAddress,
		Status: "Minted",
	}

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return fmt.Errorf("failed to marshal asset: %v", err)
	}

	err = ctx.GetStub().PutState(asset.ID, assetJSON)
	if err != nil {
		return fmt.Errorf("failed to write asset to state: %v", err)
	}

	return nil
}

func (c *AssetChaincode) Burn(ctx contractapi.TransactionContextInterface, id string) error {
	assetBytes, err := ctx.GetStub().GetState(id)
	if err != nil || assetBytes == nil {
		return fmt.Errorf("Asset not found")
	}

	return ctx.GetStub().DelState(id)
}

func (c *AssetChaincode) LockAsset(ctx contractapi.TransactionContextInterface, assetID string, amount float64) error {
	assetAsBytes, err := ctx.GetStub().GetState(assetID)
	if err != nil {
		return fmt.Errorf("failed to get asset: %v", err)
	}

	if assetAsBytes == nil {
		return fmt.Errorf("asset does not exist")
	}

	var asset Asset
	err = json.Unmarshal(assetAsBytes, &asset)
	if err != nil {
		return fmt.Errorf("failed to unmarshal asset: %v", err)
	}

	if asset.Amount < amount {
		return fmt.Errorf("insufficient asset balance")
	}

	asset.Amount -= amount
	asset.Status = "Locked"

	assetAsBytes, _ = json.Marshal(asset)
	ctx.GetStub().PutState(assetID, assetAsBytes)

	// Emit an event for Solidity
	eventPayload := map[string]interface{}{
		"assetID": assetID,
		"amount":  amount,
	}
	eventBytes, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("AssetLocked", eventBytes)

	return nil
}

func (c *AssetChaincode) UnlockAsset(ctx contractapi.TransactionContextInterface, assetID string, amount float64, ethereumTransactionId string) error {
	assetAsBytes, err := ctx.GetStub().GetState(assetID)
	if err != nil {
		return fmt.Errorf("failed to get asset: %v", err)
	}

	if assetAsBytes == nil {
		return fmt.Errorf("asset does not exist")
	}

	var asset Asset
	err = json.Unmarshal(assetAsBytes, &asset)
	if err != nil {
		return fmt.Errorf("failed to unmarshal asset: %v", err)
	}

	asset.Amount += amount
	asset.Status = "UnLocked"

	assetAsBytes, _ = json.Marshal(asset)
	ctx.GetStub().PutState(assetID, assetAsBytes)

	// Emit an event for monitoring
	eventPayload := map[string]interface{}{
		"assetID":               assetID,
		"amount":                amount,
		"ethereumTransactionId": ethereumTransactionId,
	}
	eventBytes, _ := json.Marshal(eventPayload)
	ctx.GetStub().SetEvent("AssetUnlocked", eventBytes)

	return nil
}

// func main() {
// 	chaincode, err := contractapi.NewChaincode(&AssetChaincode{})
// 	if err != nil {
// 		fmt.Printf("Error creating asset chaincode: %v\n", err)
// 		return
// 	}

// 	if err := chaincode.Start(); err != nil {
// 		fmt.Printf("Error starting chaincode: %v\n", err)
// 	}
// }
