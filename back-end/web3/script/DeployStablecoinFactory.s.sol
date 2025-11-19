// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {StablecoinFactory} from "../src/StablecoinFactory.sol";

/**
 * @title DeployStablecoinFactory
 * @dev Deployment script for StablecoinFactory contract
 *
 * Usage:
 * 1. Set environment variables:
 *    - PRIVATE_KEY: Deployer's private key
 *    - SEPOLIA_RPC_URL: RPC URL for Sepolia testnet
 *
 * 2. Deploy to Sepolia:
 *    forge script script/DeployStablecoinFactory.s.sol:DeployStablecoinFactory --rpc-url sepolia --broadcast --verify
 *
 * 3. Deploy locally (anvil):
 *    forge script script/DeployStablecoinFactory.s.sol:DeployStablecoinFactory --rpc-url http://localhost:8545 --broadcast
 */
contract DeployStablecoinFactory is Script {
    function run() external returns (StablecoinFactory) {
        // Get deployer address from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying StablecoinFactory...");
        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy StablecoinFactory with deployer as owner
        StablecoinFactory factory = new StablecoinFactory(deployer);

        vm.stopBroadcast();

        console.log("StablecoinFactory deployed at:", address(factory));
        console.log("Factory owner:", factory.owner());
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("Factory Address:", address(factory));
        console.log("Owner:", factory.owner());
        console.log("Stablecoin Count:", factory.getStablecoinCount());

        return factory;
    }
}

/**
 * @title CreateStablecoin
 * @dev Script to create a new stablecoin using an existing factory
 *
 * Usage:
 * 1. Set environment variables:
 *    - PRIVATE_KEY: Owner's private key
 *    - FACTORY_ADDRESS: Address of deployed StablecoinFactory
 *    - STABLECOIN_NAME: Name of the stablecoin (e.g., "Brazilian Real Stablecoin")
 *    - STABLECOIN_SYMBOL: Symbol (e.g., "BRLS")
 *    - STABLECOIN_DECIMALS: Decimals (e.g., 18)
 *
 * 2. Create stablecoin:
 *    forge script script/DeployStablecoinFactory.s.sol:CreateStablecoin --rpc-url sepolia --broadcast
 */
contract CreateStablecoin is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        string memory name = vm.envString("STABLECOIN_NAME");
        string memory symbol = vm.envString("STABLECOIN_SYMBOL");
        uint8 decimals = uint8(vm.envUint("STABLECOIN_DECIMALS"));

        console.log("Creating new stablecoin...");
        console.log("Factory:", factoryAddress);
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Decimals:", decimals);

        vm.startBroadcast(ownerPrivateKey);

        StablecoinFactory factory = StablecoinFactory(factoryAddress);
        address stablecoinAddress = factory.createStablecoin(name, symbol, decimals);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Stablecoin Created ===");
        console.log("Stablecoin Address:", stablecoinAddress);
        console.log("Symbol:", symbol);
        console.log("Name:", name);
        console.log("Decimals:", decimals);
    }
}

/**
 * @title MintTokens
 * @dev Script to mint tokens from a stablecoin
 *
 * Usage:
 * 1. Set environment variables:
 *    - PRIVATE_KEY: Owner's private key
 *    - FACTORY_ADDRESS: Address of deployed StablecoinFactory
 *    - STABLECOIN_ADDRESS: Address of the stablecoin
 *    - RECIPIENT: Address to receive tokens
 *    - AMOUNT: Amount to mint (in wei, e.g., 1000000000000000000 for 1 token with 18 decimals)
 *
 * 2. Mint tokens:
 *    forge script script/DeployStablecoinFactory.s.sol:MintTokens --rpc-url sepolia --broadcast
 */
contract MintTokens is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address stablecoinAddress = vm.envAddress("STABLECOIN_ADDRESS");
        address recipient = vm.envAddress("RECIPIENT");
        uint256 amount = vm.envUint("AMOUNT");

        console.log("Minting tokens...");
        console.log("Factory:", factoryAddress);
        console.log("Stablecoin:", stablecoinAddress);
        console.log("Recipient:", recipient);
        console.log("Amount:", amount);

        vm.startBroadcast(ownerPrivateKey);

        StablecoinFactory factory = StablecoinFactory(factoryAddress);
        factory.mintTokens(stablecoinAddress, recipient, amount);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Tokens Minted ===");
        console.log("Recipient:", recipient);
        console.log("Amount:", amount);

        uint256 balance = factory.getStablecoinBalance(stablecoinAddress, recipient);
        console.log("New Balance:", balance);
    }
}
