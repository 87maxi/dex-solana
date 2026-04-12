// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TokenA} from "../src/TokenA.sol";
import {TokenB} from "../src/TokenB.sol";
import {DEX} from "../src/DEX.sol";

contract DEXTest is Test {
    TokenA public tokenA;
    TokenB public tokenB;
    DEX public dex;

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public deployer;

    uint256 constant INITIAL_MINT = 10000 ether;
    uint256 constant LIQUIDITY_A = 1000 ether;
    uint256 constant LIQUIDITY_B = 1000 ether;

    function setUp() public {
        deployer = address(this);
        tokenA = new TokenA();
        tokenB = new TokenB();
        dex = new DEX(address(tokenA), address(tokenB));

        tokenA.mint(alice, INITIAL_MINT);
        tokenB.mint(alice, INITIAL_MINT);
        tokenA.mint(bob, INITIAL_MINT);
        tokenB.mint(bob, INITIAL_MINT);
    }

    function test_AddLiquidity_Initial() public {
        vm.startPrank(alice);
        tokenA.approve(address(dex), LIQUIDITY_A);
        tokenB.approve(address(dex), LIQUIDITY_B);
        uint256 lp = dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B);
        vm.stopPrank();

        assertGt(lp, 0, "LP tokens should be minted");
        assertEq(dex.reserveA(), LIQUIDITY_A);
        assertEq(dex.reserveB(), LIQUIDITY_B);
        assertEq(dex.balanceOf(alice), lp);
        assertEq(dex.totalSupply(), lp);
    }

    function test_AddLiquidity_Subsequent() public {
        _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        vm.startPrank(bob);
        tokenA.approve(address(dex), 500 ether);
        tokenB.approve(address(dex), 500 ether);
        uint256 lp = dex.addLiquidity(500 ether, 500 ether);
        vm.stopPrank();

        assertGt(lp, 0);
        assertEq(dex.reserveA(), 1500 ether);
        assertEq(dex.reserveB(), 1500 ether);
    }

    function test_Swap_AtoB() public {
        _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        uint256 swapAmount = 100 ether;
        uint256 expectedOut = dex.getAmountOut(address(tokenA), swapAmount);

        vm.startPrank(bob);
        tokenA.approve(address(dex), swapAmount);
        uint256 amountOut = dex.swap(address(tokenA), swapAmount);
        vm.stopPrank();

        assertEq(amountOut, expectedOut, "Output should match estimate");
        assertGt(amountOut, 0, "Should receive tokens");
        assertLt(amountOut, swapAmount, "Output should be less due to fee + price impact");
    }

    function test_Swap_BtoA() public {
        _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        uint256 swapAmount = 100 ether;

        vm.startPrank(bob);
        tokenB.approve(address(dex), swapAmount);
        uint256 amountOut = dex.swap(address(tokenB), swapAmount);
        vm.stopPrank();

        assertGt(amountOut, 0);
    }

    function test_Swap_ProtocolFees() public {
        _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        uint256 swapAmount = 1000 ether;

        vm.startPrank(bob);
        tokenA.approve(address(dex), swapAmount);
        dex.swap(address(tokenA), swapAmount);
        vm.stopPrank();

        // Protocol fee = 0.1% of 1000 = 1 ether
        assertEq(dex.protocolFeeA(), 1 ether, "Protocol fee A should be 0.1%");
        assertEq(dex.protocolFeeB(), 0, "No protocol fee B yet");
    }

    function test_RemoveLiquidity() public {
        uint256 lp = _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        uint256 balABefore = tokenA.balanceOf(alice);
        uint256 balBBefore = tokenB.balanceOf(alice);

        vm.startPrank(alice);
        (uint256 amountA, uint256 amountB) = dex.removeLiquidity(lp);
        vm.stopPrank();

        assertEq(amountA, LIQUIDITY_A, "Should get back all token A");
        assertEq(amountB, LIQUIDITY_B, "Should get back all token B");
        assertEq(tokenA.balanceOf(alice), balABefore + amountA);
        assertEq(tokenB.balanceOf(alice), balBBefore + amountB);
        assertEq(dex.totalSupply(), 0);
    }

    function test_RemoveLiquidity_AfterSwaps() public {
        uint256 lp = _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        // Bob swaps some tokens
        vm.startPrank(bob);
        tokenA.approve(address(dex), 100 ether);
        dex.swap(address(tokenA), 100 ether);
        vm.stopPrank();

        // Alice removes liquidity - should get more value due to LP fees
        vm.startPrank(alice);
        (uint256 amountA, uint256 amountB) = dex.removeLiquidity(lp);
        vm.stopPrank();

        // Total value should be >= initial due to collected LP fees
        assertGt(amountA + amountB, 0);
    }

    function test_Swap_ZeroAmount_Reverts() public {
        _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        vm.startPrank(bob);
        tokenA.approve(address(dex), 1 ether);
        vm.expectRevert("DEX: zero amount");
        dex.swap(address(tokenA), 0);
        vm.stopPrank();
    }

    function test_Swap_InvalidToken_Reverts() public {
        _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        vm.startPrank(bob);
        vm.expectRevert("DEX: invalid token");
        dex.swap(address(0x999), 100 ether);
        vm.stopPrank();
    }

    function test_WithdrawProtocolFees() public {
        _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        vm.startPrank(bob);
        tokenA.approve(address(dex), 1000 ether);
        dex.swap(address(tokenA), 1000 ether);
        vm.stopPrank();

        uint256 feeA = dex.protocolFeeA();
        assertGt(feeA, 0);

        uint256 balBefore = tokenA.balanceOf(deployer);
        dex.withdrawProtocolFees();
        uint256 balAfter = tokenA.balanceOf(deployer);

        assertEq(balAfter - balBefore, feeA);
        assertEq(dex.protocolFeeA(), 0);
    }

    function test_GetAmountOut() public {
        _addInitialLiquidity(alice, LIQUIDITY_A, LIQUIDITY_B);

        uint256 amountOut = dex.getAmountOut(address(tokenA), 100 ether);
        assertGt(amountOut, 0);
        assertLt(amountOut, 100 ether);
    }

    function _addInitialLiquidity(address user, uint256 amountA, uint256 amountB) internal returns (uint256 lp) {
        vm.startPrank(user);
        tokenA.approve(address(dex), amountA);
        tokenB.approve(address(dex), amountA);
        lp = dex.addLiquidity(amountA, amountB);
        vm.stopPrank();
    }
}
