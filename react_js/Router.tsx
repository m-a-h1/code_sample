import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { createBrowserHistory } from "history";
import decode from "jwt-decode";
// import { AppContext } from './providers/AppProvider';

//-- theme
import "./theme/fonts/icon/style.less";
import "./theme/main/app.less";

//-- layouts
import MainLayout from "./layout/main/mainLayout";
import AuthLayout from "./layout/auth/authLayout";

//-- Screens list.
import DashboardScreen from "./screen/dashboard/DashboardScreen";
import BranchListScreen from "./screen/branchList/BranchListScreen";
import AccessDenied from "./screen/accessDenied/AccessDeniedScreen";
import NotFound from "./screen/notFound/notFoundScreen";

import LoginScreen from "./screen/auth/login";
import MessageTransactionListScreen from "./screen/transaction/messageList";
import SadadTransactionListScreen from "./screen/transaction/sadadList";

// custom route ----------------
import CustomRoute from "./CustomRoute";

//-- Router
function AppRouter() {
  const customHistory = createBrowserHistory();

  // --- if user is login
  const token = window.localStorage.getItem("isLogin");

  // get user data
  let userData: any = window.localStorage.getItem("loginData");
  if (userData) {
    userData = decode(userData);
  }

  if (token) {
    return (
      <Router history={customHistory}>
        <MainLayout>
          <Switch>
            <Route role={userData.access} exact path="/" component={DashboardScreen} />
            <CustomRoute access={[1]} role={userData.access} exact path="/branchList" component={BranchListScreen} />
            <Route exact path="accessDenied" component={AccessDenied} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      </Router>
    );
  } // if not login
  else {
    return (
      <AuthLayout>
        <Router>
          <Switch>
            <Route exact path="/" component={LoginScreen} />
          </Switch>
        </Router>
      </AuthLayout>
    );
  }
}

export default AppRouter;
