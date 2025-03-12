package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Token defines the structure for the token system
type Token struct {
	Name          string             `json:"name"`
	Symbol        string             `json:"symbol"`
	TotalSupply   float64            `json:"totalSupply"`
	Owner         string             `json:"owner"`
	Balances      map[string]float64 `json:"balances"`
	LockedAmounts map[string]float64 `json:"lockedAmounts"`
}

// SmartContract defines the chaincode structure
type SmartContract struct {
	contractapi.Contract
}

// CreateToken initializes the token with pre-mined supply
func (s *SmartContract) CreateToken(ctx contractapi.TransactionContextInterface, name, symbol string, totalSupply float64, owner string) error {
	token := Token{
		Name:          name,
		Symbol:        symbol,
		TotalSupply:   totalSupply,
		Owner:         owner,
		Balances:      make(map[string]float64),
		LockedAmounts: make(map[string]float64),
	}

	tokenBytes, _ := json.Marshal(token)
	return ctx.GetStub().PutState("TOKEN", tokenBytes)
}

// BalanceOf retrieves the balance of a specific account
func (s *SmartContract) BalanceOf(ctx contractapi.TransactionContextInterface, account string) (float64, error) {
	tokenBytes, err := ctx.GetStub().GetState("TOKEN")
	if err != nil || tokenBytes == nil {
		return 0, fmt.Errorf("Token not found")
	}

	var token Token
	_ = json.Unmarshal(tokenBytes, &token)

	balance, exists := token.Balances[account]
	if !exists {
		return 0, fmt.Errorf("Account not found")
	}

	return balance, nil
}

// LockedBalanceOf retrieves the locked balance of a specific account
func (s *SmartContract) LockedBalanceOf(ctx contractapi.TransactionContextInterface, account string) (float64, error) {
	tokenBytes, err := ctx.GetStub().GetState("TOKEN")
	if err != nil || tokenBytes == nil {
		return 0, fmt.Errorf("Token not found")
	}

	var token Token
	_ = json.Unmarshal(tokenBytes, &token)

	lockedBalance, exists := token.LockedAmounts[account]
	if !exists {
		return 0, nil
	}

	return lockedBalance, nil
}

// Mint adds new tokens to the total supply and assigns them to the owner
func (s *SmartContract) Mint(ctx contractapi.TransactionContextInterface, account string, amount float64) error {
	tokenBytes, err := ctx.GetStub().GetState("TOKEN")
	if err != nil || tokenBytes == nil {
		return fmt.Errorf("Token not found")
	}

	var token Token
	_ = json.Unmarshal(tokenBytes, &token)

	token.TotalSupply += amount
	token.Balances[account] += amount

	tokenBytes, _ = json.Marshal(token)
	err = ctx.GetStub().PutState("TOKEN", tokenBytes)
	if err != nil {
		return err
	}

	event := fmt.Sprintf("Minted %f tokens for account %s", amount, account)
	return ctx.GetStub().SetEvent("Mint", []byte(event))
}

// Burn removes tokens from the total supply
func (s *SmartContract) Burn(ctx contractapi.TransactionContextInterface, account string, amount float64) error {
	tokenBytes, err := ctx.GetStub().GetState("TOKEN")
	if err != nil || tokenBytes == nil {
		return fmt.Errorf("Token not found")
	}

	var token Token
	_ = json.Unmarshal(tokenBytes, &token)

	if token.Balances[account] < amount {
		return fmt.Errorf("Insufficient balance to burn")
	}

	token.TotalSupply -= amount
	token.Balances[account] -= amount

	tokenBytes, _ = json.Marshal(token)
	if err := ctx.GetStub().PutState("TOKEN", tokenBytes); err != nil {
		return err
	}

	event := fmt.Sprintf("Burnt %f tokens for account %s", amount, account)
	return ctx.GetStub().SetEvent("Burn", []byte(event))
}

// Lock locks a specified amount of tokens for a given account
func (s *SmartContract) Lock(ctx contractapi.TransactionContextInterface, account string, amount float64) error {
	tokenBytes, err := ctx.GetStub().GetState("TOKEN")
	if err != nil || tokenBytes == nil {
		return fmt.Errorf("Token not found")
	}

	var token Token
	_ = json.Unmarshal(tokenBytes, &token)

	if token.Balances[account] < amount {
		return fmt.Errorf("Insufficient balance to lock")
	}

	// Deduct from available balance and add to locked balance
	token.Balances[account] -= amount
	token.LockedAmounts[account] += amount

	// Save the updated token state
	tokenBytes, _ = json.Marshal(token)
	if err := ctx.GetStub().PutState("TOKEN", tokenBytes); err != nil {
		return err
	}

	// Emit a lock event
	event := fmt.Sprintf("Locked %f tokens for account %s", amount, account)
	return ctx.GetStub().SetEvent("Lock", []byte(event))
}

// Unlock unlocks a specified amount of tokens for a given account
func (s *SmartContract) Unlock(ctx contractapi.TransactionContextInterface, account string, amount float64) error {
	tokenBytes, err := ctx.GetStub().GetState("TOKEN")
	if err != nil || tokenBytes == nil {
		return fmt.Errorf("Token not found")
	}

	var token Token
	_ = json.Unmarshal(tokenBytes, &token)

	if token.LockedAmounts[account] < amount {
		return fmt.Errorf("Insufficient locked balance to unlock")
	}

	// Deduct from locked balance and add to available balance
	token.LockedAmounts[account] -= amount
	token.Balances[account] += amount

	// Save the updated token state
	tokenBytes, _ = json.Marshal(token)
	if err := ctx.GetStub().PutState("TOKEN", tokenBytes); err != nil {
		return err
	}

	// Emit an unlock event
	event := fmt.Sprintf("Unlocked %f tokens for account %s", amount, account)
	return ctx.GetStub().SetEvent("Unlock", []byte(event))
}

// GetTokenDetails retrieves the token metadata
func (s *SmartContract) GetTokenDetails(ctx contractapi.TransactionContextInterface) (*Token, error) {
	tokenBytes, err := ctx.GetStub().GetState("TOKEN")
	if err != nil || tokenBytes == nil {
		return nil, fmt.Errorf("Token not found")
	}

	var token Token
	_ = json.Unmarshal(tokenBytes, &token)
	return &token, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating chaincode: %v", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %v", err)
	}
}
