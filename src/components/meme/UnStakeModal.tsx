import React, { useState, useContext, useMemo } from "react";
import Big from "big.js";
import { isMobile } from "../../utils/device";
import { ModalCloseIcon, TipIcon } from "./icons";
import { InputAmount } from "./InputBox";
import Modal from "react-modal";
import { MemeContext } from "./context";
import { toNonDivisibleNumber, toReadableNumber } from "../../utils/numbers";
import { unStake, xrefUnStake } from "../../services/meme";
import {
  toInternationalCurrencySystem_number,
  formatPercentage,
} from "../../utils/uiNumber";

import { Template } from "./StakeModal";
import { getMemeContractConfig, getMemeDataConfig } from "./memeConfig";
import { formatSeconds, memeWeight, getListedMemeSeeds } from "./tool";
import { ButtonTextWrapper } from "../common/Button";
import { IExecutionResult } from "@/interfaces/wallet";
import successToast from "../common/toast/successToast";
import failToast from "../common/toast/failToast";
import { checkTransaction } from "@/utils/contract";
import { parsedArgs } from "./SeedsBox";
const { MEME_TOKEN_XREF_MAP } = getMemeContractConfig();
const { meme_winner_tokens } = getMemeDataConfig();
function UnStakeModal(props: any) {
  const {
    seeds,
    xrefSeeds,
    tokenPriceList,
    memeContractConfig,
    xrefTokenId,
    allTokenMetadatas,
    xrefFarmContractUserData,
    memeFarmContractUserData,
    xrefContractConfig,
    init_user,
  } = useContext(MemeContext)!;
  const { isOpen, onRequestClose, seed_id, setTxParams, setIsTxHashOpen } =
    props;
  const { delay_withdraw_sec } = memeContractConfig;
  const { delay_withdraw_sec: delay_withdraw_sec_xref } =
    xrefContractConfig[MEME_TOKEN_XREF_MAP[seed_id]];
  const xrefContractId = MEME_TOKEN_XREF_MAP[seed_id];
  const [amount, setAmount] = useState("");
  const [xrefAmount, setXrefAmount] = useState("");
  const [unStakeLoading, setUnStakeLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"meme" | "xref">("meme");
  const { join_seeds: user_seeds, withdraw_list } = memeFarmContractUserData;
  const { join_seeds: xref_user_seeds, withdraw_list: xref_withdraw_list } =
    xrefFarmContractUserData[xrefContractId];
  const { seed, xrefSeed } = useMemo(() => {
    return {
      seed: seeds[seed_id],
      xrefSeed: xrefSeeds[xrefContractId],
    };
  }, [seeds, xrefSeeds]);
  const { stakedBalance, xrefStakedBalance } = useMemo(() => {
    const memeStakedBalance = toReadableNumber(
      seed.seed_decimal || 0,
      user_seeds?.[seed_id]?.free_amount || "0"
    );
    const xrefStakedBalance = toReadableNumber(
      xrefSeed.seed_decimal || 0,
      xref_user_seeds?.[xrefTokenId]?.free_amount || "0"
    );
    return {
      stakedBalance: memeStakedBalance,
      xrefStakedBalance,
    };
  }, [seed, user_seeds, xrefSeed, xref_user_seeds]);
  const [memeFeedTo, xrefFeedTo] = useMemo(() => {
    const memeTo = Big(stakedBalance || 0).minus(amount || 0);
    const xrefTo = Big(xrefStakedBalance || 0).minus(xrefAmount || 0);

    return [memeTo, xrefTo];
  }, [amount, stakedBalance, xrefAmount, xrefStakedBalance]);
  const [weightFrom, weightTo] = useMemo(() => {
    const displayMemeSeeds = getListedMemeSeeds(seeds);
    const { seedTvl, totalTvl } = memeWeight({
      displayMemeSeeds,
      seed,
    });
    const deleteTvl = Big(amount || 0).mul(
      tokenPriceList[seed.seed_id]?.price || 0
    );
    const from = Big(totalTvl).gt(0)
      ? Big(seedTvl).div(totalTvl).mul(100)
      : Big(0);
    const to = Big(totalTvl).minus(deleteTvl).gt(0)
      ? Big(seedTvl)
          .minus(deleteTvl)
          .div(Big(totalTvl).minus(deleteTvl))
          .mul(100)
      : Big(0);
    return [from.toFixed(), to.toFixed()];
  }, [amount, seeds, seed, tokenPriceList]);
  const { withdraw_part_status, xref_withdraw_part_status } = useMemo(() => {
    let meme_withdraw_status;
    let xref_withdraw_status;
    if (withdraw_list[seed_id] && delay_withdraw_sec) {
      const { apply_timestamp } = withdraw_list[seed_id];
      const unLockDate = Big(apply_timestamp)
        .div(1000000000)
        .plus(delay_withdraw_sec);
      const currentDate = Big(new Date().getTime()).div(1000);
      if (Big(unLockDate).gt(currentDate)) {
        meme_withdraw_status = "locked";
      } else {
        meme_withdraw_status = "free";
      }
    }
    if (xref_withdraw_list[xrefTokenId] && delay_withdraw_sec_xref) {
      const { apply_timestamp } = xref_withdraw_list[xrefTokenId];
      const unLockDate = Big(apply_timestamp)
        .div(1000000000)
        .plus(delay_withdraw_sec_xref);
      const currentDate = Big(new Date().getTime()).div(1000);
      if (Big(unLockDate).gt(currentDate)) {
        xref_withdraw_status = "locked";
      } else {
        xref_withdraw_status = "free";
      }
    }
    return {
      withdraw_part_status: meme_withdraw_status,
      xref_withdraw_part_status: xref_withdraw_status,
    };
  }, [
    withdraw_list,
    xref_withdraw_list,
    delay_withdraw_sec_xref,
    delay_withdraw_sec,
  ]);
  function unStakeToken() {
    setUnStakeLoading(true);
    if (selectedTab == "xref") {
      xrefUnStake({
        contractId: xrefContractId,
        seed: xrefSeed,
        amount: Big(
          toNonDivisibleNumber(xrefSeed.seed_decimal, xrefAmount)
        ).toFixed(0),
        ...(xref_withdraw_part_status == "free"
          ? {
              withdrawAmount: xref_withdraw_list[xrefTokenId].amount,
            }
          : {}),
      }).then((res) => {
        handleDataAfterTranstion(res);
      });
    } else {
      unStake({
        seed,
        amount: Big(toNonDivisibleNumber(seed.seed_decimal, amount)).toFixed(0),
        ...(withdraw_part_status == "free"
          ? {
              withdrawAmount: withdraw_list[seed_id].amount,
            }
          : {}),
      }).then((res) => {
        handleDataAfterTranstion(res);
      });
    }
  }
  async function handleDataAfterTranstion(res: IExecutionResult | undefined) {
    if (!res) return;
    if (res.status == "success") {
      const txHash = res.txHashes?.split(",");
      setUnStakeLoading(false);
      setAmount("0");
      onRequestClose();
      checkTransaction(txHash[0]).then((res: any) => {
        const { transaction, receipts } = res;
        const byNeth =
          transaction?.actions?.[0]?.FunctionCall?.method_name === "execute";
        const byEvm =
          transaction?.actions?.[0]?.FunctionCall?.method_name ===
          "rlp_execute";
        const isPackage = byNeth || byEvm;
        const targetReceipt = receipts.find((r) => {
          const method_name =
            r?.receipt?.Action?.actions?.[0]?.FunctionCall?.method_name;
          return ["unlock_and_unstake_seed"].indexOf(method_name) > -1;
        });
        if (!targetReceipt) return;
        const args = parsedArgs(
          isPackage
            ? targetReceipt.receipt?.Action?.actions?.[0]?.FunctionCall?.args
            : res?.transaction?.actions?.[0]?.FunctionCall?.args || ""
        );
        const receiver_id = byEvm
          ? targetReceipt.receiver_id
          : transaction?.receiver_id;
        const parsedInputArgs = JSON.parse(args || "");
        setIsTxHashOpen(true);
        setTxParams({
          action: "unstake",
          params: parsedInputArgs,
          txHash: txHash[0],
          receiver_id,
        });
      });
      init_user();
    } else if (res.status == "error") {
      failToast(res.errorResult?.message);
      setUnStakeLoading(false);
    }
  }
  const cardWidth = isMobile() ? "100vw" : "28vw";
  const cardHeight = isMobile() ? "90vh" : "80vh";
  const is_mobile = isMobile();
  const disabled =
    selectedTab === "meme"
      ? Big(amount || 0).lte(0) || Big(amount || 0).gt(stakedBalance)
      : Big(xrefAmount || 0).lte(0) ||
        Big(xrefAmount || 0).gt(xrefStakedBalance);
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{
        overlay: {
          // backdropFilter: 'blur(15px)',
          // WebkitBackdropFilter: 'blur(15px)',
          overflow: "auto",
        },
        content: {
          overflow: "visible",
          outline: "none",
          ...(is_mobile
            ? {
                transform: "translateX(-50%)",
                top: "auto",
                bottom: "32px",
                marginBottom: "0px",
              }
            : {
                transform: "translate(-50%, -50%)",
              }),
        },
      }}
    >
      <div className="flex flex-col xsm:relative bg-dark-10 rounded-2xl">
        <div
          className="px-5 xs:px-3 md:px-3 py-6 lg:rounded-2xl xsm:rounded-t-2xl overflow-auto"
          style={{
            width: cardWidth,
            maxHeight: cardHeight,
            border: "1px solid rgba(151, 151, 151, 0.2)",
          }}
        >
          <div className="title flex items-center justify-end">
            <ModalCloseIcon
              className="cursor-pointer"
              onClick={onRequestClose}
            />
          </div>
          <div
            className="mt-5 transparentScrollbar xsm:mt-4"
            style={{ maxHeight: is_mobile ? "70vh" : "auto", overflow: "auto" }}
          >
            <div className="flex flex-col items-center gap-5 xsm:gap-2">
              <img
                src={seed?.token_meta_data?.icon}
                style={{
                  width: is_mobile ? "60px" : "86px",
                  height: is_mobile ? "60px" : "86px",
                }}
                className="rounded-full xsm:absolute xsm:-top-2 xsm:z-50"
              />
              <span className="text-2xl text-white paceGrotesk-Bold xsm:text-lg">
                Unstake {seed?.token_meta_data?.symbol}
              </span>
            </div>
            {/* Tab */}
            <div className="mt-5 flex justify-between">
              <div
                className={`flex-grow w-1 ${
                  selectedTab === "meme"
                    ? "bg-primaryGreen text-black"
                    : "bg-dark-70 text-white"
                } mr-4 rounded-3xl py-2 px-3 flex items-center justify-between cursor-pointer`}
                onClick={() => setSelectedTab("meme")}
              >
                <img
                  src={seed?.token_meta_data?.icon}
                  style={{ width: "26px", height: "26px" }}
                  className="rounded-full"
                />
                <span
                  className="text-base paceGrotesk-Bold ml-2 overflow-hidden whitespace-nowrap text-ellipsis xsm:hidden"
                  style={{ textOverflow: "ellipsis" }}
                >
                  {seed?.token_meta_data?.symbol}
                </span>
                <span className="ml-auto">
                  {toInternationalCurrencySystem_number(stakedBalance)}
                </span>
              </div>
              <div
                className={`flex-grow w-1 ${
                  selectedTab === "xref"
                    ? "bg-primaryGreen text-black"
                    : "bg-dark-70 text-white"
                } rounded-3xl py-2 px-3 flex items-center justify-between cursor-pointer`}
                onClick={() => setSelectedTab("xref")}
              >
                <img
                  src={allTokenMetadatas?.[xrefTokenId]?.icon}
                  style={{ height: "26px" }}
                  className="rounded-full"
                />
                <span className="text-base paceGrotesk-Bold ml-2 xsm:hidden">
                  {allTokenMetadatas?.[xrefTokenId]?.symbol}
                </span>
                <span className="ml-auto">
                  {toInternationalCurrencySystem_number(xrefStakedBalance)}
                </span>
              </div>
            </div>
            {/* Input */}
            {seed.token_meta_data && (
              <InputAmount
                token={seed.token_meta_data}
                tokenPriceList={tokenPriceList}
                balance={stakedBalance}
                changeAmount={setAmount}
                amount={amount}
                title="Staked"
                hidden={selectedTab === "xref"}
              />
            )}
            {xrefSeed.token_meta_data && (
              <InputAmount
                token={xrefSeed.token_meta_data}
                tokenPriceList={tokenPriceList}
                balance={xrefStakedBalance}
                changeAmount={setXrefAmount}
                amount={xrefAmount}
                title="Staked"
                hidden={selectedTab === "meme"}
              />
            )}
            {/* Trial calculation */}
            <div className="mt-4 px-2">
              <Template
                title="You feed"
                from={toInternationalCurrencySystem_number(stakedBalance)}
                to={toInternationalCurrencySystem_number(memeFeedTo)}
                hidden={selectedTab === "xref"}
                icon={seed?.token_meta_data?.icon}
              />
              <Template
                title="You feed"
                from={toInternationalCurrencySystem_number(xrefStakedBalance)}
                to={toInternationalCurrencySystem_number(xrefFeedTo)}
                hidden={selectedTab === "meme"}
                icon={xrefSeed?.token_meta_data?.icon}
              />
              <Template
                title="Gauge Weight"
                from={formatPercentage(weightFrom)}
                to={formatPercentage(weightTo)}
                hidden={
                  !meme_winner_tokens.includes(seed_id) ||
                  selectedTab === "xref"
                }
              />
            </div>
            {/* deep delay tip */}
            {(selectedTab === "meme" && withdraw_part_status == "locked") ||
            (selectedTab === "xref" &&
              xref_withdraw_part_status == "locked") ? (
              <div className="bg-yellow-10 rounded-lg px-3 py-1.5 my-4 text-sm text-yellow-10 bg-opacity-10">
                You have a record in the process of unstaking. If you unstake
                again, the two records will be merged and the pending time will
                be reset.
              </div>
            ) : (selectedTab === "meme" && withdraw_part_status == "free") ||
              (selectedTab === "xref" &&
                xref_withdraw_part_status == "free") ? (
              <div className="bg-primaryGreen rounded-lg px-3 py-1.5 my-4 text-sm text-primaryGreen bg-opacity-10">
                You have withdrawable MemeTokens,  unstake will help you
                withdraw them simultaneously.
              </div>
            ) : null}

            <div
              onClick={() => {
                if (!disabled) {
                  unStakeToken();
                }
              }}
              className={`flex flex-grow items-center justify-center bg-primaryGreen text-black mt-6 rounded-xl h-12 text-base paceGrotesk-Bold focus:outline-none ${
                disabled || unStakeLoading
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <ButtonTextWrapper
                loading={unStakeLoading}
                Text={() => <>Unstake</>}
              />
            </div>
            {/* delay tip */}
            <div className="flex items-start gap-2 mt-4">
              <TipIcon className="flex-shrink-0 transform translate-y-1" />
              <p className="text-sm text-primaryGreen">
                {selectedTab === "meme"
                  ? `  Your vote for this period is valid and the unstaked assets will
                available to be withdrawn in ${formatSeconds(
                  delay_withdraw_sec
                )}.`
                  : "Users can withdraw the staked xREF from the 1st to the 5th."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default React.memo(UnStakeModal);
