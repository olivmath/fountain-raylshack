// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Stablecoin
 * @dev ERC20 token representing a Brazilian Real stablecoin
 * @notice This contract is created by the StablecoinFactory and managed by the factory owner
 */
contract Stablecoin is ERC20, Ownable {
    uint8 private immutable _decimals;
    address public immutable factory;

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Constructor is called by the factory
     * @param name_ Token name (e.g., "Brazilian Real Stablecoin")
     * @param symbol_ Token symbol (e.g., "BRLS")
     * @param decimals_ Number of decimals (typically 18)
     * @param initialOwner Address that will own this stablecoin (factory owner)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address initialOwner
    ) ERC20(name_, symbol_) Ownable(initialOwner) {
        require(initialOwner != address(0), "Stablecoin: owner cannot be zero address");
        require(bytes(name_).length > 0, "Stablecoin: name cannot be empty");
        require(bytes(symbol_).length > 0, "Stablecoin: symbol cannot be empty");
        require(decimals_ <= 18, "Stablecoin: decimals too high");

        _decimals = decimals_;
        factory = msg.sender;
    }

    /**
     * @dev Returns the number of decimals used by the token
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mints tokens to a specified address
     * @param to Address that will receive the minted tokens
     * @param amount Amount of tokens to mint
     * @notice Only the owner (factory owner) can mint tokens
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Stablecoin: mint to zero address");
        require(amount > 0, "Stablecoin: amount must be greater than zero");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burns tokens from a specified address
     * @param from Address from which tokens will be burned
     * @param amount Amount of tokens to burn
     * @notice Only the owner (factory owner) can burn tokens
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "Stablecoin: burn from zero address");
        require(amount > 0, "Stablecoin: amount must be greater than zero");
        require(balanceOf(from) >= amount, "Stablecoin: insufficient balance");

        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
}
