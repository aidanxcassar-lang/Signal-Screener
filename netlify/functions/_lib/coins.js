/* Editorial content. Researched and hand-written, never generated.
 *
 * Every entry here was verified against current sources at the time of writing. Writing
 * these from memory produced materially wrong claims: an early Hyperliquid draft called
 * competition a hypothetical risk when market share had already fallen from 71% to 20%,
 * and a Zcash draft omitted a four-year vulnerability found in its shielded pool.
 *
 * Rules:
 *   - `bull` and `bear` both required. A page with only a bull case reads as promotional,
 *     which undermines the positioning and weakens the "not investment research" position.
 *   - Written for a beginner. No jargon without explaining it in the same sentence.
 *   - No price targets, no predictions, no "will".
 *   - `reviewedISO` is when the facts were last checked. Review when the Quality score
 *     drifts more than 1.5 points from `publishedScore`.
 */

/* Inline SVG mark per coin. Rendered server-side, so no image request and nothing to break. */
/* Stable CoinGecko CDN paths. Hardcoded rather than fetched: a rate limit on the live call
   left every report showing the fallback letter-mark instead of a real logo. */
export const LOGOS = {
  bitcoin:     'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  ethereum:    'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  solana:      'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  xrp:         'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
  chainlink:   'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  aave:        'https://assets.coingecko.com/coins/images/12645/large/aave-token-round.png',
  zcash:       'https://assets.coingecko.com/coins/images/486/large/circle-zcash-color.png',
  hyperliquid: 'https://assets.coingecko.com/coins/images/50882/large/hyperliquid.jpg'
};

export const MARKS = {
  aave:        { bg: '#B6509E', fg: '#FFFFFF', text: 'AAVE' },

  hyperliquid: { bg: '#97FCE4', fg: '#0B3B33', text: 'HYPE' },
  zcash:       { bg: '#F4B728', fg: '#231F20', text: 'ZEC'  },
  xrp:         { bg: '#23292F', fg: '#FFFFFF', text: 'XRP'  },
  bitcoin:     { bg: '#F7931A', fg: '#FFFFFF', text: 'BTC'  },
  solana:      { bg: '#14F195', fg: '#0A2E23', text: 'SOL'  },
  ethereum:    { bg: '#627EEA', fg: '#FFFFFF', text: 'ETH'  },
  chainlink:   { bg: '#2A5ADA', fg: '#FFFFFF', text: 'LINK' }
};
export function markSVG(slug, size = 44) {
  const m = MARKS[slug] || { bg: '#5B6AF0', fg: '#FFFFFF', text: (slug || '?').slice(0, 4).toUpperCase() };
  const fs = m.text.length >= 4 ? size * 0.26 : size * 0.34;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${m.text} logo">
    <rect width="${size}" height="${size}" rx="${size * 0.28}" fill="${m.bg}"/>
    <text x="50%" y="50%" dy="0.36em" text-anchor="middle" fill="${m.fg}"
      font-family="Inter,system-ui,sans-serif" font-weight="700" font-size="${fs}"
      letter-spacing="-0.02em">${m.text}</text>
  </svg>`;
}

export const SECTORS = {
  'perp-dex': {
    name: 'Perpetual DEXs', slug: 'perp-dex',
    what: `A perpetual future is a bet on a price that never expires. Traders use them to go long or short with borrowed money, and they are the single largest product in crypto by volume. For years this was the preserve of centralised exchanges, where you hand over your coins and trust the company holding them. A perpetual DEX runs the same product on a public blockchain, so you keep custody of your own funds and anyone can audit the order book.`,
    why: `Two things make the category worth watching. Traders had a very concrete lesson in 2022 about what happens when a centralised exchange fails while holding customer funds. And unlike most of crypto, this is a business where customers voluntarily pay fees for a service, which means revenue is real money rather than newly printed tokens.`,
    watch: `How much of the fee revenue actually reaches token holders rather than being shared with third parties, how much supply is still locked and due to be released, and whether trading volume survives once incentive programmes stop paying users to show up.`
  },
  layer1: {
    name: 'Base layer networks', slug: 'layer1',
    what: `A base layer network is the foundation everything else is built on. It keeps the record of who owns what, and it is maintained by thousands of independent computers rather than one company. Because no single party controls it, changing the rules requires broad agreement, which makes these networks slow to change but very hard to shut down.`,
    why: `These are the assets institutions reach for first. They have the longest track records, the deepest trading, and the clearest regulatory position, which is why exchange-traded funds arrived here before anywhere else. When money leaves crypto it usually leaves everything except these; when it returns, it usually arrives here first.`,
    watch: `Whether the money arriving through regulated funds keeps arriving, since that has become the main source of demand. Also how much of the network's value depends on adoption versus on interest rates and the wider mood in markets.`
  },
  oracles: {
    name: 'Oracles and interoperability', slug: 'oracles',
    what: `A blockchain cannot see outside itself. It does not know the price of gold, whether a payment cleared, or what another blockchain is doing. An oracle is the bridge: a network that fetches outside information, checks it against many independent sources, and delivers it in a form the blockchain can trust. Interoperability tools do the same job between chains, letting value and data move safely from one to another.`,
    why: `Nothing else in crypto works without this. Every lending market needs a price, every tokenised asset needs proof it exists, and every cross-chain transfer needs a trustworthy messenger. It is also where the largest traditional institutions have chosen to experiment first, because it is infrastructure rather than speculation.`,
    watch: `Whether adoption by institutions actually turns into money for token holders. Being essential infrastructure and capturing value from it are two different things, and the gap between them is the central question in this category.`
  },
  lending: {
    name: 'Lending protocols', slug: 'lending',
    what: `A lending protocol is a pool of money that anyone can put coins into or borrow from, run entirely by software instead of a bank. Depositors earn interest. Borrowers must first lock up something worth more than they want to borrow, so the pool is protected if prices fall. If a borrower's collateral drops too low, the software sells it automatically to repay the loan.`,
    why: `This is the closest thing crypto has to a boring, useful business. It earns fees from people who want a service, it has been running for years through several crashes, and the numbers are all public. It is also the plumbing that a lot of the rest of crypto sits on top of.`,
    watch: `How much money is deposited, because revenue follows deposits. Also whether the automatic sell-off mechanism keeps working cleanly during sharp falls, since that is what protects everyone in the pool.`
  },
  payments: {
    name: 'Payments and settlement', slug: 'payments',
    what: `Sending money between countries is slow and expensive because it passes through a chain of banks, each taking a cut and a day. Payment blockchains try to replace that chain with a single network where a transfer settles in seconds for a fraction of a penny. The coin itself is often used as a bridge: instead of finding someone who wants to swap pounds directly for pesos, you swap pounds to the coin and the coin to pesos.`,
    why: `This is one of the few crypto ideas with an obvious customer. Banks and payment firms already spend billions moving money across borders, and they have a clear reason to want it cheaper. It is also the corner of crypto where regulators have engaged most seriously, which cuts both ways.`,
    watch: `Whether real institutions actually route volume through the network rather than merely announcing partnerships, and whether the legal position holds up, since payments is the most heavily supervised area of finance.`
  },
  privacy: {
    name: 'Privacy coins', slug: 'privacy',
    what: `Most blockchains are public ledgers. Anyone can look up an address and see its entire balance and history forever. Privacy coins use cryptography to hide the sender, the receiver and the amount, while still letting the network prove no one is spending money they do not have. Zcash does this with zero-knowledge proofs, a technique that proves a statement is true without revealing the information behind it.`,
    why: `The case has shifted from ideological to practical. As tax authorities, employers and analytics firms get better at linking wallet addresses to real people, ordinary users who have nothing to hide still have reasons not to publish their salary and net worth. The counter-pressure is equally real: privacy tools attract regulatory attention, and several exchanges have delisted privacy coins in some jurisdictions.`,
    watch: `The share of supply actually held in private form, rather than the price, is the honest adoption signal. Also watch exchange delistings and regulatory rulings, which decide whether ordinary people can access the asset at all.`
  }
};

export const COINS = {
bitcoin: {
    slug: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', sector: 'layer1',
    publishedISO: '2026-09-01', reviewedISO: '2026-09-01',
    publishedPrice: 77773.08, publishedScore: 9.6,
    tagline: `The original cryptocurrency, and now the one institutions buy first through ordinary investment funds.`,
    what: `Bitcoin is a form of money that no government or company issues. Instead of a bank keeping the ledger, thousands of independent computers around the world each keep a copy and agree on it. Only 21 million coins will ever exist, and that limit is written into the rules and effectively impossible to change. That fixed supply is the whole point: nobody can print more.`,
    usedFor: `Most people hold it as a long-term store of value, the digital equivalent of gold. Some use it to move money across borders without a bank. Increasingly, institutions and companies hold it on their balance sheets, usually through regulated funds rather than by managing the coins themselves.`,
    bull: [
      `The distribution problem is solved. Wells Fargo, Bank of America and Vanguard now offer Bitcoin funds to their clients, which means ordinary savers can buy it through the account they already have.`,
      `Institutions kept buying through the fear. During a first quarter when the market's own sentiment index hit 14 out of 100, which is extreme fear, BlackRock's fund still recorded inflows on 48 of 62 trading days. That is a very different buyer from the one crypto used to have.`,
      `The regulated wrapper worked. Spot funds have taken in about $52 billion since launching, and the infrastructure built for them, meaning custody, compliance and adviser distribution, is now being extended to other assets.`,
      `It dominates its own market. Bitcoin is over half of all crypto by value, which means it is the asset that benefits first and most when money flows into the sector.`,
      `Momentum turned decisively. August 2026 delivered a gain of about 24%, one of its strongest months on record, helped by a rush of buying that forced bearish traders to close their positions.`,
      `Corporate buyers are back. The largest corporate holder ended a ten-week pause and resumed buying in late August, and weekly fund inflows have again passed a billion dollars.`
    ],
    bear: [
      `It is still well below its peak. Despite a strong summer, it trades meaningfully under the record set in October 2025, so anyone who bought the top is still waiting.`,
      `Fund flows go both ways. Between early May and late June 2026 those same funds lost more than $8 billion, and the price fell to its lowest since late 2024. The wrapper that brings money in lets it out just as fast.`,
      `It now moves with everything else. As institutional money arrived, the price became far more sensitive to interest rates, and markets currently lean towards rates going up rather than down. That removes some of the reason to hold it as a diversifier.`
    ],
    unverified: [
      ['Team quality', 'there is no company and no team, so the metric does not apply'],
      ['Protocol revenue', 'miners earn fees, but this does not accrue to holders, so there is nothing to measure'],
      ['Audit status', 'the code is open and heavily reviewed, but base-layer networks are not covered by protocol audit registries']
    ]
  },
solana: {
    slug: 'solana', name: 'Solana', ticker: 'SOL', sector: 'layer1',
    publishedISO: '2026-09-01', reviewedISO: '2026-09-01',
    publishedPrice: 102.93, publishedScore: 9.0,
    tagline: `The fastest of the large blockchains, built so that ordinary apps feel instant and cost almost nothing to use.`,
    what: `Solana is a blockchain designed around speed. Where older networks handle a handful of transactions a second and charge meaningful fees, Solana handles thousands and charges a fraction of a penny. That difference is what makes it practical to build things ordinary people would actually use, like payment apps and games, rather than only high-value financial transfers. SOL is the coin that pays for that activity and secures the network.`,
    usedFor: `Developers build apps on it because it is cheap and fast enough for everyday use. Traders use it because moving in and out costs almost nothing. Holders lock up SOL to help run the network and earn a return for doing so. Increasingly, institutions hold it through regulated funds.`,
    bull: [
      `Regulated funds arrived and money followed. Spot Solana funds launched in late 2025 and total assets passed a billion dollars, with major names including Fidelity and Bitwise running products and further filings pending.`,
      `A public company made it a treasury asset. A Nasdaq-listed firm has accumulated more than 6.9 million SOL and runs its own validator, which is a very different kind of holder from a speculator.`,
      `The performance argument is not theoretical. Fees of a fraction of a penny and near-instant settlement are the reason developers keep choosing it, and that has held through several market cycles.`,
      `It is closing the gap on the incumbent. Solana has been narrowing the valuation difference with the largest smart-contract network for several years, and the direction of travel has been consistent.`,
      `Real assets are moving onto it. Tokenised company shares and other regulated instruments have begun settling on the network, which is a use case with an obvious institutional customer.`
    ],
    bear: [
      `Speed has historically come at the cost of reliability. The network has suffered outages in its past, and any repeat would undermine exactly the argument that makes it attractive.`,
      `A large share of supply sits with early backers and insiders. That concentration means selling decisions by a small number of holders can move the price disproportionately.`,
      `Its main use is still trading. A great deal of activity is speculation rather than the everyday applications the speed is meant to enable, and if trading interest fades the activity numbers fade with it.`
    ],
    unverified: [
      ['Team quality', 'the foundation and contributors are public, but no free source rates execution or governance'],
      ['Audit status', 'shown above where DefiLlama holds a record; base-layer networks are not listed there, so nothing is claimed either way'],
      ['Validator concentration', 'stake distribution is public and the Nakamoto coefficient is published by trackers such as Solana Beach, but there is no single free feed covering every chain in a comparable form, so we do not score it']
    ]
  },

ethereum: {
    slug: 'ethereum', name: 'Ethereum', ticker: 'ETH', sector: 'layer1',
    publishedISO: '2026-09-01', reviewedISO: '2026-09-01',
    publishedPrice: 2454.23, publishedScore: 9.4,
    tagline: `The network most of crypto is actually built on, and the first to offer institutions a fund that pays a yield.`,
    what: `If Bitcoin is digital money, Ethereum is a computer that anyone can use and nobody owns. Developers publish programs to it that then run exactly as written, without a company able to change or switch them off. Most of what exists in crypto, from lending markets to stablecoins to tokenised shares, runs on Ethereum or on networks built to extend it. ETH is the coin used to pay for that computing and to secure the network.`,
    usedFor: `Developers use it as the foundation for applications. Users pay in ETH whenever they do something on the network. Holders can lock ETH up to help run it and earn a return, which is closer to earning interest than to speculation. Institutions increasingly hold it through regulated funds.`,
    bull: [
      `It became the first crypto asset to offer a yield through a regulated fund. A major asset manager launched a staked Ethereum product on Nasdaq in March 2026, which means institutions can now hold it and earn a return without touching the technology.`,
      `It is where the serious building happens. The majority of stablecoins, lending markets and tokenised real-world assets sit on Ethereum or on networks that settle back to it, which makes it very hard to displace.`,
      `Holding it pays you. Unlike most assets in crypto, staking produces an ongoing return funded by network activity rather than by issuing new tokens to newcomers.`,
      `Institutional interest has been persistent. Ethereum funds have run multi-day inflow streaks even during periods when the wider market was weak.`,
      `The infrastructure built for Bitcoin now extends to it. Custody, compliance, adviser distribution and legal frameworks already exist, so each new product takes less work than the last.`
    ],
    bear: [
      `It is a long way below its high. The asset trades far under its August 2025 peak, so patience has been required and may be required for a while yet.`,
      `Faster rivals keep taking share. Newer networks handle more activity at lower cost, and while Ethereum settles the most valuable transactions, it is not where the most transactions happen.`,
      `Its own extensions can compete with it. The networks built to make Ethereum cheaper also move activity, and the fees that come with it, off the main chain.`
    ],
    unverified: [
      ['Team quality', 'the foundation and core developers are public, but no free source rates execution or governance'],
      ['Audit status', 'base-layer networks are not covered by protocol audit registries'],
      ['Staking concentration', 'the share of stake held by the largest providers is visible on-chain but is not published in a single free comparable feed']
    ]
  },

  chainlink: {
    slug: 'chainlink', name: 'Chainlink', ticker: 'LINK', sector: 'oracles',
    publishedISO: '2026-09-01', reviewedISO: '2026-09-01',
    publishedPrice: 7.97, publishedScore: 7.8,
    tagline: `The data layer nearly every other crypto application depends on, and the one banks reached for first.`,
    what: `A blockchain cannot see the outside world. It has no idea what gold costs or whether a bank transfer cleared. Chainlink is the network that goes and finds out: it collects information from many independent sources, checks them against each other, and delivers a figure the blockchain can rely on. It also runs a system called CCIP that lets different blockchains send value and messages to each other safely. LINK is the coin used to pay for and secure that service.`,
    usedFor: `Lending markets use it to know what collateral is worth. Tokenised assets use it to prove the real thing exists. Banks use its cross-chain tools to move tokenised instruments between networks. LINK holders can lock up their coins to help secure the service and earn rewards.`,
    bull: [
      `The institutional list is unusually serious. SWIFT, JPMorgan, UBS, Mastercard, Fidelity and the DTCC, the largest securities clearinghouse in the world, have all adopted or are piloting its technology.`,
      `Cross-chain usage exploded. Transfers through CCIP grew by roughly 1,972% over a year to $7.77 billion, which is adoption rather than announcement.`,
      `Mainstream brokerages are opening access. Charles Schwab added LINK to its platform in August 2026, joining a growing list of familiar names.`,
      `Each integration makes the next one easier. Nine new integrations landed across five chains in a single week of August 2026, and every one raises the cost of choosing a competitor.`,
      `Big scheduled catalysts are lined up. Circle's institutional blockchain launches with Chainlink as its official oracle partner, and the DTCC plans to tokenise custodied assets on that infrastructure.`
    ],
    bear: [
      `Adoption has not reached the price. The infrastructure story has strengthened for years while the token has traded well below earlier highs, and that gap has persisted.`,
      `Value capture is indirect. The operators running the service earn the fees. Token holders benefit through staking rewards of under 5% and general network growth rather than a direct share of revenue.`,
      `Being essential is not the same as being scarce. Competing oracle providers exist, and infrastructure businesses tend to face pricing pressure once a market matures.`
    ],
    unverified: [
      ['Team quality', 'the company is public-facing, but no free source rates execution or governance'],
      ['Audit status', 'shown above from DefiLlama where a record exists'],
      ['Node operator revenue', 'fees paid to operators are not published in a free, verifiable aggregate, so the split between operators and stakers cannot be measured']
    ]
  },

  aave: {
    slug: 'aave', name: 'Aave', ticker: 'AAVE', sector: 'lending',
    publishedISO: '2026-09-01', reviewedISO: '2026-09-01',
    publishedPrice: 121.84, publishedScore: 7.2,
    tagline: `The largest lending market in crypto, where people deposit coins to earn interest and others borrow against their own.`,
    what: `Aave is a place to lend and borrow crypto without a bank. If you have coins sitting idle, you can deposit them and earn interest. If you own coins you do not want to sell, you can borrow against them, a bit like a mortgage against a house. There is no application and no credit check. Everything is handled automatically by software, and every loan is backed by more collateral than it lends out, so lenders are protected if prices move.`,
    usedFor: `Savers use it to earn interest on stablecoins, which are crypto tokens designed to hold a steady value of about one dollar. Borrowers use it to raise cash without selling their holdings. It also issues its own stablecoin, called GHO. AAVE holders vote on how the whole thing is run.`,
    bull: [
      `It is the clear leader in its category, holding roughly 60% of all decentralised lending, and it has handled more than a trillion dollars of loans since launch.`,
      `It makes real money. Net revenue was about $142 million in 2025, up 57% on the year before, and governance has committed a permanent $50 million a year to buying back its own token.`,
      `It keeps working when things break. It processed $8.45 billion of withdrawals during a market panic without freezing, and cleared over $500 million of forced sales in a single week in February 2026 without disruption. That track record is very hard for a newcomer to match.`,
      `A major rebuild landed. Version 4 launched on Ethereum in March 2026 and on Avalanche in July, using a design meant to make the same pool of money work harder across more markets.`,
      `It is reaching ordinary savers, not just traders. Consumer apps across Latin America now use Aave behind the scenes to offer savings products, and its own app targets everyday users rather than crypto natives.`
    ],
    bear: [
      `Deposits have fallen a long way. The total held in the protocol peaked around $30 billion in late 2025 and was closer to $14 billion by May 2026. Lending revenue follows deposits, so this matters.`,
      `A settings error caused real losses. A stale risk parameter in March 2026 led to roughly $26 million of forced sales that should not have happened. The system worked, but the configuration did not.`,
      `Governance has been unsettled. A dispute in late 2025 over who maintains the core code has not fully resolved, and a project run by token holder vote moves slowly when its contributors are in question.`
    ],
    unverified: [
      ['Team quality', 'contributors are public, but no free source rates track record or governance stability'],
      ['Audit status', 'shown above from DefiLlama where a record exists'],
      ['Real-world asset exposure', 'institutional lending volumes are reported by the project rather than by an independent free source']
    ]
  },

  hyperliquid: {
    slug: 'hyperliquid', name: 'Hyperliquid', ticker: 'HYPE', sector: 'perp-dex',
    publishedISO: '2026-09-01', reviewedISO: '2026-09-01',
    publishedPrice: 83.38, publishedScore: 7.5,
    tagline: `A leveraged-trading exchange that runs on its own blockchain and uses real trading fees to buy back its own token.`,
    what: `Hyperliquid is a crypto exchange. Its main product is called a perpetual future, which is simply a bet on whether a price will go up or down, with no end date, and often using borrowed money to make the bet bigger. Most exchanges run this on their own private computers. Hyperliquid built its own blockchain so the whole thing runs in the open, where anyone can check it. HYPE is the coin that powers that blockchain.`,
    usedFor: `Traders use it to bet on prices without handing their money to a company first, so they stay in control of their own funds. Outside developers can launch their own trading markets on it and keep a share of the fees. People who own HYPE can lock it up to help run the network and earn a cut of what the exchange makes.`,
    bull: [
      `It is one of very few crypto projects earning real money. Trading fees are paid by customers who want the service, and estimates of annualised protocol revenue in 2026 have ranged from roughly $570 million to $730 million depending on how it is measured.`,
      `Those fees buy back the token. Most buyback programmes spend treasury reserves or promise future income. This one spends cash the business actually collected, and a mechanism called AQAv2 is set to route yield from billions in reserves into further buybacks from October 2026.`,
      `It has weathered a serious competitive attack once already. Rivals took most of its market share in 2025 by paying traders to switch, and it recovered anyway, which tells you more about the product than any projection could.`,
      `Regulators are engaging rather than only threatening. In August 2026 the token rose sharply on comments that US authorities were working on a route to bring the exchange onshore, which would open a market it currently cannot serve.`,
      `Big companies are buying it. A firm listed on the Nasdaq stock exchange now holds around 29 million HYPE, which is a sizeable chunk of all the coins available to trade.`
    ],
    bear: [
      `Most of the coins have not been released yet. Only about 22% of the total was in circulation by mid-2026, and more keeps arriving on a set schedule. New supply can weigh on the price if buyers do not absorb it.`,
      `Letting outsiders run markets costs it money. Those builders keep up to half the trading fees, and the protocol's own revenue fell 43% between the 2025 peak and mid-2026 even while trading hit record levels.`,
      `Traders move quickly when rivals pay them to. Its share of this market fell from about 71% to 20% during 2025 when competitors offered cheaper fees and rewards. It won that share back, but it showed how fast loyalty can shift.`,
    ],
    unverified: [
      ['Team quality', 'the founders operate semi-anonymously, and no free public source verifies track record'],
      ['Audit status', 'shown above where DefiLlama holds a record; base-layer networks are not listed there, so nothing is claimed either way'],
      ['Exact unlock detail', 'aggregate emissions data is published, but precise recipient categories and cliff dates are not available in machine-readable form']
    ]
  },

xrp: {
    slug: 'xrp', name: 'XRP', ticker: 'XRP', sector: 'payments',
    publishedISO: '2026-09-01', reviewedISO: '2026-09-01',
    publishedPrice: 1.39, publishedScore: 7.6,
    tagline: `A settlement network built for moving money between countries in seconds, now with the legal clarity it spent five years fighting for.`,
    what: `XRP is the coin of the XRP Ledger, a blockchain built specifically for payments rather than for running apps. A transfer settles in about four seconds and costs a fraction of a penny. Its main job is to act as a bridge: rather than a bank holding pots of every currency in every country, it can convert into XRP and out again in one motion. The company most associated with it, Ripple, sells payment software to banks and payment firms.`,
    usedFor: `Payment companies use it to move value across borders without pre-funding accounts in each country. Ripple also issues a dollar stablecoin called RLUSD, which handles the final settlement where a steady value matters, while XRP supplies the liquidity in between. Individuals hold it as an asset, increasingly through regulated funds.`,
    bull: [
      `It won the fight that defined it. After five years, US regulators dropped their case, and a court found that XRP bought and sold on exchanges is not a security. That is a level of legal clarity most crypto assets still do not have.`,
      `Regulated funds now exist. Spot XRP exchange-traded funds launched in late 2025 and went on to dominate crypto ETF flows, which gives institutions a familiar route to owning it.`,
      `The company behind it is building a real business. Ripple bought a global prime brokerage for $1.25 billion, raised $500 million, and launched a dollar stablecoin that passed $1.3 billion in circulation.`,
      `It solves a problem that genuinely costs money. Cross-border payments are slow and expensive, banks already spend heavily on them, and settling in seconds for a fraction of a penny is a straightforwardly better product.`,
      `It is far cheaper than when the good news arrived. The token sits well below its 2025 high, so the institutional story is available at a fraction of the price it commanded when it was still only a hope.`
    ],
    bear: [
      `The legal win is less settled than it sounds. The ruling that protects it came from a district court and has never been tested on appeal, so the shield is one serious challenge away from being reopened.`,
      `The clarity is a court decision, not a law. Attempts to write crypto rules into US legislation have stalled, and prediction markets put the odds of passage in 2026 at only around 10 to 20%. Ripple's plans all lean on a legal position that legislation has not yet confirmed.`,
      `The price has been painful. It remains far below its 2025 high, so holders who bought when the legal news broke have had a long wait.`
    ],
    unverified: [
      ['Real institutional volume', 'partnerships are announced publicly, but actual settlement volume routed through the network is not published in a free, verifiable form'],
      ['Team quality', 'the company is public-facing, but no free source rates execution or governance'],
      ['Escrow release detail', 'a large portion of supply sits in scheduled escrow, and monthly release behaviour is not available in machine-readable form']
    ]
  },

  zcash: {
    slug: 'zcash', name: 'Zcash', ticker: 'ZEC', sector: 'privacy',
    publishedISO: '2026-09-01', reviewedISO: '2026-09-01',
    publishedPrice: 853.16, publishedScore: 7.0,
    tagline: `A cryptocurrency that lets you choose whether a payment is public or completely private, using maths rather than trust.`,
    what: `Zcash is like Bitcoin, but with a privacy switch. You can send coins publicly, where anyone can see it, or privately, where the sender, the receiver and the amount are all hidden. The clever part is that the network can still confirm the payment is genuine without seeing any of those details. The coins held privately are known together as the shielded pool.`,
    usedFor: `People use it to hold or send money without broadcasting their balance to the world. On most blockchains, anyone who learns your address can see everything you have ever done, permanently. Zcash is one of the few ways to avoid that.`,
    bull: [
      `Private usage is genuinely growing, not just the price. The share of supply held in shielded addresses rose from about 8% in early 2024 to roughly 28-30% by August 2026, and the shielded pool passed $1 billion in value. That is people choosing to use the feature, which is a very different signal from speculation.`,
      `Most transactions now default to private. Shielded transactions reached about 59% of all Zcash activity in early 2026, helped by wallets making privacy the default rather than an option users must find.`,
      `Access is widening through regulated channels. A Grayscale spot Zcash product listed on NYSE Arca, which gives institutions a route to exposure without holding the asset directly.`,
      `The network handled its worst moment competently. When a serious flaw was found, developers shipped a fully replaced and formally verified system within about sixty days, which is a meaningful data point about the people maintaining it.`,
      `The reason to want it is getting stronger. As tax authorities and analytics firms improve at linking addresses to identities, the argument for financial privacy stops being ideological and becomes practical for ordinary holders.`
    ],
    bear: [
      `A serious bug sat hidden in the privacy system for four years before anyone noticed. It was found in June 2026 and the price halved in a day. Developers replaced the whole system within two months, but because it is private by design, nobody can prove the bug was never used. One well-known investor sold everything over exactly that.`,
      `Privacy attracts regulators. Some exchanges have already stopped offering privacy coins in certain countries, and more restrictions would make it harder to buy.`,
      `The price swings are severe even for crypto. It roughly tripled between June and August 2026. Moves that size are hard to sit through in either direction.`
    ],
    unverified: [
      ['Whether the four-year flaw was ever exploited', 'by design the shielded pool hides transaction detail, so this cannot be established from public data'],
      ['Team quality', 'no free public source rates founder track record or governance quality'],
      ['Audit status', 'not a listed protocol, so no audit registry covers it']
    ]
  }
};
