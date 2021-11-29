// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useTable } from 'react-table';
import { useQuery } from 'react-query';
import {
  useErrorHandler,
  withErrorBoundary
} from 'react-error-boundary';
import clsx from 'clsx';
import {
  RedeemStatus
} from '@interlay/interbtc-api';

import SectionTitle from 'parts/SectionTitle';
import PrimaryColorEllipsisLoader from 'components/PrimaryColorEllipsisLoader';
import ErrorFallback from 'components/ErrorFallback';
import ExternalLink from 'components/ExternalLink';
import InterlayPagination from 'components/UI/InterlayPagination';
import InterlayTable, {
  InterlayTableContainer,
  InterlayThead,
  InterlayTbody,
  InterlayTr,
  InterlayTh,
  InterlayTd
} from 'components/UI/InterlayTable';
import StatusCell from 'components/UI/InterlayTable/StatusCell';
import { BTC_ADDRESS_API } from 'config/bitcoin';
import useQueryParams from 'utils/hooks/use-query-params';
import useUpdateQueryParameters from 'utils/hooks/use-update-query-parameters';
import {
  shortAddress,
  formatDateTimePrecise,
  displayMonetaryAmount
} from 'common/utils/utils';
import { QUERY_PARAMETERS } from 'utils/constants/links';
import { TABLE_PAGE_LIMIT } from 'utils/constants/general';
import genericFetcher, {
  GENERIC_FETCHER
} from 'services/fetchers/generic-fetcher';
import graphqlFetcher, { GraphqlReturn, GRAPHQL_FETCHER } from 'services/fetchers/graphql-fetcher';
import redeemFetcher, { REDEEM_FETCHER, setRedeemStatus } from 'services/fetchers/redeem-request-fetcher';
import redeemCountQuery from 'services/queries/redeemRequestCount';
import { useSelector } from 'react-redux';
import { StoreType } from 'common/types/util.types';

const RedeemRequestsTable = (): JSX.Element => {
  const queryParams = useQueryParams();
  const selectedPage = Number(queryParams.get(QUERY_PARAMETERS.PAGE)) || 1;
  const updateQueryParameters = useUpdateQueryParameters();
  const { bridgeLoaded } = useSelector((state: StoreType) => state.general);
  const { t } = useTranslation();

  const columns = React.useMemo(
    () => [
      {
        Header: t('date_created'),
        classNames: [
          'text-left'
        ],
        Cell: function FormattedCell({ row: { original: redeem } }: any) {
          const date = redeem.request.timestamp;
          return (
            <>
              {formatDateTimePrecise(new Date(date))}
            </>
          );
        }
      },
      {
        Header: t('last_update'),
        classNames: [
          'text-left'
        ],
        Cell: function FormattedCell({ row: { original: redeem } }: any) {
          let date;
          if (redeem.execution) date = redeem.execution.timestamp;
          else if (redeem.cancellation) date = redeem.cancellation.timestamp;
          else date = redeem.request.timestamp;
          return (
            <>
              {formatDateTimePrecise(new Date(date))}
            </>
          );
        }
      },
      {
        Header: t('parachain_block'),
        classNames: [
          'text-right'
        ],
        Cell: function FormattedCell({ row: { original: redeem } }: any) {
          let height;
          if (redeem.execution) height = redeem.execution.height.active;
          else if (redeem.cancellation) height = redeem.cancellation.height.active;
          else height = redeem.request.height.active;
          return (
            <>
              {height}
            </>
          );
        }
      },
      {
        Header: t('redeem_page.amount'),
        classNames: [
          'text-right'
        ],
        Cell: function FormattedCell({ row: { original: redeem } }: any) {
          return (
            <>
              {displayMonetaryAmount(redeem.request.requestedAmountBacking)}
            </>
          );
        }
      },
      {
        Header: t('issue_page.vault_dot_address'),
        accessor: 'vaultParachainAddress',
        classNames: [
          'text-left'
        ],
        Cell: function FormattedCell({ value }: { value: string; }) {
          return (
            <>
              {shortAddress(value)}
            </>
          );
        }
      },
      {
        Header: t('redeem_page.output_BTC_address'),
        accessor: 'userBackingAddress',
        classNames: [
          'text-left'
        ],
        Cell: function FormattedCell({ value }: { value: string; }) {
          return (
            <ExternalLink href={`${BTC_ADDRESS_API}${value}`}>
              {shortAddress(value)}
            </ExternalLink>
          );
        }
      },
      {
        Header: t('status'),
        accessor: 'status',
        classNames: [
          'text-left'
        ],
        Cell: function FormattedCell({ value }: { value: RedeemStatus; }) {
          return (
            <StatusCell
              status={{
                completed: value === RedeemStatus.Completed,
                cancelled: value === RedeemStatus.Retried,
                isExpired: value === RedeemStatus.Expired,
                reimbursed: value === RedeemStatus.Reimbursed
              }} />
          );
        }
      }
    ],
    [t]
  );

  const selectedPageIndex = selectedPage - 1;

  const {
    isIdle: stableBtcConfirmationsIdle,
    isLoading: stableBtcConfirmationsLoading,
    data: stableBtcConfirmations,
    error: stableBtcConfirmationsError
  } = useQuery<number, Error>(
    [
      GENERIC_FETCHER,
      'interBtcIndex',
      'getBtcConfirmations'
    ],
    genericFetcher<number>(),
    {
      enabled: !!bridgeLoaded
    }
  );
  useErrorHandler(stableBtcConfirmationsError);

  const {
    isIdle: latestActiveBlockIdle,
    isLoading: latestActiveBlockLoading,
    data: latestParachainActiveBlock,
    error: latestActiveBlockError
  } = useQuery<number, Error>(
    [
      GENERIC_FETCHER,
      'interBtcIndex',
      'latestParachainActiveBlock'
    ],
    genericFetcher<number>(),
    {
      enabled: !!bridgeLoaded
    }
  );
  useErrorHandler(latestActiveBlockError);

  const {
    isIdle: stableParachainConfirmationsIdle,
    isLoading: stableParachainConfirmationsLoading,
    data: stableParachainConfirmations,
    error: stableParachainConfirmationsError
  } = useQuery<number, Error>(
    [
      GENERIC_FETCHER,
      'interBtcIndex',
      'getParachainConfirmations'
    ],
    genericFetcher<number>(),
    {
      enabled: !!bridgeLoaded
    }
  );
  useErrorHandler(stableParachainConfirmationsError);

  // TODO: type graphql returns properly
  const {
    isIdle: redeemsIdle,
    isLoading: redeemsLoading,
    data: redeemsData,
    error: redeemsError
  } = useQuery<any, Error>(
    [
      REDEEM_FETCHER,
      selectedPageIndex * TABLE_PAGE_LIMIT, // offset
      TABLE_PAGE_LIMIT, // limit
      stableBtcConfirmations
    ],
    redeemFetcher,
    {
      enabled: stableBtcConfirmations !== undefined
    }
  );
  useErrorHandler(redeemsError);
  const {
    isIdle: redeemsCountIdle,
    isLoading: redeemsCountLoading,
    data: redeemsCountData,
    error: redeemsCountError
  } = useQuery<GraphqlReturn<any>, Error>(
    [
      GRAPHQL_FETCHER,
      redeemCountQuery()
    ],
    graphqlFetcher<any>()
  );
  useErrorHandler(redeemsCountError);

  const anyIdle =
    stableBtcConfirmationsIdle ||
    stableBtcConfirmationsLoading ||
    stableParachainConfirmationsIdle ||
    stableParachainConfirmationsLoading ||
    latestActiveBlockLoading ||
    latestActiveBlockIdle ||
    redeemsIdle ||
    redeemsLoading ||
    redeemsCountIdle ||
    redeemsCountLoading;

  if (!anyIdle && (
    redeemsData === undefined ||
    redeemsCountData === undefined ||
    stableBtcConfirmations === undefined ||
    stableParachainConfirmations === undefined ||
    latestParachainActiveBlock === undefined
  )) {
    throw new Error('Something went wrong!');
  }

  const redeems = anyIdle ? [] : redeemsData.map(
    (issue: any) => setRedeemStatus(
      issue,
      // anyIdle = false, therefore stableBtcConfirmations !== undefined
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      stableBtcConfirmations!, stableParachainConfirmations!, latestParachainActiveBlock!
    )
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow
  } = useTable(
    {
      columns,
      data: redeems
    }
  );

  const renderContent = () => {
    if (anyIdle) {
      return <PrimaryColorEllipsisLoader />;
    }

    const handlePageChange = ({ selected: newSelectedPageIndex }: { selected: number; }) => {
      updateQueryParameters({
        [QUERY_PARAMETERS.PAGE]: (newSelectedPageIndex + 1).toString()
      });
    };

    const totalRedeemCount = redeemsCountData?.data?.redeemsConnection?.totalCount || 0;
    const pageCount = Math.ceil(totalRedeemCount / TABLE_PAGE_LIMIT);

    return (
      <>
        <InterlayTable {...getTableProps()}>
          <InterlayThead>
            {headerGroups.map((headerGroup: any) => (
              // eslint-disable-next-line react/jsx-key
              <InterlayTr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column: any) => (
                  // eslint-disable-next-line react/jsx-key
                  <InterlayTh
                    {...column.getHeaderProps([
                      {
                        className: clsx(column.classNames),
                        style: column.style
                      }
                    ])}>
                    {column.render('Header')}
                  </InterlayTh>
                ))}
              </InterlayTr>
            ))}
          </InterlayThead>
          <InterlayTbody {...getTableBodyProps()}>
            {rows.map((row: any) => {
              prepareRow(row);

              return (
                // eslint-disable-next-line react/jsx-key
                <InterlayTr {...row.getRowProps()}>
                  {row.cells.map((cell: any) => {
                    return (
                      // eslint-disable-next-line react/jsx-key
                      <InterlayTd
                        {...cell.getCellProps([
                          {
                            className: clsx(cell.column.classNames),
                            style: cell.column.style
                          }
                        ])}>
                        {cell.render('Cell')}
                      </InterlayTd>
                    );
                  })}
                </InterlayTr>
              );
            })}
          </InterlayTbody>
        </InterlayTable>
        {pageCount > 0 && (
          <div
            className={clsx(
              'flex',
              'justify-end'
            )}>
            <InterlayPagination
              pageCount={pageCount}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={handlePageChange}
              forcePage={selectedPageIndex} />
          </div>
        )}
      </>
    );
  };

  return (
    <InterlayTableContainer className='space-y-6'>
      <SectionTitle>
        {t('issue_page.recent_requests')}
      </SectionTitle>
      {renderContent()}
    </InterlayTableContainer>
  );
};

export default withErrorBoundary(RedeemRequestsTable, {
  FallbackComponent: ErrorFallback,
  onReset: () => {
    window.location.reload();
  }
});
