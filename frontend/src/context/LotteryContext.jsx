import { createContext, useContext, useState } from "react";

/**
 * LotteryContext — global lottery type state ("lao" | "thai")
 * Wrap <App> with <LotteryProvider> so all tabs can read/write lotteryType.
 */
const LotteryContext = createContext({
  lotteryType: "lao",
  setLotteryType: () => {},
});

export function LotteryProvider({ children }) {
  const [lotteryType, setLotteryType] = useState("lao");
  return (
    <LotteryContext.Provider value={{ lotteryType, setLotteryType }}>
      {children}
    </LotteryContext.Provider>
  );
}

/** Convenience hook for using the LotteryContext */
export function useLottery() {
  return useContext(LotteryContext);
}

export default LotteryContext;
