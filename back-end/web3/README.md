# Fountain Stablecoin Factory

Smart contracts for creating and managing Brazilian Real stablecoins (ERC20 tokens) on Ethereum.

## Overview

This project implements a factory pattern for deploying and managing multiple ERC20 stablecoins. The factory owner has exclusive control over:

- Creating new stablecoins
- Minting tokens
- Burning tokens

## Contracts

### StablecoinFactory.sol

The main factory contract that creates and manages stablecoins. Key features:

- **Create Stablecoins**: Deploy new ERC20 tokens with custom name, symbol, and decimals
- **Mint Tokens**: Mint tokens to any address
- **Burn Tokens**: Burn tokens from any address
- **Query Functions**: Get stablecoin information by symbol or address
- **Owner-Only**: All operations are restricted to the factory owner

### Stablecoin.sol

ERC20 token contract with minting and burning capabilities. Key features:

- Standard ERC20 functionality (transfer, approve, transferFrom)
- Minting and burning controlled by the factory
- Customizable name, symbol, and decimals
- Immutable factory reference

## Architecture

```
┌─────────────────────┐
│ StablecoinFactory   │
│  (Owner controlled) │
└──────────┬──────────┘
           │ creates
           ▼
    ┌──────────────┐
    │  Stablecoin  │
    │   (ERC20)    │
    └──────────────┘
```

The factory deploys stablecoins and retains ownership of them, allowing centralized control over token supply through minting and burning operations.

## Installation

This project uses [Foundry](https://book.getfoundry.sh/). Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Install dependencies:

```bash
forge install
```

## Testing

Run all tests:

```bash
forge test
```

Run tests with verbosity:

```bash
forge test -vvv
```

Run specific test:

```bash
forge test --match-test testCreateStablecoin -vvv
```

Generate gas report:

```bash
forge test --gas-report
```

## Deployment

### 1. Set up environment variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```bash
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Deploy to Sepolia testnet

```bash
forge script script/DeployStablecoinFactory.s.sol:DeployStablecoinFactory \
  --rpc-url sepolia \
  --broadcast \
  --verify
```

### 3. Deploy locally (Anvil)

Start local node:

```bash
anvil
```

Deploy (in another terminal):

```bash
forge script script/DeployStablecoinFactory.s.sol:DeployStablecoinFactory \
  --rpc-url http://localhost:8545 \
  --broadcast
```

## Usage Examples

### Create a new stablecoin

After deploying the factory, set the factory address in `.env`:

```bash
FACTORY_ADDRESS=0x...
STABLECOIN_NAME="Brazilian Real Stablecoin"
STABLECOIN_SYMBOL="BRLS"
STABLECOIN_DECIMALS=18
```

Run the creation script:

```bash
forge script script/DeployStablecoinFactory.s.sol:CreateStablecoin \
  --rpc-url sepolia \
  --broadcast
```

### Mint tokens

Set minting parameters in `.env`:

```bash
STABLECOIN_ADDRESS=0x...
RECIPIENT=0x...
AMOUNT=1000000000000000000  # 1 token with 18 decimals
```

Run the minting script:

```bash
forge script script/DeployStablecoinFactory.s.sol:MintTokens \
  --rpc-url sepolia \
  --broadcast
```

### Interact with contracts using Cast

Get stablecoin count:

```bash
cast call <FACTORY_ADDRESS> "getStablecoinCount()" --rpc-url sepolia
```

Get stablecoin by symbol:

```bash
cast call <FACTORY_ADDRESS> "getStablecoinBySymbol(string)" "BRLS" --rpc-url sepolia
```

Check token balance:

```bash
cast call <STABLECOIN_ADDRESS> "balanceOf(address)" <USER_ADDRESS> --rpc-url sepolia
```

## Security Features

- **Owner-only controls**: Only the factory owner can create, mint, and burn tokens
- **OpenZeppelin contracts**: Uses audited OpenZeppelin libraries for ERC20 and Ownable
- **Immutable factory reference**: Each stablecoin stores its factory address permanently
- **Input validation**: Comprehensive validation for all operations
- **Reentrancy protection**: Inherited from OpenZeppelin ERC20

## Test Coverage

The project includes 33 comprehensive tests covering:

- Factory creation and ownership
- Stablecoin creation with various parameters
- Minting functionality and edge cases
- Burning functionality and edge cases
- Access control (only owner can perform privileged operations)
- Query functions (getters)
- ERC20 standard compliance (transfers, approvals)
- Full workflow integration tests

All tests pass successfully:

```
[PASS] 33 tests passed
```

## Project Structure

```
web3/
├── src/
│   ├── Stablecoin.sol           # ERC20 token contract
│   └── StablecoinFactory.sol    # Factory contract
├── test/
│   └── StablecoinFactory.t.sol  # Comprehensive test suite
├── script/
│   └── DeployStablecoinFactory.s.sol  # Deployment scripts
├── lib/                         # Dependencies
├── foundry.toml                 # Foundry configuration
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## Gas Optimization

The contracts are optimized with:

- Optimizer enabled (200 runs)
- Immutable variables where possible
- Efficient storage layout
- Minimal external calls

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `forge test`
5. Submit a pull request

## Support

For questions and support, please open an issue on GitHub.

## Foundry Documentation

- [Foundry Book](https://book.getfoundry.sh/)
- [Forge Documentation](https://book.getfoundry.sh/forge/)
- [Cast Documentation](https://book.getfoundry.sh/cast/)
