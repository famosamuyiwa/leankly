import { Toast } from "@/components/animation-toast/components";
import Loader from "@/components/Loader";
import { ToastProps } from "@/interfaces";
import React, { ReactNode, createContext, useContext, useRef } from "react";

interface GlobalContextType {
  displayToast: (toast: ToastProps) => void;
  showLoader: (label?: string) => void;
  hideLoader: () => void;
  alertComingSoon: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const toastRef = useRef<any>({});
  const loaderRef = useRef<any>({});

  const displayToast = (toast: ToastProps) => {
    toastRef.current.show({
      type: toast.type,
      description: toast.description,
    });
  };

  const showLoader = (label?: string) => {
    loaderRef.current.show(label);
  };

  const hideLoader = () => {
    loaderRef.current.hide();
  };

  const alertComingSoon = () => {
    alert("This feature is not yet available. Coming Soon 🚀");
  };

  return (
    <GlobalContext.Provider
      value={{
        displayToast,
        showLoader,
        hideLoader,
        alertComingSoon,
      }}
    >
      {children}
      <Loader ref={loaderRef} />
      <Toast ref={toastRef} />
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

export default GlobalProvider;
