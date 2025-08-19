import { describe, it, expect, beforeEach } from "vitest";

interface MockContract {
  admin: string;
  paused: boolean;
  totalSupply: bigint;
  nextMintId: bigint;
  balances: Map<string, bigint>;
  minters: Map<string, boolean>;
  blacklist: Map<string, boolean>;
  supplyPerSource: Map<string, bigint>;
  totalCarbon: bigint;
  mintEvents: Map<bigint, {
    minter: string;
    recipient: string;
    amount: bigint;
    source: string;
    carbonFootprint: bigint;
    blockHeight: bigint;
  }>;
  MAX_SUPPLY: bigint;

  isAdmin(caller: string): boolean;
  isMinter(caller: string): boolean;
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  addMinter(caller: string, newMinter: string): { value: boolean } | { error: number };
  removeMinter(caller: string, oldMinter: string): { value: boolean } | { error: number };
  blacklistAddress(caller: string, target: string): { value: boolean } | { error: number };
  unblacklistAddress(caller: string, target: string): { value: boolean } | { error: number };
  mint(
    caller: string,
    recipient: string,
    amount: bigint,
    source: string,
    carbonFootprint: bigint
  ): { value: boolean } | { error: number };
  burn(caller: string, amount: bigint): { value: boolean } | { error: number };
  transfer(caller: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  adminTransfer(caller: string, from: string, to: string, amount: bigint): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  totalSupply: 0n,
  nextMintId: 0n,
  balances: new Map<string, bigint>(),
  minters: new Map<string, boolean>(),
  blacklist: new Map<string, boolean>(),
  supplyPerSource: new Map<string, bigint>(),
  totalCarbon: 0n,
  mintEvents: new Map<bigint, { minter: string; recipient: string; amount: bigint; source: string; carbonFootprint: bigint; blockHeight: bigint }>(),
  MAX_SUPPLY: 1000000000000n,

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  isMinter(caller: string) {
    return this.minters.get(caller) ?? false;
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  addMinter(caller: string, newMinter: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.minters.set(newMinter, true);
    return { value: true };
  },

  removeMinter(caller: string, oldMinter: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.minters.delete(oldMinter);
    return { value: true };
  },

  blacklistAddress(caller: string, target: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.blacklist.set(target, true);
    return { value: true };
  },

  unblacklistAddress(caller: string, target: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.blacklist.delete(target);
    return { value: true };
  },

  mint(caller: string, recipient: string, amount: bigint, source: string, carbonFootprint: bigint) {
    if (this.paused) return { error: 103 };
    if (!this.isMinter(caller)) return { error: 107 };
    if (amount <= 0n) return { error: 105 };
    if (source.length === 0) return { error: 106 };
    if (this.blacklist.get(recipient) ?? false) return { error: 108 };
    if (this.totalSupply + amount > this.MAX_SUPPLY) return { error: 102 };
    const currentBalance = this.balances.get(recipient) ?? 0n;
    this.balances.set(recipient, currentBalance + amount);
    this.totalSupply += amount;
    const currentSupplySource = this.supplyPerSource.get(source) ?? 0n;
    this.supplyPerSource.set(source, currentSupplySource + amount);
    this.totalCarbon += carbonFootprint * BigInt(amount);
    const mintId = this.nextMintId;
    this.mintEvents.set(mintId, {
      minter: caller,
      recipient,
      amount,
      source,
      carbonFootprint,
      blockHeight: 100n, // Mock block height
    });
    this.nextMintId += 1n;
    return { value: true };
  },

  burn(caller: string, amount: bigint) {
    if (this.paused) return { error: 103 };
    if (amount <= 0n) return { error: 105 };
    const balance = this.balances.get(caller) ?? 0n;
    if (balance < amount) return { error: 101 };
    this.balances.set(caller, balance - amount);
    this.totalSupply -= amount;
    return { value: true };
  },

  transfer(caller: string, recipient: string, amount: bigint) {
    if (this.paused) return { error: 103 };
    if (this.blacklist.get(caller) ?? false) return { error: 108 };
    if (this.blacklist.get(recipient) ?? false) return { error: 108 };
    if (amount <= 0n) return { error: 105 };
    const senderBalance = this.balances.get(caller) ?? 0n;
    if (senderBalance < amount) return { error: 101 };
    this.balances.set(caller, senderBalance - amount);
    const recipientBalance = this.balances.get(recipient) ?? 0n;
    this.balances.set(recipient, recipientBalance + amount);
    return { value: true };
  },

  adminTransfer(caller: string, from: string, to: string, amount: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (amount <= 0n) return { error: 105 };
    const fromBalance = this.balances.get(from) ?? 0n;
    if (fromBalance < amount) return { error: 101 };
    this.balances.set(from, fromBalance - amount);
    const toBalance = this.balances.get(to) ?? 0n;
    this.balances.set(to, toBalance + amount);
    return { value: true };
  },
};

describe("EnerGridX Energy Token", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.totalSupply = 0n;
    mockContract.nextMintId = 0n;
    mockContract.balances = new Map();
    mockContract.minters = new Map();
    mockContract.blacklist = new Map();
    mockContract.supplyPerSource = new Map();
    mockContract.totalCarbon = 0n;
    mockContract.mintEvents = new Map();
  });

  it("should allow admin to add and remove minters", () => {
    const minter = "ST2CY5V39NHDP5PWEEDAHR9H0YETWQGYDXMHD4R2Q";
    const resultAdd = mockContract.addMinter(mockContract.admin, minter);
    expect(resultAdd).toEqual({ value: true });
    expect(mockContract.minters.get(minter)).toBe(true);

    const resultRemove = mockContract.removeMinter(mockContract.admin, minter);
    expect(resultRemove).toEqual({ value: true });
    expect(mockContract.minters.get(minter)).toBeUndefined();
  });

  it("should mint tokens with metadata when called by authorized minter", () => {
    const minter = "ST2CY5V39NHDP5PWEEDAHR9H0YETWQGYDXMHD4R2Q";
    const recipient = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP";
    mockContract.addMinter(mockContract.admin, minter);
    const result = mockContract.mint(minter, recipient, 1000n, "solar", 50n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get(recipient)).toBe(1000n);
    expect(mockContract.totalSupply).toBe(1000n);
    expect(mockContract.supplyPerSource.get("solar")).toBe(1000n);
    expect(mockContract.totalCarbon).toBe(50n * 1000n);
    expect(mockContract.mintEvents.get(0n)).toEqual({
      minter,
      recipient,
      amount: 1000n,
      source: "solar",
      carbonFootprint: 50n,
      blockHeight: 100n,
    });
  });

  it("should prevent minting if not minter", () => {
    const result = mockContract.mint("ST2CY5...", "ST3NB...", 1000n, "solar", 50n);
    expect(result).toEqual({ error: 107 });
  });

  it("should prevent minting over max supply", () => {
    const minter = "ST2CY5V39NHDP5PWEEDAHR9H0YETWQGYDXMHD4R2Q";
    mockContract.addMinter(mockContract.admin, minter);
    const result = mockContract.mint(minter, "ST3NB...", 2000000000000n, "solar", 50n);
    expect(result).toEqual({ error: 102 });
  });

  it("should transfer tokens", () => {
    const minter = "ST2CY5V39NHDP5PWEEDAHR9H0YETWQGYDXMHD4R2Q";
    const sender = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP";
    const recipient = "ST4QY9HV9HJ2JMB926V22XJDACRQTS4GXPXP3GRS";
    mockContract.addMinter(mockContract.admin, minter);
    mockContract.mint(minter, sender, 500n, "wind", 30n);
    const result = mockContract.transfer(sender, recipient, 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get(sender)).toBe(300n);
    expect(mockContract.balances.get(recipient)).toBe(200n);
  });

  it("should burn tokens", () => {
    const minter = "ST2CY5V39NHDP5PWEEDAHR9H0YETWQGYDXMHD4R2Q";
    const burner = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP";
    mockContract.addMinter(mockContract.admin, minter);
    mockContract.mint(minter, burner, 500n, "solar", 50n);
    const result = mockContract.burn(burner, 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get(burner)).toBe(300n);
    expect(mockContract.totalSupply).toBe(300n);
  });

  it("should allow admin to force transfer", () => {
    const minter = "ST2CY5V39NHDP5PWEEDAHR9H0YETWQGYDXMHD4R2Q";
    const from = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP";
    const to = "ST4QY9HV9HJ2JMB926V22XJDACRQTS4GXPXP3GRS";
    mockContract.addMinter(mockContract.admin, minter);
    mockContract.mint(minter, from, 500n, "solar", 50n);
    const result = mockContract.adminTransfer(mockContract.admin, from, to, 300n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get(from)).toBe(200n);
    expect(mockContract.balances.get(to)).toBe(300n);
  });

  it("should prevent transfers when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const result = mockContract.transfer("ST3NB...", "ST4QY...", 10n);
    expect(result).toEqual({ error: 103 });
  });

  it("should prevent transfers if sender or recipient blacklisted", () => {
    const minter = "ST2CY5V39NHDP5PWEEDAHR9H0YETWQGYDXMHD4R2Q";
    const sender = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP";
    const recipient = "ST4QY9HV9HJ2JMB926V22XJDACRQTS4GXPXP3GRS";
    mockContract.addMinter(mockContract.admin, minter);
    mockContract.mint(minter, sender, 500n, "solar", 50n);
    mockContract.blacklistAddress(mockContract.admin, sender);
    const resultSenderBlack = mockContract.transfer(sender, recipient, 200n);
    expect(resultSenderBlack).toEqual({ error: 108 });
    mockContract.unblacklistAddress(mockContract.admin, sender);
    mockContract.blacklistAddress(mockContract.admin, recipient);
    const resultRecipientBlack = mockContract.transfer(sender, recipient, 200n);
    expect(resultRecipientBlack).toEqual({ error: 108 });
  });

  it("should prevent minting to blacklisted recipient", () => {
    const minter = "ST2CY5V39NHDP5PWEEDAHR9H0YETWQGYDXMHD4R2Q";
    const recipient = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP";
    mockContract.addMinter(mockContract.admin, minter);
    mockContract.blacklistAddress(mockContract.admin, recipient);
    const result = mockContract.mint(minter, recipient, 1000n, "solar", 50n);
    expect(result).toEqual({ error: 108 });
  });
});