import React, { Reducer, useContext, useEffect, useMemo, useReducer } from "react";
import { message, Table, Tooltip, Typography } from "antd";
import { API_FETCH, FetchResponse } from "../../services/FetchService";
import { useTranslation } from "react-i18next";
import ResultCounterBox from "../../components/resultCounterBox/ResultCounterBox";
import Title from "../../components/Title";
import { FormOutlined } from "@ant-design/icons";
import { useHistory } from "react-router";
import { AppContext } from "../../providers/AppProvider";
import { phoneFormatter } from "../../functions";

const { Paragraph } = Typography;

interface state {
  data: Array<branch>;
  loading: boolean;
}

interface rowBranch {
  id: number;
  name: string;
  responsible: string;
  responsible_mob: string;
  state: string;
  city: string;
  adr: string;
}

interface branch {
  key: number;
  index: number;
  id: number;
  name: string;
  manager: string;
  managerPhone: string;
  state: string;
  city: string;
  address: string;
}

const fixData = (data: Array<rowBranch>): Array<branch> => {
  const fixedData: Array<branch> = data.map((branch: rowBranch, i: number) => ({
    key: i,
    index: i,
    id: branch.id,
    name: branch.name,
    manager: branch.responsible,
    managerPhone: phoneFormatter(branch.responsible_mob, "string"),
    state: branch.state,
    city: branch.city,
    address: branch.adr,
  }));
  return fixedData;
};

const initialState: state = {
  data: [],
  loading: true,
};

type Action = { payload: any };

const reducer: Reducer<state, Action> = (state: state, action: Action): state => {
  const { payload } = action;
  return { ...state, ...payload };
};

const getColumns = (t, history, data) => {
  return [
    {
      title: t("branchList.name"),
      dataIndex: "name",
      align: "center",
    },
    {
      title: t("branchList.manager"),
      dataIndex: "manager",
      align: "center",
    },
    {
      title: t("branchList.managerPhone"),
      dataIndex: "managerPhone",
      align: "center",
    },
    {
      title: t("branchList.state"),
      dataIndex: "state",
      align: "center",
    },
    {
      title: t("branchList.city"),
      dataIndex: "city",
      align: "center",
    },
    {
      title: t("branchList.address"),
      dataIndex: "address",
      align: "center",
      width: "15%",
      render: (address) => {
        return (
          <Tooltip title={address} overlayStyle={{ fontSize: "12px" }}>
            <Paragraph ellipsis className={`${!address ? "lowOpacityText" : ""}`}>
              {address || t("rateList.none")}
            </Paragraph>
          </Tooltip>
        );
      },
    },
    {
      dataIndex: "index",
      align: "center",
      render: (index) => (
        <div>
          <Tooltip title={t("common.edit")}>
            <FormOutlined className="icon" onClick={() => history.push(`/editBranch/${data[index].id}`)} />
          </Tooltip>
        </div>
      ),
    },
  ];
};

const BranchList = () => {
  const { t } = useTranslation("common");
  const history = useHistory();

  const {
    state: { language },
  } = useContext(AppContext);

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getBranchesApi()
      .then((result: FetchResponse) => {
        if (result.status === 200 && result.data.status) {
          const fixedData: Array<branch> = fixData(result.data.data);
          dispatch({ payload: { data: fixedData, loading: false } });
        } else message.error(t("common.errorFetchingData"));
      })
      .catch((e) => {
        console.log(e);
        message.error(t("common.errorFetchingData"));
      });
  }, []);

  const columns = useMemo(() => getColumns(t, history, state.data), [language]);

  return (
    <Table
      className="branchList"
      title={() => <Title text={t("branchList.title")} />}
      footer={() => <ResultCounterBox count={state.data.length} />}
      loading={state.loading}
      dataSource={state.data}
      columns={columns}
      scroll={{ x: 1000, y: 1000 }}
      size="small"
    />
  );
};

const getBranchesApi = (): Promise<any> => API_FETCH.get("shop/getBranches");

export default BranchList;
