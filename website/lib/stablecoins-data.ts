export type StablecoinStatus = 'Active' | 'Pending review' | 'Maintenance'

export type StablecoinTransaction = {
  id: string
  type: string
  direction: 'Inflow' | 'Outflow'
  channel: 'PIX' | 'On-ramp' | 'Off-ramp' | 'XRPL'
  amount: string
  time: string
  status: 'Settled' | 'Processing' | 'Failed'
}

export type StablecoinRecord = {
  token: string
  name: string
  supply: number
  status: StablecoinStatus
  pendingRequests: number
  minted24h: string
  lastActivity: string
  liquidityPool: string
  transactions: StablecoinTransaction[]
}

export const stablecoinsData: StablecoinRecord[] = [
  {
    token: 'CBRL',
    name: 'imovelprimeBRL',
    supply: 12_450_000,
    status: 'Active',
    pendingRequests: 2,
    minted24h: 'R$ 450,000',
    lastActivity: '10:32 BRT • PIX inflow',
    liquidityPool: '95%',
    transactions: [
      { id: 'TX-9345', type: 'On-ramp PIX', direction: 'Inflow', channel: 'PIX', amount: 'R$ 250,000', time: '10:32', status: 'Settled' },
      { id: 'TX-9344', type: 'Stablecoin issuance', direction: 'Outflow', channel: 'XRPL', amount: '210,000 CBRL', time: '09:48', status: 'Settled' },
      { id: 'TX-9340', type: 'Treasury top-up', direction: 'Inflow', channel: 'On-ramp', amount: 'R$ 180,000', time: '08:10', status: 'Processing' },
    ],
  },
  {
    token: 'RLUSD',
    name: 'techfundRLUSD',
    supply: 4_280_000,
    status: 'Pending review',
    pendingRequests: 5,
    minted24h: 'R$ 120,000',
    lastActivity: 'Yesterday • compliance hold',
    liquidityPool: '82%',
    transactions: [
      { id: 'TX-9210', type: 'Compliance review', direction: 'Inflow', channel: 'On-ramp', amount: 'US$ 95,000', time: 'Yesterday', status: 'Processing' },
      { id: 'TX-9205', type: 'Stablecoin burn', direction: 'Outflow', channel: 'XRPL', amount: '75,000 RLUSD', time: 'Yesterday', status: 'Settled' },
      { id: 'TX-9199', type: 'PIX withdrawal', direction: 'Outflow', channel: 'PIX', amount: 'R$ 60,000', time: '2 days ago', status: 'Settled' },
    ],
  },
  {
    token: 'CBRH',
    name: 'agribusinessBRH',
    supply: 1_100_000,
    status: 'Maintenance',
    pendingRequests: 1,
    minted24h: 'R$ 25,000',
    lastActivity: 'Today • audit lock',
    liquidityPool: '67%',
    transactions: [
      { id: 'TX-9102', type: 'Audit lock', direction: 'Outflow', channel: 'XRPL', amount: 'Suspended', time: 'Today', status: 'Processing' },
      { id: 'TX-9095', type: 'On-ramp PIX', direction: 'Inflow', channel: 'PIX', amount: 'R$ 15,000', time: 'Yesterday', status: 'Settled' },
      { id: 'TX-9090', type: 'Treasury withdrawal', direction: 'Outflow', channel: 'Off-ramp', amount: 'R$ 12,500', time: '3 days ago', status: 'Settled' },
    ],
  },
]

