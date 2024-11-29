import { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import { useTokenBalances } from "@/services/token";
import {
  auroraAddr,
  batchWithdrawInner,
  useAuroraBalancesNearMapping,
  useDCLAccountBalance,
  useUserRegisteredTokensAllAndNearBalance,
} from "@/services/aurora";
import { RemindCloseIcon, RemindIcon } from "./icon";
import failToast from "../common/toast/failToast";
import checkTxBeforeShowToast from "../common/toast/checkTxBeforeShowToast";
import { IExecutionResult } from "@/interfaces/wallet";
import { TokenMetadata } from "@/services/ft-contract";
import { useAppStore } from "@/stores/app";
import { NEARXIDS } from "@/services/swap/swapConfig";
import { toReadableNumber } from "@/utils/numbers";
import Big from "big.js";
import { getAccountId } from "@/utils/wallet";
import { WRAP_NEAR_CONTRACT_ID } from "@/services/wrap-near";
import { getAllTokenPrices } from "@/services/farm";

interface BalanceReminderProps {
  onClose: () => void;
  accountId?: string;
}
/* eslint-disable react/prop-types */
const BalanceReminder: React.FC<BalanceReminderProps> = ({
  onClose,
  accountId,
}) => {
  const [shouldShow, setShouldShow] = useState(false);
  const { tokens: userTokens, tokens_loading } =
    useUserRegisteredTokensAllAndNearBalance(); // balances in near wallet
  const v1balances = useTokenBalances();
  const DCLAccountBalance = useDCLAccountBalance(!!accountId);
  const auroraAddress = auroraAddr(getAccountId() || "");
  const auroaBalances = useAuroraBalancesNearMapping(auroraAddress); // balances in aurora;
  const appStore = useAppStore();
  const personalDataUpdatedSerialNumber =
    appStore.getPersonalDataUpdatedSerialNumber();
  const [userTokensLast, setUserTokensLast] = useState<any[]>([]);
  const [inter_tokens, set_inter_tokens] = useState<TokenMetadata[]>([]);
  useEffect(() => {
    if (accountId) {
      const totalV1Balance = calculateTotalBalance(v1balances);
      const totalDCLBalance = calculateTotalBalance(DCLAccountBalance);
      if (totalV1Balance > 0 || totalDCLBalance > 0) {
        setShouldShow(true);
      } else {
        setShouldShow(false);
      }
    }
  }, [v1balances, DCLAccountBalance, accountId]);
  useEffect(() => {
    userTokens &&
      userTokens.forEach((token: TokenMetadata) => {
        const { decimals, id, nearNonVisible } = token;
        const b_onRef =
          id === NEARXIDS[0]
            ? "0"
            : toReadableNumber(decimals, v1balances[id] || "0");
        const b_onDcl = toReadableNumber(
          decimals,
          DCLAccountBalance[id] || "0"
        );
        const b_inner = Big(b_onRef).plus(b_onDcl).toFixed();
        token.ref = b_onRef;
        token.dcl = b_onDcl;
        token.inner = b_inner;
        token.near = toReadableNumber(
          decimals,
          (nearNonVisible || "0").toString()
        );
        token.aurora = toReadableNumber(
          decimals,
          auroaBalances?.[id] || "0"
        ).toString();
      });
    setUserTokensLast(JSON.parse(JSON.stringify(userTokens || [])));
  }, [
    JSON.stringify(userTokens || []),
    JSON.stringify(auroaBalances || {}),
    JSON.stringify(v1balances || {}),
    JSON.stringify(DCLAccountBalance || {}),
  ]);

  useEffect(() => {
    const near_tokens_temp: TokenMetadata[] = [];
    const aurora_tokens_temp: TokenMetadata[] = [];
    const inter_tokens_temp: TokenMetadata[] = [];
    userTokensLast.forEach((token: TokenMetadata) => {
      const { near, aurora, id, inner } = token;
      if (id === NEARXIDS[0]) return;
      if (near && +near > 0) {
        near_tokens_temp.push(token);
      }
      if (aurora && +aurora > 0) {
        aurora_tokens_temp.push(token);
      }
      if (inner && +inner > 0) {
        inter_tokens_temp.push(token);
      }
    });
    const { tokens: tokens_inner, total_value: total_value_inner } =
      token_data_process(inter_tokens_temp, "inner");
    set_inter_tokens(tokens_inner);
    const tab_list = [{ name: "NEAR", tag: "near" }];
    if (tokens_inner?.length > 0) {
      tab_list.push({
        name: "REF",
        tag: "ref",
      });
    }
  }, [JSON.stringify(userTokensLast || [])]);
  function token_data_process(
    target_tokens: TokenMetadata[],
    accountType: keyof TokenMetadata
  ) {
    const tokens = JSON.parse(JSON.stringify(target_tokens || []));
    tokens.forEach(async (token: TokenMetadata) => {
      const token_num = token[accountType] || "0";
      const tokenPriceList = await getAllTokenPrices();
      const token_price =
        tokenPriceList[token.id == "NEAR" ? WRAP_NEAR_CONTRACT_ID : token.id]
          ?.price || "0";
      const token_value = new BigNumber(token_num as string).multipliedBy(
        token_price
      );
      token.t_value = token_value.toFixed();
    });
    tokens.sort((tokenB: TokenMetadata, tokenA: TokenMetadata) => {
      const a_value = new BigNumber(tokenA.t_value || "0");
      const b_value = new BigNumber(tokenB.t_value || "0");
      return a_value.minus(b_value).toNumber();
    });
    const total_value = tokens.reduce((acc: string, cur: TokenMetadata) => {
      return new BigNumber(acc).plus(cur.t_value || "0").toFixed();
    }, "0");

    return { tokens, total_value };
  }
  function doWithdrawAll() {
    batchWithdrawInner(inter_tokens).then(
      (res: IExecutionResult | undefined) => {
        if (!res) return;
        if (res.status == "success") {
          checkTxBeforeShowToast({ txHash: res.txHash });
          appStore.setPersonalDataUpdatedSerialNumber(
            personalDataUpdatedSerialNumber + 1
          );
        } else if (res.status == "error") {
          failToast(res.errorResult?.message);
        }
      }
    );
  }
  if (!shouldShow) {
    return null;
  }
  return (
    <div
      className="fixed top-36 right-12 transform -translate-y-1/2 bg-dark-10 shadow-lg py-4 pl-3 pr-4
     border border-dark-300 w-96 rounded-md flex 
     xsm:bottom-8 xsm:right-0 xsm:left-0 xsm:top-auto xsm:transform-none xsm:w-screen
     xsm:border-0 xsm:rounded-none xsm:rounded-t-md xsm:bg-dark-230"
      style={{ zIndex: "999" }}
    >
      <div className="mt-4 xsm:mt-6">
        <RemindIcon className="w-5 h-5 xsm:w-7 xsm:h-7" />
      </div>
      <div className="text-base ml-2 mr-2 xsm:text-sm xsm:mt-4 xsm:text-gray-10 xsm:ml-3">
        You have assets remaining in REF account. Please
        <p
          className="text-primaryGreen inline-block cursor-pointer underline mx-1"
          onClick={doWithdrawAll}
        >
          claim
        </p>
        them promptly.
      </div>
      <div onClick={onClose} className="cursor-pointer">
        <RemindCloseIcon />
      </div>
    </div>
  );
};

function calculateTotalBalance(
  balances: Record<string, any> | undefined | null
): number {
  if (!balances) {
    return 0;
  }

  return Object.values(balances).reduce((total, balance) => {
    return total + (Number(balance) || 0);
  }, 0);
}

export default BalanceReminder;
