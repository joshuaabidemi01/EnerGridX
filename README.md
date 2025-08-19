# EnerGridX

A decentralized peer-to-peer energy trading platform for urban microgrids, enabling prosumers (producers and consumers) to trade excess renewable energy directly on-chain, reducing reliance on centralized utilities, promoting sustainability, and optimizing costs through transparent, automated transactions.

---

## Overview

EnerGridX consists of four main smart contracts that together form a secure, efficient, and community-driven ecosystem for energy trading in urban microgrids:

1. **Energy Token Contract** – Issues and manages tokens representing units of energy (e.g., kWh).
2. **P2P Trading Marketplace Contract** – Facilitates bids, offers, and automated matching for energy trades.
3. **Settlement and Escrow Contract** – Handles secure fund escrows, energy delivery verification, and automated payouts.
4. **Oracle Integration Contract** – Connects with off-chain metering devices for real-time energy production, consumption, and verification data.

---

## Features

- **Tokenized energy credits** for seamless representation and transfer of energy units  
- **Peer-to-peer marketplace** with automated bid/offer matching and price discovery  
- **Secure escrow mechanisms** to ensure trustless trades and prevent disputes  
- **Real-time data integration** via oracles for accurate metering and settlement  
- **Transparent transaction logs** for auditability and regulatory compliance  
- **Low-cost trading** by eliminating intermediaries in urban microgrids  
- **Sustainability incentives** through rewards for renewable energy contributions  

---

## Smart Contracts

### Energy Token Contract
- Mint and burn energy tokens based on verified production (via oracle)
- Transfer tokens between users for trades or direct sales
- Token metadata for tracking energy source (e.g., solar, wind) and carbon footprint

### P2P Trading Marketplace Contract
- Create and manage buy/sell orders with price, quantity, and time constraints
- Automated order matching using simple auction or matching logic
- Event emissions for trade executions and cancellations

### Settlement and Escrow Contract
- Lock funds (e.g., stablecoins) in escrow during trades
- Verify energy delivery through oracle data before releasing payments
- Dispute resolution timeouts and automated refunds for failed deliveries

### Oracle Integration Contract
- Secure queries to external APIs or IoT devices for energy meter readings
- Validate and push off-chain data (production, consumption) on-chain
- Timestamped updates for real-time grid balancing and trade verification

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/energridx.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete peer-to-peer energy trading experience.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License
