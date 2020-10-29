import { Store, CombinedState } from "redux";
import { GeneralActions, PricesActions, RedeemActions, IssueActions, ReplaceActions } from "./actions.types";
import { rootReducer } from "../reducers/index";
import { u256 } from "@polkadot/types/primitive";
import { Issue } from "./issue.types";
import { Redeem } from "./redeem.types";
import { Replace } from "./replace.types";

export interface Prices {
    dotBtc: number;
    dotUsd: number;
}

export type Vault = {
    vaultId: string;
    btcAddress?: string;
    lockedDOT: string;
    lockedBTC: string;
    status: string;
    collateralization: number | undefined;
};

export interface StatusUpdate {
    id: u256;
    timestamp: string;
    proposedStatus: string;
    currentStatus: string;
    proposedChanges: string;
    blockHash: string;
    votes: string;
    result: string;
    proposer: string;
    message: string;
    hasVoted: boolean;
}

export type GeneralType = {
    polkaBtcLoaded: boolean;
    relayerLoaded: boolean;
    address: string;
    totalPolkaBTC: string;
    totalLockedDOT: string;
    btcAddress: string;
    collateral: number;
};

export type AppState = ReturnType<typeof rootReducer>;

export type StoreType = {
    general: GeneralType;
    prices: Prices;
    issue: Issue;
    redeem: Redeem;
    replace: Replace;
};

export type dispatcher = {
    // eslint-disable-next-line
    dispatch: {};
};

export type StoreState = Store<
    CombinedState<StoreType>,
    GeneralActions | PricesActions | RedeemActions | IssueActions | ReplaceActions
> &
    dispatcher;
