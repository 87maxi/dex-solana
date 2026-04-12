// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "./ERC20.sol";

contract TokenB is ERC20 {
    constructor() ERC20("Token B", "TB", 18) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
