export const BALANCE_READER_ABI = [
  {
    inputs: [
      {
        internalType: "address[]",
        name: "addresses",
        type: "address[]",
      },
    ],
    name: "getNativeBalances",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const IERC20_ABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const MESSAGE_EMITTER_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "emitter",
        type: "address",
      },
    ],
    name: "getLastMessage",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "emitter",
        type: "address",
      },
    ],
    name: "getLastMessageInput",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "emitter",
            type: "address",
          },
        ],
        internalType: "struct MessageEmitter.GetLastMessageInput",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const RESERVE_MANAGER_ABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "totalMinted",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalReserve",
            type: "uint256",
          },
        ],
        internalType: "struct ReserveManager.UpdateReserves",
        name: "updateReserves",
        type: "tuple",
      },
    ],
    name: "writeReportFromUpdateReserves",
    outputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "txHash",
            type: "bytes32",
          },
        ],
        internalType:
          "struct ReserveManager.WriteReportFromUpdateReservesOutput",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
