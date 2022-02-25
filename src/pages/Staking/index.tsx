
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import {
  useQuery,
  useMutation,
  useQueryClient
} from 'react-query';
import {
  useErrorHandler,
  withErrorBoundary
} from 'react-error-boundary';
import { useForm } from 'react-hook-form';
import {
  format,
  add
} from 'date-fns';
import Big from 'big.js';
import {
  MonetaryAmount,
  Currency
} from '@interlay/monetary-js';
import {
  DefaultTransactionAPI,
  GovernanceUnit,
  newMonetaryAmount,
  VoteUnit
} from '@interlay/interbtc-api';
import { AddressOrPair } from '@polkadot/api/types';

import Title from './Title';
import BalancesUI from './BalancesUI';
import UnstakeButton from './UnstakeButton';
import ClaimRewardsButton from './ClaimRewardsButton';
import TransferableBalanceUI from './TransferableBalanceUI';
import InformationUI from './InformationUI';
import LockTimeField from './LockTimeField';
import MainContainer from 'parts/MainContainer';
import Panel from 'components/Panel';
import TokenField from 'components/TokenField';
import SubmitButton from 'components/SubmitButton';
import ErrorFallback from 'components/ErrorFallback';
import ErrorModal from 'components/ErrorModal';
import {
  VOTE_GOVERNANCE_TOKEN_SYMBOL,
  GOVERNANCE_TOKEN_SYMBOL,
  VOTE_GOVERNANCE_TOKEN,
  GOVERNANCE_TOKEN,
  STAKE_LOCK_TIME
} from 'config/relay-chains';
import { BLOCK_TIME } from 'config/parachain';
import { YEAR_MONTH_DAY_PATTERN } from 'utils/constants/date-time';
import {
  displayMonetaryAmount,
  getUsdAmount
} from 'common/utils/utils';
import genericFetcher, { GENERIC_FETCHER } from 'services/fetchers/generic-fetcher';
import { StoreType } from 'common/types/util.types';

const getLockBlocks = (weeks: number) => {
  return (weeks * 7 * 24 * 3600) / BLOCK_TIME;
};

const ZERO_VOTE_GOVERNANCE_TOKEN_AMOUNT = newMonetaryAmount(0, VOTE_GOVERNANCE_TOKEN, true);
const ZERO_GOVERNANCE_TOKEN_AMOUNT = newMonetaryAmount(0, GOVERNANCE_TOKEN, true);

const STAKING_AMOUNT = 'staking-amount';
const LOCK_TIME = 'lock-time';

type StakingFormData = {
  [STAKING_AMOUNT]: string;
  [LOCK_TIME]: string;
}

interface RewardAmountAndAPY {
  amount: MonetaryAmount<Currency<GovernanceUnit>, GovernanceUnit>;
  apy: number;
}

interface StakedAmountAndEndBlock {
  amount: MonetaryAmount<Currency<GovernanceUnit>, GovernanceUnit>;
  endBlock: number;
}

interface StakingAmountAndUnlockHeight {
  amount: MonetaryAmount<Currency<GovernanceUnit>, GovernanceUnit>;
  unlockHeight: number;
}

const Staking = (): JSX.Element => {
  const {
    governanceTokenBalance,
    governanceTokenTransferableBalance,
    bridgeLoaded,
    address,
    prices
  } = useSelector((state: StoreType) => state.general);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<StakingFormData>({
    mode: 'onChange', // 'onBlur'
    defaultValues: {
      [STAKING_AMOUNT]: '0',
      [LOCK_TIME]: '0'
    }
  });
  const stakingAmount = watch(STAKING_AMOUNT) || '0';
  const lockTime = watch(LOCK_TIME) || '0';

  const {
    isIdle: currentBlockNumberIdle,
    isLoading: currentBlockNumberLoading,
    data: currentBlockNumber,
    error: currentBlockNumberError
  } = useQuery<number, Error>(
    [
      GENERIC_FETCHER,
      'interBtcApi',
      'system',
      'getCurrentBlockNumber'
    ],
    genericFetcher<number>(),
    {
      enabled: !!bridgeLoaded
    }
  );
  useErrorHandler(currentBlockNumberError);

  const {
    isIdle: voteGovernanceTokenIdle,
    isLoading: voteGovernanceTokenLoading,
    data: voteGovernanceTokenBalance,
    error: voteGovernanceTokenError
  } = useQuery<MonetaryAmount<Currency<VoteUnit>, VoteUnit>, Error>(
    [
      GENERIC_FETCHER,
      'interBtcApi',
      'escrow',
      'votingBalance',
      address
    ],
    genericFetcher<MonetaryAmount<Currency<VoteUnit>, VoteUnit>>(),
    {
      enabled: !!bridgeLoaded
    }
  );
  useErrorHandler(voteGovernanceTokenError);

  // My Rewards
  const {
    isIdle: rewardAmountAndAPYIdle,
    isLoading: rewardAmountAndAPYLoading,
    data: rewardAmountAndAPY,
    error: rewardAmountAndAPYError
  } = useQuery<RewardAmountAndAPY, Error>(
    [
      GENERIC_FETCHER,
      'interBtcApi',
      'escrow',
      'getRewardEstimate',
      address
    ],
    genericFetcher<RewardAmountAndAPY>(),
    {
      enabled: !!bridgeLoaded
    }
  );
  useErrorHandler(rewardAmountAndAPYError);

  // Estimated KINT Rewards & APY
  const monetaryStakingAmount = newMonetaryAmount(stakingAmount, GOVERNANCE_TOKEN, true);
  const {
    isIdle: estimatedRewardAmountAndAPYIdle,
    isLoading: estimatedRewardAmountAndAPYLoading,
    data: estimatedRewardAmountAndAPY,
    error: estimatedRewardAmountAndAPYError
  } = useQuery<RewardAmountAndAPY, Error>(
    [
      GENERIC_FETCHER,
      'interBtcApi',
      'escrow',
      'getRewardEstimate',
      address,
      monetaryStakingAmount
    ],
    genericFetcher<RewardAmountAndAPY>(),
    {
      enabled: !!bridgeLoaded
    }
  );
  useErrorHandler(estimatedRewardAmountAndAPYError);

  const {
    isIdle: stakedAmountAndEndBlockIdle,
    isLoading: stakedAmountAndEndBlockLoading,
    data: stakedAmountAndEndBlock,
    error: stakedAmountAndEndBlockError
  } = useQuery<StakedAmountAndEndBlock, Error>(
    [
      GENERIC_FETCHER,
      'interBtcApi',
      'escrow',
      'getStakedBalance',
      address
    ],
    genericFetcher<StakedAmountAndEndBlock>(),
    {
      enabled: !!bridgeLoaded
    }
  );
  useErrorHandler(stakedAmountAndEndBlockError);

  const queryClient = useQueryClient();

  const initialStakeMutation = useMutation<void, Error, StakingAmountAndUnlockHeight>(
    (variables: StakingAmountAndUnlockHeight) => {
      return window.bridge.interBtcApi.escrow.createLock(variables.amount, variables.unlockHeight);
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries([
          GENERIC_FETCHER,
          'interBtcApi',
          'escrow',
          'votingBalance',
          address
        ]);
        console.log('[initialStakeMutation onSuccess] variables => ', variables);
        reset({
          [STAKING_AMOUNT]: '0.0',
          [LOCK_TIME]: '0'
        });
      },
      onError: error => {
        // TODO: should add error handling UX
        console.log('[initialStakeMutation onError] error => ', error);
      }
    }
  );

  const moreStakeMutation = useMutation<void, Error, StakingAmountAndUnlockHeight>(
    (variables: StakingAmountAndUnlockHeight) => {
      return (async () => {
        const txs = [
          window.bridge.interBtcApi.api.tx.escrow.increaseAmount(
            variables.amount.toString(variables.amount.currency.rawBase)
          ),
          window.bridge.interBtcApi.api.tx.escrow.increaseUnlockHeight(variables.unlockHeight)
        ];
        const batch = window.bridge.interBtcApi.api.tx.utility.batchAll(txs);
        await DefaultTransactionAPI.sendLogged(
          window.bridge.interBtcApi.api,
          window.bridge.interBtcApi.account as AddressOrPair,
          batch
        );
      })();
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries([
          GENERIC_FETCHER,
          'interBtcApi',
          'escrow',
          'votingBalance',
          address
        ]);
        console.log('[moreStakeMutation onSuccess] variables => ', variables);
        reset({
          [STAKING_AMOUNT]: '0.0',
          [LOCK_TIME]: '0'
        });
      },
      onError: error => {
        // TODO: should add error handling UX
        console.log('[moreStakeMutation onError] error => ', error);
      }
    }
  );

  const onSubmit = (data: StakingFormData) => {
    if (!bridgeLoaded) return;
    if (currentBlockNumber === undefined) {
      throw new Error('Something went wrong!');
    }

    const monetaryAmount = newMonetaryAmount(data[STAKING_AMOUNT], GOVERNANCE_TOKEN, true);

    const lockTime = parseInt(data[LOCK_TIME]); // Weeks
    const unlockHeight = currentBlockNumber + getLockBlocks(lockTime);

    if (votingBalanceGreaterThanZero) {
      moreStakeMutation.mutate({
        amount: monetaryAmount,
        unlockHeight
      });
    } else {
      initialStakeMutation.mutate({
        amount: monetaryAmount,
        unlockHeight
      });
    }
  };

  const validateStakingAmount = (value = '0'): string | undefined => {
    const monetaryStakingAmount = newMonetaryAmount(value, GOVERNANCE_TOKEN, true);

    if (monetaryStakingAmount.lte(ZERO_GOVERNANCE_TOKEN_AMOUNT)) {
      return 'Staking amount must be greater than zero!';
    }

    if (monetaryStakingAmount.gt(governanceTokenBalance)) {
      return 'Staking amount must be less than governance token balance!';
    }

    const planckStakingAmount = monetaryStakingAmount.to.Planck();
    const lockBlocks = getLockBlocks(parseInt(lockTime));
    // This is related to the on-chain implementation where currency values are integers.
    // So less tokens than the period would likely round to 0.
    // So on the UI, as long as you require more planck to be locked than the number of blocks the user locks for,
    // it should be good.
    if (planckStakingAmount.lte(Big(lockBlocks))) {
      return 'Planck to be locked must be greater than the number of blocks you lock for!';
    }

    return undefined;
  };

  const validateLockTime = (value = '0', optional: boolean): string | undefined => {
    const numericValue = parseInt(value);

    if (optional && numericValue === 0) {
      return undefined;
    }

    if (
      numericValue < STAKE_LOCK_TIME.MIN ||
      numericValue > STAKE_LOCK_TIME.MAX
    ) {
      return `Please enter a number between ${STAKE_LOCK_TIME.MIN}-${STAKE_LOCK_TIME.MAX}.`;
    }

    return undefined;
  };

  const renderVoteStakedAmountLabel = () => {
    if (
      voteGovernanceTokenIdle ||
      voteGovernanceTokenLoading
    ) {
      return '-';
    }
    if (voteGovernanceTokenBalance === undefined) {
      throw new Error('Something went wrong!');
    }

    return displayMonetaryAmount(voteGovernanceTokenBalance);
  };

  const renderRewardAmountLabel = () => {
    if (
      rewardAmountAndAPYIdle ||
      rewardAmountAndAPYLoading
    ) {
      return '-';
    }
    if (rewardAmountAndAPY === undefined) {
      throw new Error('Something went wrong!');
    }

    return displayMonetaryAmount(rewardAmountAndAPY.amount);
  };

  const renderStakedAmountLabel = () => {
    if (
      stakedAmountAndEndBlockIdle ||
      stakedAmountAndEndBlockLoading
    ) {
      return '-';
    }
    if (stakedAmountAndEndBlock === undefined) {
      throw new Error('Something went wrong!');
    }

    return displayMonetaryAmount(stakedAmountAndEndBlock.amount);
  };

  const getRemainingBlockNumbersToUnstake = () => {
    if (
      stakedAmountAndEndBlockIdle ||
      stakedAmountAndEndBlockLoading ||
      currentBlockNumberIdle ||
      currentBlockNumberLoading
    ) {
      return undefined;
    }
    if (stakedAmountAndEndBlock === undefined) {
      throw new Error('Something went wrong!');
    }
    if (currentBlockNumber === undefined) {
      throw new Error('Something went wrong!');
    }

    return stakedAmountAndEndBlock.endBlock - currentBlockNumber;
  };
  const remainingBlockNumbersToUnstake = getRemainingBlockNumbersToUnstake();

  const claimRewardsButtonAvailable = rewardAmountAndAPY?.amount.gt(ZERO_GOVERNANCE_TOKEN_AMOUNT);

  const transferableBalanceLabel = displayMonetaryAmount(governanceTokenTransferableBalance);

  const renderUnlockDateLabel = () => {
    const numericLockTime = parseInt(lockTime);
    if (
      numericLockTime < STAKE_LOCK_TIME.MIN ||
      numericLockTime > STAKE_LOCK_TIME.MAX
    ) {
      return '-';
    }

    const unlockDate = add(new Date(), {
      weeks: numericLockTime
    });

    return format(unlockDate, YEAR_MONTH_DAY_PATTERN);
  };

  const renderNewUnlockDateLabel = () => {
    if (remainingBlockNumbersToUnstake === undefined) {
      return '-';
    }

    const numericLockTime = parseInt(lockTime);
    if (
      numericLockTime < STAKE_LOCK_TIME.MIN ||
      numericLockTime > STAKE_LOCK_TIME.MAX
    ) {
      return '-';
    }

    const unlockDate = add(new Date(), {
      weeks: numericLockTime,
      seconds: (remainingBlockNumbersToUnstake > 0 ? remainingBlockNumbersToUnstake : 0) * BLOCK_TIME
    });

    return format(unlockDate, YEAR_MONTH_DAY_PATTERN);
  };

  const usdStakingAmount = getUsdAmount(monetaryStakingAmount, prices.governanceToken.usd);

  const votingBalanceGreaterThanZero = voteGovernanceTokenBalance?.gt(ZERO_VOTE_GOVERNANCE_TOKEN_AMOUNT);

  const renderNewTotalStakeLabel = () => {
    if (
      voteGovernanceTokenIdle ||
      voteGovernanceTokenLoading
    ) {
      return '-';
    }
    if (voteGovernanceTokenBalance === undefined) {
      throw new Error('Something went wrong!');
    }

    return displayMonetaryAmount(monetaryStakingAmount.add(voteGovernanceTokenBalance));
  };

  const renderEstimatedAPYLabel = () => {
    if (
      estimatedRewardAmountAndAPYIdle ||
      estimatedRewardAmountAndAPYLoading
    ) {
      return '-';
    }
    if (estimatedRewardAmountAndAPY === undefined) {
      throw new Error('Something went wrong!');
    }

    return estimatedRewardAmountAndAPY.apy;
  };

  const renderEstimatedRewardAmountLabel = () => {
    if (
      estimatedRewardAmountAndAPYIdle ||
      estimatedRewardAmountAndAPYLoading
    ) {
      return '-';
    }
    if (estimatedRewardAmountAndAPY === undefined) {
      throw new Error('Something went wrong!');
    }

    return displayMonetaryAmount(estimatedRewardAmountAndAPY.amount);
  };

  const initializing =
    voteGovernanceTokenIdle ||
    voteGovernanceTokenLoading ||
    currentBlockNumberIdle ||
    currentBlockNumberLoading;

  let submitButtonLabel: string;
  if (initializing) {
    submitButtonLabel = 'Loading...';
  } else {
    submitButtonLabel = votingBalanceGreaterThanZero ? 'Add more stake' : 'Stake';
  }

  return (
    <>
      <MainContainer>
        <Panel
          className={clsx(
            'mx-auto',
            'w-full',
            'md:max-w-xl'
          )}>
          <form
            className={clsx(
              'p-8',
              'space-y-8'
            )}
            onSubmit={handleSubmit(onSubmit)}>
            <Title />
            <BalancesUI
              stakedAmount={renderStakedAmountLabel()}
              voteStakedAmount={renderVoteStakedAmountLabel()}
              rewardAmount={renderRewardAmountLabel()} />
            {votingBalanceGreaterThanZero && (
              <UnstakeButton
                stakedAmount={renderStakedAmountLabel()}
                remainingBlockNumbersToUnstake={remainingBlockNumbersToUnstake} />
            )}
            {claimRewardsButtonAvailable && (
              <ClaimRewardsButton />
            )}
            <div className='space-y-2'>
              <TransferableBalanceUI balance={transferableBalanceLabel} />
              <TokenField
                id={STAKING_AMOUNT}
                name={STAKING_AMOUNT}
                label={GOVERNANCE_TOKEN_SYMBOL}
                min={0}
                ref={register({
                  required: {
                    value: true,
                    message: 'This field is required!'
                  },
                  validate: value => validateStakingAmount(value)
                })}
                approxUSD={`≈ $ ${usdStakingAmount}`}
                error={!!errors[STAKING_AMOUNT]}
                helperText={errors[STAKING_AMOUNT]?.message} />
            </div>
            <LockTimeField
              id={LOCK_TIME}
              name={LOCK_TIME}
              min={0}
              ref={register({
                required: {
                  value: votingBalanceGreaterThanZero ? false : true,
                  message: 'This field is required!'
                },
                validate: value => validateLockTime(value, !!votingBalanceGreaterThanZero)
              })}
              error={!!errors[LOCK_TIME]}
              helperText={errors[LOCK_TIME]?.message}
              optional={votingBalanceGreaterThanZero}
              disabled={votingBalanceGreaterThanZero === undefined} />
            {votingBalanceGreaterThanZero ? (
              <InformationUI
                label='New unlock Date'
                value={renderNewUnlockDateLabel()}
                tooltip='Your original lock date plus the extended lock time.' />
            ) : (
              <InformationUI
                label='Unlock Date'
                value={renderUnlockDateLabel()}
                tooltip='Your staked amount will be locked until this date.' />
            )}
            {votingBalanceGreaterThanZero && (
              <InformationUI
                label='New total Stake'
                value={`${renderNewTotalStakeLabel()} ${VOTE_GOVERNANCE_TOKEN_SYMBOL}`}
                tooltip='Your total stake after this transaction.' />
            )}
            <InformationUI
              label='Estimated APY'
              value={renderEstimatedAPYLabel()}
              tooltip={`The APY may change as the amount of total ${VOTE_GOVERNANCE_TOKEN_SYMBOL} changes`} />
            <InformationUI
              label={`Estimated ${GOVERNANCE_TOKEN_SYMBOL} Rewards`}
              value={`${renderEstimatedRewardAmountLabel()}  ${GOVERNANCE_TOKEN_SYMBOL}`}
              // eslint-disable-next-line max-len
              tooltip={`The estimated amount of KINT you will receive as rewards. Depends on your proportion of the total ${VOTE_GOVERNANCE_TOKEN_SYMBOL}.`} />
            <SubmitButton
              disabled={initializing}
              pending={
                initialStakeMutation.isLoading ||
                moreStakeMutation.isLoading
              }>
              {submitButtonLabel}
            </SubmitButton>
          </form>
        </Panel>
      </MainContainer>
      {(
        initialStakeMutation.isError ||
        moreStakeMutation.isError
      ) && (
        <ErrorModal
          open={
            initialStakeMutation.isError ||
            moreStakeMutation.isError
          }
          onClose={() => {
            initialStakeMutation.reset();
            moreStakeMutation.reset();
          }}
          title='Error'
          description={
            initialStakeMutation.error?.message ||
            moreStakeMutation.error?.message ||
            ''
          } />
      )}
    </>
  );
};

export default withErrorBoundary(Staking, {
  FallbackComponent: ErrorFallback,
  onReset: () => {
    window.location.reload();
  }
});
