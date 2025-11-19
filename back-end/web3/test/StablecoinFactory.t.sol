// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/StablecoinFactory.sol";
import "../src/Stablecoin.sol";

contract StablecoinFactoryTest is Test {
    StablecoinFactory public factory;
    address public owner;
    address public user1;
    address public user2;

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

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        factory = new StablecoinFactory(owner);
    }

    // ===== Factory Creation Tests =====

    function testFactoryCreation() public view {
        assertEq(factory.owner(), owner, "Owner should be set correctly");
        assertEq(factory.getStablecoinCount(), 0, "Should start with zero stablecoins");
    }

    function testFactoryCreationWithZeroAddress() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableInvalidOwner(address)", address(0)));
        new StablecoinFactory(address(0));
    }

    // ===== Stablecoin Creation Tests =====

    function testCreateStablecoin() public {
        string memory name = "Brazilian Real Stablecoin";
        string memory symbol = "BRLS";
        uint8 decimals = 18;

        vm.expectEmit(false, false, false, true);
        emit StablecoinCreated(address(0), name, symbol, decimals, block.timestamp);

        address stablecoinAddress = factory.createStablecoin(name, symbol, decimals);

        assertTrue(stablecoinAddress != address(0), "Stablecoin address should not be zero");
        assertEq(factory.getStablecoinCount(), 1, "Should have 1 stablecoin");

        Stablecoin stablecoin = Stablecoin(stablecoinAddress);
        assertEq(stablecoin.name(), name, "Name should match");
        assertEq(stablecoin.symbol(), symbol, "Symbol should match");
        assertEq(stablecoin.decimals(), decimals, "Decimals should match");
        assertEq(stablecoin.owner(), address(factory), "Stablecoin owner should be factory");
    }

    function testCreateMultipleStablecoins() public {
        address stablecoin1 = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        address stablecoin2 = factory.createStablecoin("US Dollar", "USDC", 6);
        address stablecoin3 = factory.createStablecoin("Euro", "EURC", 18);

        assertEq(factory.getStablecoinCount(), 3, "Should have 3 stablecoins");

        address[] memory allStablecoins = factory.getAllStablecoins();
        assertEq(allStablecoins.length, 3, "getAllStablecoins should return 3 items");
        assertEq(allStablecoins[0], stablecoin1, "First stablecoin should match");
        assertEq(allStablecoins[1], stablecoin2, "Second stablecoin should match");
        assertEq(allStablecoins[2], stablecoin3, "Third stablecoin should match");
    }

    function testCannotCreateStablecoinWithEmptyName() public {
        vm.expectRevert("Factory: name cannot be empty");
        factory.createStablecoin("", "BRLS", 18);
    }

    function testCannotCreateStablecoinWithEmptySymbol() public {
        vm.expectRevert("Factory: symbol cannot be empty");
        factory.createStablecoin("Brazilian Real", "", 18);
    }

    function testCannotCreateStablecoinWithDuplicateSymbol() public {
        factory.createStablecoin("Brazilian Real", "BRLS", 18);

        vm.expectRevert("Factory: symbol already exists");
        factory.createStablecoin("Another Token", "BRLS", 6);
    }

    function testCannotCreateStablecoinWithTooManyDecimals() public {
        vm.expectRevert("Factory: decimals too high");
        factory.createStablecoin("Brazilian Real", "BRLS", 19);
    }

    function testOnlyOwnerCanCreateStablecoin() public {
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        factory.createStablecoin("Brazilian Real", "BRLS", 18);
    }

    // ===== Minting Tests =====

    function testMintTokens() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 mintAmount = 1000 * 10**18;

        vm.expectEmit(true, true, false, true);
        emit TokensMinted(stablecoinAddress, user1, mintAmount);

        factory.mintTokens(stablecoinAddress, user1, mintAmount);

        Stablecoin stablecoin = Stablecoin(stablecoinAddress);
        assertEq(stablecoin.balanceOf(user1), mintAmount, "User should have minted tokens");
        assertEq(stablecoin.totalSupply(), mintAmount, "Total supply should match minted amount");
    }

    function testMintTokensMultipleTimes() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 mintAmount1 = 1000 * 10**18;
        uint256 mintAmount2 = 500 * 10**18;

        factory.mintTokens(stablecoinAddress, user1, mintAmount1);
        factory.mintTokens(stablecoinAddress, user1, mintAmount2);

        Stablecoin stablecoin = Stablecoin(stablecoinAddress);
        assertEq(
            stablecoin.balanceOf(user1),
            mintAmount1 + mintAmount2,
            "User should have total minted tokens"
        );
    }

    function testCannotMintToZeroAddress() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);

        vm.expectRevert("Factory: mint to zero address");
        factory.mintTokens(stablecoinAddress, address(0), 1000);
    }

    function testCannotMintZeroAmount() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);

        vm.expectRevert("Factory: amount must be greater than zero");
        factory.mintTokens(stablecoinAddress, user1, 0);
    }

    function testCannotMintToNonExistentStablecoin() public {
        vm.expectRevert("Factory: stablecoin does not exist");
        factory.mintTokens(address(0x999), user1, 1000);
    }

    function testOnlyOwnerCanMint() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        factory.mintTokens(stablecoinAddress, user1, 1000);
    }

    // ===== Burning Tests =====

    function testBurnTokens() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 mintAmount = 1000 * 10**18;
        uint256 burnAmount = 300 * 10**18;

        factory.mintTokens(stablecoinAddress, user1, mintAmount);

        vm.expectEmit(true, true, false, true);
        emit TokensBurned(stablecoinAddress, user1, burnAmount);

        factory.burnTokens(stablecoinAddress, user1, burnAmount);

        Stablecoin stablecoin = Stablecoin(stablecoinAddress);
        assertEq(
            stablecoin.balanceOf(user1),
            mintAmount - burnAmount,
            "User balance should decrease"
        );
        assertEq(
            stablecoin.totalSupply(),
            mintAmount - burnAmount,
            "Total supply should decrease"
        );
    }

    function testBurnAllTokens() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 amount = 1000 * 10**18;

        factory.mintTokens(stablecoinAddress, user1, amount);
        factory.burnTokens(stablecoinAddress, user1, amount);

        Stablecoin stablecoin = Stablecoin(stablecoinAddress);
        assertEq(stablecoin.balanceOf(user1), 0, "User should have zero balance");
        assertEq(stablecoin.totalSupply(), 0, "Total supply should be zero");
    }

    function testCannotBurnFromZeroAddress() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);

        vm.expectRevert("Factory: burn from zero address");
        factory.burnTokens(stablecoinAddress, address(0), 1000);
    }

    function testCannotBurnZeroAmount() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);

        vm.expectRevert("Factory: amount must be greater than zero");
        factory.burnTokens(stablecoinAddress, user1, 0);
    }

    function testCannotBurnMoreThanBalance() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 mintAmount = 1000 * 10**18;

        factory.mintTokens(stablecoinAddress, user1, mintAmount);

        vm.expectRevert("Stablecoin: insufficient balance");
        factory.burnTokens(stablecoinAddress, user1, mintAmount + 1);
    }

    function testCannotBurnFromNonExistentStablecoin() public {
        vm.expectRevert("Factory: stablecoin does not exist");
        factory.burnTokens(address(0x999), user1, 1000);
    }

    function testOnlyOwnerCanBurn() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        factory.mintTokens(stablecoinAddress, user1, 1000 * 10**18);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1));
        factory.burnTokens(stablecoinAddress, user1, 1000);
    }

    // ===== Getter Functions Tests =====

    function testGetStablecoinBySymbol() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);

        address retrieved = factory.getStablecoinBySymbol("BRLS");
        assertEq(retrieved, stablecoinAddress, "Should retrieve correct stablecoin");
    }

    function testGetStablecoinInfoBySymbol() public {
        string memory name = "Brazilian Real";
        string memory symbol = "BRLS";
        uint8 decimals = 18;

        address stablecoinAddress = factory.createStablecoin(name, symbol, decimals);

        StablecoinFactory.StablecoinInfo memory info = factory.getStablecoinInfoBySymbol(symbol);

        assertEq(info.stablecoinAddress, stablecoinAddress, "Address should match");
        assertEq(info.name, name, "Name should match");
        assertEq(info.symbol, symbol, "Symbol should match");
        assertEq(info.decimals, decimals, "Decimals should match");
        assertTrue(info.exists, "Should exist");
        assertEq(info.createdAt, block.timestamp, "Created timestamp should match");
    }

    function testGetStablecoinInfoByAddress() public {
        string memory name = "Brazilian Real";
        string memory symbol = "BRLS";
        uint8 decimals = 18;

        address stablecoinAddress = factory.createStablecoin(name, symbol, decimals);

        StablecoinFactory.StablecoinInfo memory info = factory.getStablecoinInfoByAddress(
            stablecoinAddress
        );

        assertEq(info.stablecoinAddress, stablecoinAddress, "Address should match");
        assertEq(info.name, name, "Name should match");
        assertEq(info.symbol, symbol, "Symbol should match");
        assertEq(info.decimals, decimals, "Decimals should match");
    }

    function testStablecoinExists() public {
        factory.createStablecoin("Brazilian Real", "BRLS", 18);

        assertTrue(factory.stablecoinExists("BRLS"), "BRLS should exist");
        assertFalse(factory.stablecoinExists("USDC"), "USDC should not exist");
    }

    function testGetStablecoinTotalSupply() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 mintAmount = 1000 * 10**18;

        factory.mintTokens(stablecoinAddress, user1, mintAmount);

        uint256 totalSupply = factory.getStablecoinTotalSupply(stablecoinAddress);
        assertEq(totalSupply, mintAmount, "Total supply should match");
    }

    function testGetStablecoinBalance() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 mintAmount = 1000 * 10**18;

        factory.mintTokens(stablecoinAddress, user1, mintAmount);

        uint256 balance = factory.getStablecoinBalance(stablecoinAddress, user1);
        assertEq(balance, mintAmount, "Balance should match");
    }

    function testCannotGetNonExistentStablecoinBySymbol() public {
        vm.expectRevert("Factory: stablecoin with this symbol does not exist");
        factory.getStablecoinBySymbol("NONEXISTENT");
    }

    function testCannotGetNonExistentStablecoinInfoByAddress() public {
        vm.expectRevert("Factory: stablecoin does not exist");
        factory.getStablecoinInfoByAddress(address(0x999));
    }

    // ===== ERC20 Transfer Tests =====

    function testUserCanTransferTokens() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 mintAmount = 1000 * 10**18;
        uint256 transferAmount = 300 * 10**18;

        factory.mintTokens(stablecoinAddress, user1, mintAmount);

        Stablecoin stablecoin = Stablecoin(stablecoinAddress);

        vm.prank(user1);
        stablecoin.transfer(user2, transferAmount);

        assertEq(stablecoin.balanceOf(user1), mintAmount - transferAmount, "User1 balance should decrease");
        assertEq(stablecoin.balanceOf(user2), transferAmount, "User2 should receive tokens");
    }

    function testUserCanApproveAndTransferFrom() public {
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);
        uint256 mintAmount = 1000 * 10**18;
        uint256 transferAmount = 300 * 10**18;

        factory.mintTokens(stablecoinAddress, user1, mintAmount);

        Stablecoin stablecoin = Stablecoin(stablecoinAddress);

        // User1 approves user2 to spend tokens
        vm.prank(user1);
        stablecoin.approve(user2, transferAmount);

        // User2 transfers from user1 to themselves
        vm.prank(user2);
        stablecoin.transferFrom(user1, user2, transferAmount);

        assertEq(stablecoin.balanceOf(user1), mintAmount - transferAmount, "User1 balance should decrease");
        assertEq(stablecoin.balanceOf(user2), transferAmount, "User2 should receive tokens");
    }

    // ===== Integration Tests =====

    function testFullWorkflow() public {
        // Create stablecoin
        address stablecoinAddress = factory.createStablecoin("Brazilian Real", "BRLS", 18);

        // Mint to user1
        factory.mintTokens(stablecoinAddress, user1, 1000 * 10**18);

        // User1 transfers to user2
        Stablecoin stablecoin = Stablecoin(stablecoinAddress);
        vm.prank(user1);
        stablecoin.transfer(user2, 300 * 10**18);

        // Burn from user2
        factory.burnTokens(stablecoinAddress, user2, 100 * 10**18);

        // Check final balances
        assertEq(stablecoin.balanceOf(user1), 700 * 10**18, "User1 final balance");
        assertEq(stablecoin.balanceOf(user2), 200 * 10**18, "User2 final balance");
        assertEq(stablecoin.totalSupply(), 900 * 10**18, "Final total supply");
    }
}
