import React, { useEffect, useState } from "react";
import { Redirect, Route } from "react-router-dom";

const CustomRoute = (props) => {
  const [returnedRoute, setReturnedRoute] = useState();
  useEffect(() => {
    if (props.access.includes(props.role)) {
      return setReturnedRoute(<Route {...props} />);
    } else if (props.path === "/" || props.path === "/home") {
      return setReturnedRoute(<Redirect to="/factor" />);
    } else setReturnedRoute(<Redirect to="/accessDenied" />);
  }, [props]);

  return <>{returnedRoute}</>;
};

export default CustomRoute;
