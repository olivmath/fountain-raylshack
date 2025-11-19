// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Stablecoin.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StablecoinFactory
 * @dev Factory contract for creating and managing Brazilian Real stablecoins
 * @notice All functions are restricted to the contract owner
 */
contract StablecoinFactory is Ownable {
    // Struct to store stablecoin information
    struct StablecoinInfo {
        address stablecoinAddress;
        string name;
        string symbol;
        uint8 decimals;
        uint256 createdAt;
        bool exists;
    }

    // Array to store all created stablecoins
    address[] public stablecoins;

    // Mapping from symbol to stablecoin info
    mapping(string => StablecoinInfo) public stablecoinsBySymbol;

    // Mapping from address to stablecoin info
    mapping(address => StablecoinInfo) public stablecoinsByAddress;

    // Events
    event StablecoinCreated(
        address indexed stablecoinAddress,
        string name,
        string symbol,
        uint8 decimals,
        uint256 timestamp
    );

    event TokensMinted(
        address indexed stablecoin,
        address indexed to,
        uint256 amount
    );

    event TokensBurned(
        address indexed stablecoin,
        address indexed from,
        uint256 amount
    );

    /**
     * @dev Constructor sets the initial owner
     * @param initialOwner Address that will own the factory
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        // Ownable constructor validates that initialOwner is not zero address
    }

    /**
     * @dev Creates a new stablecoin
     * @param name_ Token name (e.g., "Brazilian Real Stablecoin")
     * @param symbol_ Token symbol (e.g., "BRLS")
     * @param decimals_ Number of decimals (typically 18)
     * @return stablecoinAddress Address of the newly created stablecoin
     * @notice Only the owner can create new stablecoins
     */
    function createStablecoin(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) external onlyOwner returns (address stablecoinAddress) {
        require(bytes(name_).length > 0, "Factory: name cannot be empty");
        require(bytes(symbol_).length > 0, "Factory: symbol cannot be empty");
        require(!stablecoinsBySymbol[symbol_].exists, "Factory: symbol already exists");
        require(decimals_ <= 18, "Factory: decimals too high");

        // Create new stablecoin with factory as the token owner
        Stablecoin newStablecoin = new Stablecoin(
            name_,
            symbol_,
            decimals_,
            address(this)
        );

        stablecoinAddress = address(newStablecoin);

        // Store stablecoin information
        StablecoinInfo memory info = StablecoinInfo({
            stablecoinAddress: stablecoinAddress,
            name: name_,
            symbol: symbol_,
            decimals: decimals_,
            createdAt: block.timestamp,
            exists: true
        });

        stablecoins.push(stablecoinAddress);
        stablecoinsBySymbol[symbol_] = info;
        stablecoinsByAddress[stablecoinAddress] = info;

        emit StablecoinCreated(
            stablecoinAddress,
            name_,
            symbol_,
            decimals_,
            block.timestamp
        );

        return stablecoinAddress;
    }

    /**
     * @dev Mints tokens for a specific stablecoin
     * @param stablecoinAddress Address of the stablecoin contract
     * @param to Address that will receive the minted tokens
     * @param amount Amount of tokens to mint
     * @notice Only the owner can mint tokens
     */
    function mintTokens(
        address stablecoinAddress,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(
            stablecoinsByAddress[stablecoinAddress].exists,
            "Factory: stablecoin does not exist"
        );
        require(to != address(0), "Factory: mint to zero address");
        require(amount > 0, "Factory: amount must be greater than zero");

        Stablecoin(stablecoinAddress).mint(to, amount);
        emit TokensMinted(stablecoinAddress, to, amount);
    }

    /**
     * @dev Burns tokens from a specific stablecoin
     * @param stablecoinAddress Address of the stablecoin contract
     * @param from Address from which tokens will be burned
     * @param amount Amount of tokens to burn
     * @notice Only the owner can burn tokens
     */
    function burnTokens(
        address stablecoinAddress,
        address from,
        uint256 amount
    ) external onlyOwner {
        require(
            stablecoinsByAddress[stablecoinAddress].exists,
            "Factory: stablecoin does not exist"
        );
        require(from != address(0), "Factory: burn from zero address");
        require(amount > 0, "Factory: amount must be greater than zero");

        Stablecoin(stablecoinAddress).burn(from, amount);
        emit TokensBurned(stablecoinAddress, from, amount);
    }

    /**
     * @dev Gets the total number of stablecoins created
     * @return count Total number of stablecoins
     */
    function getStablecoinCount() external view returns (uint256 count) {
        return stablecoins.length;
    }

    /**
     * @dev Gets stablecoin address by symbol
     * @param symbol_ Symbol of the stablecoin
     * @return stablecoinAddress Address of the stablecoin
     */
    function getStablecoinBySymbol(string memory symbol_)
        external
        view
        returns (address stablecoinAddress)
    {
        require(
            stablecoinsBySymbol[symbol_].exists,
            "Factory: stablecoin with this symbol does not exist"
        );
        return stablecoinsBySymbol[symbol_].stablecoinAddress;
    }

    /**
     * @dev Gets stablecoin information by symbol
     * @param symbol_ Symbol of the stablecoin
     * @return info StablecoinInfo struct containing all stablecoin data
     */
    function getStablecoinInfoBySymbol(string memory symbol_)
        external
        view
        returns (StablecoinInfo memory info)
    {
        require(
            stablecoinsBySymbol[symbol_].exists,
            "Factory: stablecoin with this symbol does not exist"
        );
        return stablecoinsBySymbol[symbol_];
    }

    /**
     * @dev Gets stablecoin information by address
     * @param stablecoinAddress Address of the stablecoin
     * @return info StablecoinInfo struct containing all stablecoin data
     */
    function getStablecoinInfoByAddress(address stablecoinAddress)
        external
        view
        returns (StablecoinInfo memory info)
    {
        require(
            stablecoinsByAddress[stablecoinAddress].exists,
            "Factory: stablecoin does not exist"
        );
        return stablecoinsByAddress[stablecoinAddress];
    }

    /**
     * @dev Gets all created stablecoin addresses
     * @return addresses Array of all stablecoin addresses
     */
    function getAllStablecoins() external view returns (address[] memory addresses) {
        return stablecoins;
    }

    /**
     * @dev Checks if a stablecoin with the given symbol exists
     * @param symbol_ Symbol to check
     * @return exists True if stablecoin exists, false otherwise
     */
    function stablecoinExists(string memory symbol_) external view returns (bool exists) {
        return stablecoinsBySymbol[symbol_].exists;
    }

    /**
     * @dev Gets the total supply of a specific stablecoin
     * @param stablecoinAddress Address of the stablecoin
     * @return supply Total supply of the stablecoin
     */
    function getStablecoinTotalSupply(address stablecoinAddress)
        external
        view
        returns (uint256 supply)
    {
        require(
            stablecoinsByAddress[stablecoinAddress].exists,
            "Factory: stablecoin does not exist"
        );
        return Stablecoin(stablecoinAddress).totalSupply();
    }

    /**
     * @dev Gets the balance of an address for a specific stablecoin
     * @param stablecoinAddress Address of the stablecoin
     * @param account Address to check balance for
     * @return balance Balance of the account
     */
    function getStablecoinBalance(address stablecoinAddress, address account)
        external
        view
        returns (uint256 balance)
    {
        require(
            stablecoinsByAddress[stablecoinAddress].exists,
            "Factory: stablecoin does not exist"
        );
        return Stablecoin(stablecoinAddress).balanceOf(account);
    }
}
