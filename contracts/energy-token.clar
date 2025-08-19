;; EnerGridX Energy Token Contract
;; Clarity v2
;; Implements minting with metadata, burning, transferring, admin controls, multi-minter support, and production tracking
;; Tokens represent energy units (kWh) with associated metadata for source and carbon footprint
;; Sophisticated features: authorized minters, mint events logging, total supply per source, average carbon calculation, pause functionality

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-BALANCE u101)
(define-constant ERR-MAX-SUPPLY-REACHED u102)
(define-constant ERR-PAUSED u103)
(define-constant ERR-ZERO-ADDRESS u104)
(define-constant ERR-INVALID-AMOUNT u105)
(define-constant ERR-INVALID-SOURCE u106)
(define-constant ERR-NOT-MINTER u107)
(define-constant ERR-BLACKLISTED u108)

;; Token metadata constants
(define-constant TOKEN-NAME "EnerGridX Energy Token")
(define-constant TOKEN-SYMBOL "EGXE")
(define-constant TOKEN-DECIMALS u6) ;; Allows for fractional kWh (e.g., Wh)
(define-constant MAX-SUPPLY u1000000000000) ;; 1T tokens (arbitrary large supply for energy units)

;; Admin and contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var total-supply uint u0)
(define-data-var next-mint-id uint u0)

;; Balances map
(define-map balances principal uint)

;; Minters authorization map (principals allowed to mint)
(define-map minters principal bool)

;; Blacklist map (prevent certain addresses from transfers)
(define-map blacklist principal bool)

;; Mint events map for tracking production metadata
(define-map mint-events uint {
  minter: principal,
  recipient: principal,
  amount: uint,
  source: (string-ascii 32),
  carbon-footprint: int, ;; grams CO2 per kWh, can be negative for green energy
  block-height: uint
})

;; Total supply per energy source
(define-map supply-per-source (string-ascii 32) uint)

;; Cumulative carbon footprint (total carbon for all minted tokens)
(define-data-var total-carbon int 0)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: is-minter (checks if caller is authorized minter)
(define-private (is-minter)
  (default-to false (map-get? minters tx-sender))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: ensure not blacklisted
(define-private (ensure-not-blacklisted (account principal))
  (asserts! (not (default-to false (map-get? blacklist account))) (err ERR-BLACKLISTED))
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause the contract (affects transfers and mints)
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Add a minter
(define-public (add-minter (new-minter principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-minter 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (map-set minters new-minter true)
    (ok true)
  )
)

;; Remove a minter
(define-public (remove-minter (old-minter principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (map-delete minters old-minter)
    (ok true)
  )
)

;; Blacklist an address
(define-public (blacklist-address (target principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (map-set blacklist target true)
    (ok true)
  )
)

;; Unblacklist an address
(define-public (unblacklist-address (target principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (map-delete blacklist target)
    (ok true)
  )
)

;; Mint new tokens with metadata (called by authorized minters, integrates with oracle for verification)
(define-public (mint (recipient principal) (amount uint) (source (string-ascii 32)) (carbon-footprint int))
  (begin
    (ensure-not-paused)
    (asserts! (is-minter) (err ERR-NOT-MINTER))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (asserts! (> (len source) u0) (err ERR-INVALID-SOURCE))
    (ensure-not-blacklisted recipient)
    (let ((new-supply (+ (var-get total-supply) amount)))
      (asserts! (<= new-supply MAX-SUPPLY) (err ERR-MAX-SUPPLY-REACHED))
      ;; Update balances
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      ;; Update total supply
      (var-set total-supply new-supply)
      ;; Update supply per source
      (map-set supply-per-source source (+ amount (default-to u0 (map-get? supply-per-source source))))
      ;; Update total carbon
      (var-set total-carbon (+ (var-get total-carbon) (* carbon-footprint (to-int amount))))
      ;; Log mint event
      (let ((mint-id (var-get next-mint-id)))
        (map-set mint-events mint-id {
          minter: tx-sender,
          recipient: recipient,
          amount: amount,
          source: source,
          carbon-footprint: carbon-footprint,
          block-height: block-height
        })
        (var-set next-mint-id (+ mint-id u1))
        ;; Print event for indexing
        (print {
          event: "mint",
          minter: tx-sender,
          recipient: recipient,
          amount: amount,
          source: source,
          carbon-footprint: carbon-footprint,
          mint-id: mint-id
        })
      )
      (ok true)
    )
  )
)

;; Burn tokens (reduces supply, but does not adjust metadata as it's irreversible)
(define-public (burn (amount uint))
  (begin
    (ensure-not-paused)
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
      (map-set balances tx-sender (- balance amount))
      (var-set total-supply (- (var-get total-supply) amount))
      ;; Print burn event
      (print {
        event: "burn",
        burner: tx-sender,
        amount: amount
      })
      (ok true)
    )
  )
)

;; Transfer tokens
(define-public (transfer (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (ensure-not-blacklisted tx-sender)
    (ensure-not-blacklisted recipient)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((sender-balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= sender-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- sender-balance amount))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      ;; Print transfer event
      (print {
        event: "transfer",
        from: tx-sender,
        to: recipient,
        amount: amount
      })
      (ok true)
    )
  )
)

;; Admin force transfer (for emergencies, e.g., lost keys)
(define-public (admin-transfer (from principal) (to principal) (amount uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq to 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((from-balance (default-to u0 (map-get? balances from))))
      (asserts! (>= from-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances from (- from-balance amount))
      (map-set balances to (+ amount (default-to u0 (map-get? balances to))))
      ;; Print admin transfer event
      (print {
        event: "admin-transfer",
        admin: tx-sender,
        from: from,
        to: to,
        amount: amount
      })
      (ok true)
    )
  )
)

;; Read-only: get balance
(define-read-only (get-balance (account principal))
  (default-to u0 (map-get? balances account))
)

;; Read-only: get total supply
(define-read-only (get-total-supply)
  (var-get total-supply)
)

;; Read-only: get admin
(define-read-only (get-admin)
  (var-get admin)
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (var-get paused)
)

;; Read-only: check if minter
(define-read-only (check-is-minter (account principal))
  (default-to false (map-get? minters account))
)

;; Read-only: check if blacklisted
(define-read-only (check-is-blacklisted (account principal))
  (default-to false (map-get? blacklist account))
)

;; Read-only: get supply per source
(define-read-only (get-supply-per-source (source (string-ascii 32)))
  (default-to u0 (map-get? supply-per-source source))
)

;; Read-only: get average carbon footprint (total carbon / total supply)
(define-read-only (get-average-carbon-footprint)
  (if (> (var-get total-supply) u0)
    (/ (var-get total-carbon) (to-int (var-get total-supply)))
    0)
)

;; Read-only: get mint event by id
(define-read-only (get-mint-event (mint-id uint))
  (map-get? mint-events mint-id)
)

;; Read-only: get next mint id
(define-read-only (get-next-mint-id)
  (var-get next-mint-id)
)

;; Read-only: get token name
(define-read-only (get-name)
  TOKEN-NAME
)

;; Read-only: get token symbol
(define-read-only (get-symbol)
  TOKEN-SYMBOL
)

;; Read-only: get token decimals
(define-read-only (get-decimals)
  TOKEN-DECIMALS
)

;; Read-only: get total carbon
(define-read-only (get-total-carbon)
  (var-get total-carbon)
)