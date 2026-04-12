// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "./ERC20.sol";

contract DEX is ERC20 {
    ERC20 public tokenA;
    ERC20 public tokenB;
    address public owner;

    uint256 public constant TOTAL_FEE = 30; // 0.3% = 30/10000
    uint256 public constant PROTOCOL_FEE = 10; // 0.1% = 10/10000
    uint256 public constant LP_FEE = 20; // 0.2% = 20/10000
    uint256 public constant FEE_DENOMINATOR = 10000;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public protocolFeeA;
    uint256 public protocolFeeB;

    event Swap(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event AddLiquidity(address indexed user, uint256 amountA, uint256 amountB, uint256 lpMinted);
    event RemoveLiquidity(address indexed user, uint256 lpBurned, uint256 amountA, uint256 amountB);

    constructor(address _tokenA, address _tokenB) ERC20("DEX LP Token", "DEX-LP", 18) {
        tokenA = ERC20(_tokenA);
        tokenB = ERC20(_tokenB);
        owner = msg.sender;
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 lpMinted) {
        require(amountA > 0 && amountB > 0, "DEX: zero amount");

        if (totalSupply == 0) {
            lpMinted = sqrt(amountA * amountB);
            require(lpMinted > 0, "DEX: insufficient initial liquidity");
        } else {
            uint256 lpFromA = (amountA * totalSupply) / reserveA;
            uint256 lpFromB = (amountB * totalSupply) / reserveB;
            lpMinted = lpFromA < lpFromB ? lpFromA : lpFromB;
        }

        require(lpMinted > 0, "DEX: insufficient liquidity minted");

        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        reserveA += amountA;
        reserveB += amountB;

        _mint(msg.sender, lpMinted);
        emit AddLiquidity(msg.sender, amountA, amountB, lpMinted);
    }

    function removeLiquidity(uint256 lpAmount) external returns (uint256 amountA, uint256 amountB) {
        require(lpAmount > 0, "DEX: zero amount");
        require(balanceOf[msg.sender] >= lpAmount, "DEX: insufficient LP balance");

        amountA = (lpAmount * reserveA) / totalSupply;
        amountB = (lpAmount * reserveB) / totalSupply;

        require(amountA > 0 && amountB > 0, "DEX: insufficient liquidity burned");

        _burn(msg.sender, lpAmount);

        reserveA -= amountA;
        reserveB -= amountB;

        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);

        emit RemoveLiquidity(msg.sender, lpAmount, amountA, amountB);
    }

    function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut) {
        require(amountIn > 0, "DEX: zero amount");
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "DEX: invalid token");

        bool isAtoB = tokenIn == address(tokenA);
        (ERC20 inputToken, ERC20 outputToken, uint256 reserveIn, uint256 reserveOut) = isAtoB
            ? (tokenA, tokenB, reserveA, reserveB)
            : (tokenB, tokenA, reserveB, reserveA);

        inputToken.transferFrom(msg.sender, address(this), amountIn);

        // Calculate fees
        uint256 protocolFeeAmount = (amountIn * PROTOCOL_FEE) / FEE_DENOMINATOR;
        uint256 lpFeeAmount = (amountIn * LP_FEE) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - protocolFeeAmount - lpFeeAmount;

        // Track protocol fees
        if (isAtoB) {
            protocolFeeA += protocolFeeAmount;
        } else {
            protocolFeeB += protocolFeeAmount;
        }

        // x * y = k (constant product formula)
        // LP fee stays in reserves (increases k for LPs)
        uint256 newReserveIn = reserveIn + amountInAfterFee + lpFeeAmount;
        amountOut = reserveOut - (reserveIn * reserveOut) / newReserveIn;

        require(amountOut > 0, "DEX: insufficient output");

        if (isAtoB) {
            reserveA = newReserveIn + protocolFeeAmount;
            reserveB -= amountOut;
        } else {
            reserveB = newReserveIn + protocolFeeAmount;
            reserveA -= amountOut;
        }

        outputToken.transfer(msg.sender, amountOut);

        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
    }

    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(amountIn > 0, "DEX: zero amount");
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "DEX: invalid token");

        bool isAtoB = tokenIn == address(tokenA);
        (uint256 reserveIn, uint256 reserveOut) = isAtoB
            ? (reserveA, reserveB)
            : (reserveB, reserveA);

        if (reserveIn == 0 || reserveOut == 0) return 0;

        uint256 protocolFeeAmount = (amountIn * PROTOCOL_FEE) / FEE_DENOMINATOR;
        uint256 lpFeeAmount = (amountIn * LP_FEE) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - protocolFeeAmount - lpFeeAmount;

        uint256 newReserveIn = reserveIn + amountInAfterFee + lpFeeAmount;
        amountOut = reserveOut - (reserveIn * reserveOut) / newReserveIn;
    }

    function withdrawProtocolFees() external {
        require(msg.sender == owner, "DEX: not owner");
        uint256 feeA = protocolFeeA;
        uint256 feeB = protocolFeeB;
        protocolFeeA = 0;
        protocolFeeB = 0;

        if (feeA > 0) {
            reserveA -= feeA;
            tokenA.transfer(owner, feeA);
        }
        if (feeB > 0) {
            reserveB -= feeB;
            tokenB.transfer(owner, feeB);
        }
    }

    function sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        z = x;
        uint256 y = x / 2 + 1;
        while (y < z) {
            z = y;
            y = (x / y + y) / 2;
        }
    }
}
