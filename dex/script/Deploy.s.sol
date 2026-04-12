// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {TokenA} from "../src/TokenA.sol";
import {TokenB} from "../src/TokenB.sol";
import {DEX} from "../src/DEX.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        vm.startBroadcast(deployerPrivateKey);

        TokenA tokenA = new TokenA();
        TokenB tokenB = new TokenB();
        DEX dex = new DEX(address(tokenA), address(tokenB));

        // Anvil default accounts
        address[10] memory accounts = [
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
            0x90F79bf6EB2c4f870365E785982E1f101E93b906,
            0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,
            0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc,
            0x976EA74026E726554dB657fA54763abd0C3a0aa9,
            0x14dc79964da2C08Da15abD6791e02835403d2614,
            0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f,
            0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
        ];

        uint256 mintAmount = 10000 ether;

        for (uint256 i = 0; i < accounts.length; i++) {
            tokenA.mint(accounts[i], mintAmount);
            tokenB.mint(accounts[i], mintAmount);
        }

        vm.stopBroadcast();

        console.log("TokenA deployed at:", address(tokenA));
        console.log("TokenB deployed at:", address(tokenB));
        console.log("DEX deployed at:", address(dex));
    }
}
