import React, { useState } from "react";
import _ from "lodash";
import { CheckInButtonIcon } from "./icons2";
import CheckInModal from "./CheckInModal";
import CheckInSuccessModal from "./CheckInSuccessModal";

const CheckInButtonPC = () => {
  const [isOpen, setIsOpen] = useState(false);
  function showCheckInModal() {
    setIsOpen(true);
  }
  function closeCheckInModal() {
    setIsOpen(false);
  }
  return (
    <>
      <div
        className="flex justify-center items-center relative cursor-pointer"
        style={{ height: "56px" }}
        onClick={showCheckInModal}
      >
        <CheckInButtonIcon />
      </div>
      <CheckInModal isOpen={isOpen} onRequestClose={closeCheckInModal} />
      <CheckInSuccessModal />
    </>
  );
};

export default React.memo(CheckInButtonPC);
