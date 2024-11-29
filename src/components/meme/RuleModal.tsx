import React from "react";
import Modal from "react-modal";
import { isMobile } from "../../utils/device";
import { ModalCloseIcon } from "./icons";
function RuleModal(props: any) {
  const { isOpen, onRequestClose } = props;
  const cardWidth = isMobile() ? "95vw" : "35vw";
  const cardHeight = isMobile() ? "60vh" : "55vh";
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{
        overlay: {
          overflow: "auto",
        },
        content: {
          outline: "none",
          transform: isMobile()
            ? "translate(-50%, -10%)"
            : "translate(-50%, -50%)",
        },
      }}
    >
      <div
        className="py-5 pl-5 pr-2 text-base text-gray-60 rounded-2xl"
        style={{
          width: cardWidth,
          background: "#1B242C",
        }}
      >
        <div className="flex items-center justify-between pr-3">
          <div className="text-white text-base paceGrotesk-Bold">
            Meme Competition Rules
          </div>
          <ModalCloseIcon className="cursor-pointer" onClick={onRequestClose} />
        </div>
        <div
          className="overflow-auto pr-3"
          style={{
            height: cardHeight,
          }}
        >
          <p className="mt-5">Eligibility Criteria for MEME Token Voting</p>
          <ul className="text-sm list-disc p-3">
            <li>
              To qualify for the next meme season, the token must have a minimum
              market cap of 500K USD.
            </li>
            <li>
              The token must have at least 1K followers on X (formerly Twitter)
              and an active Telegram community by the end of November.
            </li>
            <li>
              The token must have an active community with members engaging in
              conversations about the token across the market.
            </li>
            <li>
              The token must gather at least 100 votes to be eligible for the
              meme season.
            </li>
            <li>
              If a token ranks in the top 5 of the voting but fails to secure
              100 votes, it will be disqualified, and the 6th ranked token will
              take its place.
            </li>
          </ul>
          <p className="mt-5">
            For MEME Community - to be eligible to vote with xREF
          </p>
          <ul className="text-sm list-disc p-3">
            <li>
              To vote, users must stake a minimum of 30 $xREF, which will be
              locked for the duration of MEME Season 8. After MEME Season 8
              concludes, users will have a 5-day window to unstake their $xREF,
              starting the day after the season ends. During this period, $xREF
              can be withdrawn without any cooldown period.
            </li>
            <li>
              The community can vote using $xREF based on the amount they have
              staked.
            </li>
            <li>
              If a user does not withdraw their $xREF during the 5-day
              un-staking period, the staked $xREF will remain locked for the
              next MEME Season For MEME Community - to be eligible to vote with
              MEME.
            </li>
            <li>
              Stake their meme and vote with meme with no strict requirement.
            </li>
            <li>
              MEME can be withdraw and stake directly without any delay or cool
              down at all.
            </li>
          </ul>
        </div>
        <div className="flex items-center justify-center">
          <span
            onClick={onRequestClose}
            className="flex items-center justify-center mt-6 h-8 text-sm text-white cursor-pointer px-8 border border-gray-10 rounded-lg paceGrotesk-Bold"
          >
            Got it
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default React.memo(RuleModal);
