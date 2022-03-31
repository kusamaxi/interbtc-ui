
import * as React from 'react';
import clsx from 'clsx';

import InterlayDefaultOutlinedButton from 'components/buttons/InterlayDefaultOutlinedButton';
import InterlayModal, {
  InterlayModalInnerWrapper,
  InterlayModalTitle
} from 'components/UI/InterlayModal';

import { GOVERNANCE_TOKEN_SYMBOL } from 'config/relay-chains';

const GetGovernanceTokenUI = (): JSX.Element => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const focusRef = React.useRef(null);

  const handleModalOpen = () => {
    setModalOpen(true);
  };
  const handleModalClose = () => {
    setModalOpen(false);
  };

  return (
    <>
      <InterlayDefaultOutlinedButton
        className='m-4'
        onClick={handleModalOpen}>
        Get {GOVERNANCE_TOKEN_SYMBOL}
      </InterlayDefaultOutlinedButton>
      <InterlayModal
        initialFocus={focusRef}
        open={modalOpen}
        onClose={handleModalClose}>
        <InterlayModalInnerWrapper
          className={clsx(
            'p-6',
            'max-w-lg'
          )}>
          <InterlayModalTitle
            as='h3'
            className={clsx(
              'text-lg',
              'font-medium',
              'mb-6'
            )}>
            Get {GOVERNANCE_TOKEN_SYMBOL}
          </InterlayModalTitle>
          Modal
        </InterlayModalInnerWrapper>
      </InterlayModal>
    </>
  );
};

export default GetGovernanceTokenUI;
