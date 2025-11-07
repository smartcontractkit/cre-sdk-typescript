import { allNetworks } from '@cre/generated/networks'
import type { NetworkInfo } from './types'

export const getAllNetworks = (): NetworkInfo[] => allNetworks
