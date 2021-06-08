import React from "react";

import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

//-- Router
import AppRouter from "./Router";

//-- providers
import AppProvider from "./providers/AppProvider";

//-- I18,translation config
import common_fa from "./translations/fa/common.json";
import common_en from "./translations/en/common.json";
i18next.init({
  interpolation: { escapeValue: false }, // React already does escaping
  lng: "fa", // language to use
  resources: {
    en: { common: common_en }, // 'common' is our custom namespace},
    fa: { common: common_fa },
  },
});

//-- App
function App() {
  // const {
  //   state: { language, direction },
  // } = useContext(AppContext);

  //-- check if is login

  return (
    <AppProvider>
      <I18nextProvider i18n={i18next}>
        <AppRouter />
      </I18nextProvider>
    </AppProvider>
  );
}

export default App;
