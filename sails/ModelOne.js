/* eslint-disable no-unused-expressions */
module.exports = {
  primaryKey: "id",
  tableName: "someTag",
  attributes: {
    name: {
      type: "string",
      required: true,
    },
    phone: {
      type: "string",
      required: true,
      unique: true,
    },
    pass: {
      type: "string",
      required: true,
    },
    city: {
      type: "number",
    },
    is_active: {
      type: "boolean",
      defaultsTo: true,
    },
    token: {
      type: "string",
      required: true,
    },
  },

  /**
   *
   * @param {Object} data `
   *  name: Joi.string(),
      family: Joi.string(),
      phone: Joi.string(),
      password: Joi.string(),
      city: Joi.number(),
      isActive: Joi.boolean(),
      canBuildHead: joi.boolean(),
      parentID: number,
      isHead: boolean
   */
  create: async (data) => {
    try {
      // validate phone an converted to standard format
      const standardPhone = sails.helpers.phoneValidation(data.phone);
      if (standardPhone.error) throw new Error(standardPhone.error);

      // hash password
      const hashedPassword = await sails.helpers.hashPassword(data.password);

      const createResult = await SuperAdmin.getDatastore().sendNativeQuery(
        "insert into model_one (name, family, phone, pass, city, is_active, is_head, parent_id, can_build_head) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          data.name,
          data.family,
          standardPhone,
          hashedPassword,
          data.city,
          data.isActive,
          data.isHead,
          data.parentID,
          data.canBuildHead,
        ]
      );

      if (createResult.rowCount === 0)
        throw new Error("problem in creating");

      return true;
    } catch (e) {
      logger.error(`modelOne.create -> ${e}`);
      return false;
    }
  },

  /**
   *
   * @param {String} phone
   * @param {Object} data | {name?, pass?}
   * @returns {Boolean}
   */
  update: async (id, data) => {
    try {
      let i = 1;
      let query = "";
      const skips = [];
      if (data.name) {
        query += `name=$${i++} ,`;
        skips.push(data.name);
      }
      if (data.family) {
        query += `family=$${i++} ,`;
        skips.push(data.family);
      }

      if (query[query.length - 1] === ",") query = query.slice(0, -1);

      skips.push(id);
      const updated = await ModelOne.getDatastore().sendNativeQuery(
        `update model_one set ${query} where id = $${i}`,
        skips
      );
      if (updated.rowCount === 0)
        throw new Error("problem in updating");

      return true;
    } catch (e) {
      logger.error(`ModelOne.update -> ${e}`);
      return false;
    }
  },

  /**
   * change modelOne password
   * @param {Number} id | modelOne id
   * @param {String} password | new Password
   * @returns {boolean}
   */
  changePassword: async (id, password) => {
    try {
      // hash password
      const hashedPassword = await sails.helpers.hashPassword(password);

      const result = await AdminUser.getDatastore().sendNativeQuery(
        "UPDATE model_one  SET pass= $1  WHERE id=$2 ",
        [hashedPassword, id]
      );

      if (result.rowCount === 0) throw new Error("error");

      return true;
    } catch (e) {
      logger.error(`ModelOne.changePassword -> ${e}`);
      return false;
    }
  },

  switchActive: async (id, status, parentID) => {
    try {
      // if parentID exists
      let query = "";
      const skips = [];
      if (parentID) {
        query = "and parent_id = $3";
        skips.push(parentID);
      }
      // update query
      const updateResult = await ModelOne.getDatastore().sendNativeQuery(
        `update model_one set is_active = $1 where id = $2 ${query}`,
        [status, id].concat(skips)
      );

      if (updateResult.rowCount === 0)
        throw new Error("problem in updating");
      return true;
    } catch (e) {
      logger.error(`ModelOne.switchActive -> ${e}`);
      return false;
    }
  },

  /**
   * search on ModelOne
   * @param {Object} filters
   * {
   * id: Joi.number().min(1),
      name: Joi.string(),
      family: Joi.string(),
      phone: Joi.string(),
      city: Joi.number(),
      isActive: Joi.boolean(),
      isHead: Joi.boolean(),
      parentID: Joi.number().min(0),
      skip: Joi.number().integer().min(0),
      limit: Joi.number()
   * }
   */
  search: async (filters) => {
    try {
      let i = 1;
      let query = "";
      const skips = [];
      
      for(const [key, value] of Object.entries(filtres)){
        if(key !== 'skip && key !== limit){
              query += `and ${key} = $${i++} `;
              skips.push(value);
           }
      }

      if (query.indexOf("and") === 0) query = query.slice(3);
      if (query !== "") query = `where ${query}`;

      skips.push(filters.limit || 10, filters.skip || 0);

      const searchResult = await ModelOne.getDatastore().sendNativeQuery(
        `select ${
          filters.skip ? "" : "COUNT(*) OVER() AS full_count,"
        } id, name, family, phone, city, is_active, is_head, parent_id, can_build_head from model_one ${query} order by id desc limit $${i++} offset $${i}`,
        skips
      );

      const modelOnes = searchResult.rows;

      return modelOnes;
    } catch (e) {
      logger.error(`ModelOne.getAll -> ${e}`);
      return false;
    }
  },

  /**
   * it get incoming money and shop and divide profit to each modelOne ecording their percentage
   * @param {Number} amount
   * @param {Number} shopID
   * @returns
   */
  divideProfit: async (amount, shopID) => {
    try {
      // --1) get first modelOne (head)
      let allPlans = await ModelOne.getDatastore().sendNativeQuery(
        "select plan.*, model_one.parent_id  from (select model_one_sp.model_one_id , plan.percentage from model_one_shop_plan model_one_sp join model_one_plan plan on plan.id = model_one_sp.plan_id where model_one_sp.shop_id = $1) plan join model_one on plan.model_one_id = model_one.id",
        [shopID]
      );
      if (allPlans.rowCount === 0)
        throw new Error("could not find any plan for this shop");
      allPlans = allPlans.rows;

      // --3) sort plans in order
      const sortedPlans = sortModelOnes(0, allPlans, []);

      // --2) start going down and dividing profit
      const promises = divideProfit(amount, sortedPlans, 0, []);
      await Promise.all(promises);

      return true;
    } catch (e) {
      logger.error(`modelOne.divideProfit -> ${e}`);
      return false;
    }
  },


 

  /**
   * modelOne main page info
   * @param {Number} modelOneID
   * @param {Number} startDate
   * @param {Number} endDate
   * @returns
   */
  getMainPageData: async (modelOneID, startDate, endDate) => {
    try {
      const output = {};

      const result = await Promise.all([
        // get modelOne balance
        ModelOne.getDatastore().sendNativeQuery(
          `select balance from model_one where id=$1`,
          [modelOneID]
        ),
        // get modelOne total shop count
        ModelOne.getShopCount(
          modelOneID,
          undefined,
          startDate,
          endDate
        ),
        // get modelOne active shop count
        ModelOne.getShopCount(modelOneID, 2, startDate, endDate),
        // get modelOne unactive shop count
        ModelOne.getShopCount(modelOneID, 1, startDate, endDate),
        // get modelOne pending shop count
        ModelOne.getShopCount(modelOneID, 3, startDate, endDate),
      ]);

      output.totalBenefit = result[0].rows[0].balance;
      output.shopCount = result[1];
      output.activeShopCount = result[2];
      output.unactiveShopCount = result[3];
      output.pendingShopCount = result[4];

      return output;
    } catch (e) {
      logger.error(
        `modelOne.getMainPageData. id: ${modelOneID} -> ${e}`
      );
      return false;
    }
  },

  /**
   * it gather all the modelOnes of an head
   * @param {Number} headID  | id of the head
   * @returns
   */
  __getModelOnes: async (headID) => {
    try {
      const heads = [];
      let IDs = [headID];
      let modelOnes = await ModelOne.getDatastore().sendNativeQuery(
        `select id, is_head from model_one where parent_id = $1`,
        [headID]
      );
      modelOnes = modelOnes.rows;
      await Promise.all(
        modelOnes.map(
          (modelOne, i) =>
            new Promise(async (resolve) => {
              if (modelOne.is_head) {
                heads.push(modelOne.id);
                const otherIDs = await ModelOne.__getModelOnes(modelOne.id);
                if (otherIDs) IDs = IDs.concat(otherIDs);
                return resolve();
              }
              IDs.push(modelOne.id);
              return resolve();
            })
        )
      );

      return IDs;
    } catch (e) {
      logger.error(`ModelOneController.__getModelOnes -> ${e}`);
      return false;
    }
  },
};

const divideProfit = (amount, plan, index, updateArray) => {
  try {
    let divideShare;
    if (plan.length > index) {
      divideShare = (amount / 100) * plan[index].percentage;
    } else divideShare = 0;

    const modelOneShare = amount - divideShare;
    const modelOneID = index === 0 ? 0 : plan[index - 1].modelOne_id;

    updateArray.push(
      ModelOne.getDatastore().sendNativeQuery(
        "update model_one set balance = balance + $1 where id = $2",
        [modelOneShare, modelOneID]
      )
    );

    if (plan.length <= index) return updateArray;
    return divideProfit(divideShare, plan, index + 1, updateArray);
  } catch (e) {
    logger.error(`function divideprofit in modelOne -> ${e}`);
    return false;
  }
};

const sortModelOnes = (parent, plans, sortedPlans) => {
  for (let i = 0; i < plans.length; i++) {
    if (plans[i].parent_id === parent) {
      sortedPlans.push(plans[i]);
      return sortModelOnes(plans[i].modelOne_id, plans, sortedPlans);
    }
  }
  return sortedPlans;
};

const gatherModelOnesPlan = async (modelOneID, planNumber) => {
  try {
    const finalData = [];
    let result = await ModelOne.getDatastore().sendNativeQuery(
      'select modelOne.id "modelOneID",modelOne.parent_id, plan.id "planID" from model_one left JOIN model_one_plan  plan ON model_one.id = plan.model_one_id where model_one.id = $1 and ( plan.number= $2 or plan."number" is null)',
      [modelOneID, planNumber]
    );
    if (result.rowCount === 0) return false;
    result = result.rows[0];
    finalData.push(result);
    if (result.modelOneID === 0) return finalData;
    const returnedData = await gatherModelOnePlan(
      result.parent_id,
      planNumber
    );
    if (!returnedData) return false;

    return finalData.concat(returnedData);
  } catch (e) {
    logger.error(`ModelOne gathreModelOnesPlan -> ${e}`);
    return false;
  }
};
