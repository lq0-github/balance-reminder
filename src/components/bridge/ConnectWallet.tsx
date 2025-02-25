import React, { useEffect, useState } from "react";

import { useWalletConnectContext } from "@/providers/walletConcent";
import { formatChainIcon, formatSortAddress } from "@/utils/format";
import Button from "./Button";
import SvgIcon from "./SvgIcon";
import CopyToClipboard from "react-copy-to-clipboard";
import { useAutoResetState } from "@/hooks/useHooks";
import { SupportChains } from "@/config/bridge";
import { Image } from "@nextui-org/react";

type Props = {
  currentChain: BridgeModel.BridgeSupportChain;
  hideChainSelector?: boolean;
  className?: string;
  connectPlaceholder?: string;
  buttonProps?: React.ComponentProps<typeof Button>;
  onChangeChain?: (chain: BridgeModel.BridgeSupportChain) => void;
};

function ConnectWallet({
  currentChain,
  className,
  connectPlaceholder,
  hideChainSelector,
  buttonProps,
  onChangeChain,
}: Props) {
  const { getWallet } = useWalletConnectContext();
  const { isSignedIn, accountId, open, disconnect } = getWallet(currentChain);

  const [showToast, setShowToast] = useAutoResetState(false, 2000);

  const [showWalletRisk, setShowWalletRisk] = useState<boolean>(false);

  function handleOpenWalletModal() {
    open();
  }

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {!hideChainSelector && (
        <ChainSelector
          value={currentChain}
          onChange={onChangeChain}
          options={SupportChains}
        />
      )}

      {isSignedIn ? (
        <Button
          rounded
          size="small"
          // onClick={() => currentChain === 'ETH' && open({ view: 'Account' })}
        >
          <span className="inline-flex w-2 h-2 rounded-full bg-primary mr-2"></span>
          <span className="relative text-white mr-2">
            <CopyToClipboard text={accountId} onCopy={() => setShowToast(true)}>
              <span> {formatSortAddress(accountId)}</span>
            </CopyToClipboard>
            {showToast && (
              <span className="text-xs text-white rounded-lg px-2.5 py-1.5 absolute -top-10 left-0 bg-black z-50">
                Copied!
              </span>
            )}
          </span>
          {
            <div
              className="inline-flex transform hover:opacity-80 hover:shadow-lg hover:scale-125"
              onClick={(e) => {
                disconnect();
              }}
            >
              <SvgIcon name="IconDisconnect" />
            </div>
          }
        </Button>
      ) : (
        <Button
          {...(buttonProps || { type: "primary", text: true })}
          onClick={() => handleOpenWalletModal()}
        >
          {connectPlaceholder || "Connect"}
        </Button>
      )}
    </div>
  );
}

function ChainSelector({
  value,
  onChange,
  options,
}: {
  value: BridgeModel.BridgeSupportChain;
  onChange: (chain: BridgeModel.BridgeSupportChain) => void;
  options: BridgeModel.BridgeSupportChain[];
}) {
  const [showOptions, setShowOptions] = useState(false);

  function handleOptionClick(option: BridgeModel.BridgeSupportChain) {
    onChange(option);
    setShowOptions;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showOptions) {
        const target = event.target as HTMLElement;
        if (!target.closest(".chain-selector")) {
          setShowOptions(false);
        }
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showOptions]);

  return (
    <div className="relative">
      <div
        className="chain-selector flex items-center cursor-pointer"
        onClick={() => setShowOptions(true)}
      >
        <span className="text-white">{value}</span>
        <SvgIcon name="IconArrowDown" className="text-xs ml-2" />
      </div>
      {showOptions && (
        <div
          className="bridge-modal absolute z-50 py-2 px-1.5 min-w-50 text-sm text-white overflow-y-auto"
          style={{ maxHeight: "50vh" }}
        >
          {options.map((option) => (
            <div
              key={option}
              className="hover:bg-symbolHover2 transition-colors py-2 px-4 flex items-center gap-2 cursor-pointer"
              onClick={() => handleOptionClick(option)}
            >
              <Image
                src={formatChainIcon(option)}
                width={24}
                height={24}
                classNames={{
                  wrapper: "w-6 h-6 bg-black rounded-md flex-shrink-0",
                }}
                alt=""
              />
              <div className="min-w-20">{option}</div>
              {value === option && (
                <SvgIcon
                  name="IconSuccess"
                  className="inline-block text-primary"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConnectWallet;
